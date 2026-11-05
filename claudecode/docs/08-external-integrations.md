# 08. 外部集成与通信通道深度分析

## 目录

1. [概述](#概述)
2. [Channel 系统架构](#channel-系统架构)
3. [MCP Channel 协议规范](#mcp-channel-协议规范)
4. [Channel 权限中继协议](#channel-权限中继协议)
5. [Channel 门控 (Gating) 系统](#channel-门控系统)
6. [Channel 白名单管理](#channel-白名单管理)
7. [MCP Server 端实现](#mcp-server-端实现)
8. [Direct Connect 远程会话](#direct-connect-远程会话)
9. [Bridge 系统与外部通信](#bridge-系统与外部通信)
10. [VSCode SDK MCP 集成](#vscode-sdk-mcp-集成)
11. [MCP 官方注册表集成](#mcp-官方注册表集成)
12. [Plugin 系统与外部扩展](#plugin-系统与外部扩展)
13. [通知与唤醒机制](#通知与唤醒机制)
14. [安全模型分析](#安全模型分析)
15. [亮点发现](#亮点发现)

---

## 概述

上游工具的外部集成不是通过单一通道实现的 (如 Telegram bot), 而是通过
MCP 协议抽象层实现了一个通用的 "Channel" 系统。任何实现了特定 MCP 能力的
服务器都可以成为外部通信通道 -- 无论它连接的是 Telegram、Discord、Slack、
iMessage 还是其他平台。

**核心设计原则:** "Channel 就是一个声明了 `claude/channel` 能力的 MCP 服务器。"

**核心源文件清单:**

| 文件 | 路径 | 行数(约) | 职责 |
|------|------|----------|------|
| channelNotification.ts | services/mcp/ | ~317 | Channel 消息入站 |
| channelPermissions.ts | services/mcp/ | ~241 | 权限中继 |
| channelAllowlist.ts | services/mcp/ | ~77 | 白名单管理 |
| directConnectManager.ts | server/ | ~200+ | 远程会话 |
| vscodeSdkMcp.ts | services/mcp/ | ~100+ | VSCode 集成 |
| officialRegistry.ts | services/mcp/ | ~60 | 官方注册表 |
| SdkControlTransport.ts | services/mcp/ | ~100+ | SDK 传输桥 |
| InProcessTransport.ts | services/mcp/ | ~64 | 进程内传输 |

---

## Channel 系统架构

### 2.1 总体架构

```
+======================================================================+
|                     外部通信平台                                       |
|                                                                        |
|  +----------+  +----------+  +----------+  +----------+               |
|  | Telegram |  | Discord  |  |  Slack   |  | iMessage |               |
|  | Bot      |  | Bot      |  | Bot      |  | Handler  |               |
|  +----+-----+  +----+-----+  +----+-----+  +----+-----+               |
|       |              |              |              |                    |
+-------|--------------|--------------|--------------|-------------------+
        |              |              |              |
+-------|--------------|--------------|--------------|-------------------+
|       v              v              v              v                    |
|  +----------------------------------------------------------+         |
|  |              MCP Channel Server(s)                         |         |
|  |                                                            |         |
|  |  能力声明:                                                  |         |
|  |    experimental['claude/channel']: {}                      |         |
|  |    experimental['claude/channel/permission']: {} (可选)    |         |
|  |                                                            |         |
|  |  入站: notifications/claude/channel                        |         |
|  |        { content: string, meta: { chat_id, user, ... } }  |         |
|  |                                                            |         |
|  |  出站: MCP 工具 (e.g., send_message, send_reply)          |         |
|  |                                                            |         |
|  |  权限: notifications/claude/channel/permission             |         |
|  |        { request_id: string, behavior: 'allow'|'deny' }   |         |
|  +-----+----------------------------------------------------+         |
|        |                                                               |
|  +-----v----------------------------------------------------+         |
|  |              该命令行工具CLI Process                       |         |
|  |                                                            |         |
|  |  gateChannelServer() -- 6 层门控                           |         |
|  |       |                                                    |         |
|  |       v                                                    |         |
|  |  注册通知处理器                                             |         |
|  |       |                                                    |         |
|  |  wrapChannelMessage()                                      |         |
|  |  -> <channel source="telegram" chat_id="123">msg</channel>|         |
|  |       |                                                    |         |
|  |  加入消息队列 -> SleepTool 轮询唤醒 (1s 内)               |         |
|  |       |                                                    |         |
|  |  模型处理 -> 决定回复方式                                   |         |
|  |    - Channel MCP 工具 (回复到平台)                         |         |
|  |    - SendUserMessage (回复到终端)                           |         |
|  |    - 两者兼用                                               |         |
|  +------------------------------------------------------------+         |
|                                                                        |
|                    该命令行工具CLI Process                              |
+========================================================================+
```

### 2.2 Feature Flag 控制

Channel 系统受多重 feature flag 控制:

**编译时:** `feature('KAIROS')` 或 `feature('KAIROS_CHANNELS')`
**运行时:** GrowthBook `internal_harbor` (总开关)

**文件引用:** `src/services/mcp/channelNotification.ts:13`
```
feature('KAIROS') || feature('KAIROS_CHANNELS'). Runtime gate internal_harbor.
```

---

## MCP Channel 协议规范

### 3.1 能力声明

Channel 服务器通过 MCP 的 `capabilities.experimental` 声明自己的能力:

**文件引用:** `src/services/mcp/channelNotification.ts:196-206`
```
能力键                                 含义
experimental['claude/channel']         基础 channel 能力 (入站消息)
experimental['claude/channel/permission']  权限中继能力 (可选)
```

两个能力的关系:
- 仅声明 `claude/channel`: 可以推送入站消息, 但不能中继权限审批
- 同时声明两者: 可以推送消息 + 中继权限审批

### 3.2 入站消息 Schema

**文件引用:** `src/services/mcp/channelNotification.ts:37-47`
```typescript
export const ChannelMessageNotificationSchema = lazySchema(() =>
  z.object({
    method: z.literal('notifications/claude/channel'),
    params: z.object({
      content: z.string(),
      // 不透明的元数据: thread_id, user, chat_id 等
      meta: z.record(z.string(), z.string()).optional(),
    }),
  }),
)
```

### 3.3 消息包装

**文件引用:** `src/services/mcp/channelNotification.ts:104-116`
```typescript
const SAFE_META_KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/

export function wrapChannelMessage(
  serverName: string,
  content: string,
  meta?: Record<string, string>,
): string {
  const attrs = Object.entries(meta ?? {})
    .filter(([k]) => SAFE_META_KEY.test(k))
    .map(([k, v]) => ` ${k}="${escapeXmlAttr(v)}"`)
    .join('')
  return `<channel source="${escapeXmlAttr(serverName)}"${attrs}>\n${content}\n</channel>`
}
```

安全设计:
- Meta key 仅接受标识符格式 (`[a-zA-Z_][a-zA-Z0-9_]*`)
- 防止属性注入攻击 (如 `x="" injected="y`)
- 值使用 `escapeXmlAttr` 转义

### 3.4 出站消息

Channel 的出站消息通过标准 MCP 工具调用实现, 例如:
- `send_message` -- 发送消息到平台
- `send_reply` -- 回复特定线程

这些工具由 Channel MCP 服务器定义, 上游工具不规定具体名称。

---

## Channel 权限中继协议

### 4.1 协议概述

当 上游工具需要用户批准一个工具操作时, 如果存在支持权限中继的 Channel,
权限请求会同时发送到 Channel (如用户的手机)。

```
权限中继完整流程:

  该命令行工具触发权限对话框
       |
       +---- 本地 UI 显示对话框 ---------+
       |                                   |
       +---- Bridge 权限回调 -------------+--- 竞速: 第一个响应者获胜
       |                                   |
       +---- Channel 权限中继 -----------+
       |         |
       |    生成 shortRequestId
       |    (5 字母, FNV-1a hash)
       |         |
       |    发送请求到 Channel 服务器:
       |    notifications/claude/channel/permission_request
       |    {
       |      request_id: "tbxkq",
       |      tool_name: "FileWrite",
       |      description: "Write to config.json",
       |      input_preview: '{"file_path":"/...' (200字截断)
       |    }
       |         |
       |    Channel 服务器格式化并发送到平台
       |    (Telegram markdown / iMessage rich text / Discord embed)
       |         |
       |    人类回复: "yes tbxkq" 或 "no tbxkq"
       |         |
       |    服务器解析回复:
       |    /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i
       |         |
       |    服务器发出结构化事件:
       |    notifications/claude/channel/permission
       |    { request_id: "tbxkq", behavior: "allow" }
       |         |
       v    该命令行工具匹配 pending map
       |
  第一个响应者获胜 (claim 语义)
```

### 4.2 shortRequestId 生成

**文件引用:** `src/services/mcp/channelPermissions.ts:112-152`

```
ID 生成算法:

  输入: toolUseID (如 "toolu_AbC123...")
       |
  FNV-1a 哈希 -> uint32
       |
  Base-25 编码 (字母表: a-z 去除 'l')
       |
  5 字母输出 (25^5 = 9,765,625 空间)
       |
  脏话过滤:
    110 个黑名单子串 (3-5 字母)
    匹配时: 用 "${toolUseID}:${salt}" 重新哈希
    最多 10 次重试 (碰撞概率 ~1/700)
       |
  输出: 如 "tbxkq"
```

为什么不用数字:
- 手机用户需要在字母和数字键盘间切换
- 纯字母避免了模式切换 (Kenneth 团队讨论)

为什么去掉 'l':
- 在很多字体中 'l' 与 '1'/'I' 难以区分

### 4.3 权限回调工厂

**文件引用:** `src/services/mcp/channelPermissions.ts:209-240`
```typescript
export function createChannelPermissionCallbacks(): ChannelPermissionCallbacks {
  const pending = new Map<string, (response) => void>()

  return {
    onResponse(requestId, handler) {
      const key = requestId.toLowerCase()
      pending.set(key, handler)
      return () => { pending.delete(key) }
    },

    resolve(requestId, behavior, fromServer) {
      const key = requestId.toLowerCase()
      const resolver = pending.get(key)
      if (!resolver) return false
      pending.delete(key)  // 先删除, 再调用 (防止重入)
      resolver({ behavior, fromServer })
      return true
    },
  }
}
```

设计原则:
- `pending` Map 不在模块级 (per CLAUDE.md), 不在 AppState (函数序列化问题)
- 与 `replBridgePermissionCallbacks` 相同的生命周期模式
- 先删除再调用 (防止 resolver 抛异常或重入时双重触发)
- 大小写不敏感 (手机自动纠正可能大写化)

### 4.4 filterPermissionRelayClients

**文件引用:** `src/services/mcp/channelPermissions.ts:177-194`

```
过滤条件 (全部必须满足):

  1. type === 'connected'         (连接状态)
  2. isInAllowlist(name)          (在会话 --channels 列表中)
  3. claude/channel 能力存在      (基础 channel 能力)
  4. claude/channel/permission 能力存在  (权限中继能力)

第 4 条是服务器的显式 opt-in:
  "relay-only channel never becomes a permission surface by accident"
  (Kenneth: "users may be unpleasantly surprised")
```

---

## Channel 门控系统

### 5.1 六层门控详解

**文件引用:** `src/services/mcp/channelNotification.ts:191-316`

```
gateChannelServer(serverName, capabilities, pluginSource)
       |
  Layer 1: capability
  服务器声明了 experimental['claude/channel'] ?
  -> 否: skip (kind: 'capability')
       |
  Layer 2: disabled
  运行时总开关 isChannelsEnabled() (internal_harbor) ?
  -> 否: skip (kind: 'disabled')
       |
  Layer 3: auth
  用户通过 OAuth 认证 (非 API Key) ?
  -> 否: skip (kind: 'auth', reason: "run /login")
       |
  Layer 4: policy
  如果是 Teams/Enterprise:
    org 管理员启用了 channelsEnabled ?
  -> 否: skip (kind: 'policy')
       |
  Layer 5: session
  服务器在 --channels 列表中 ?
  -> 否: skip (kind: 'session')
       |
  Layer 6: allowlist
  如果是 plugin 类型:
    marketplace 验证 (tag 匹配实际安装源)
    -> 不匹配: skip (kind: 'marketplace')
    白名单检查 (plugin@marketplace 在批准列表中)
    -> 不在: skip (kind: 'allowlist')
  如果是 server 类型:
    -> 无 dev flag: skip (kind: 'allowlist')
       |
  全部通过: { action: 'register' }
```

### 5.2 --channels 入口解析

**文件引用:** `src/services/mcp/channelNotification.ts:161-173`

```typescript
export function findChannelEntry(
  serverName: string,
  channels: readonly ChannelEntry[],
): ChannelEntry | undefined {
  const parts = serverName.split(':')
  return channels.find(c =>
    c.kind === 'server'
      ? serverName === c.name           // server:name 精确匹配
      : parts[0] === 'plugin' && parts[1] === c.name  // plugin:X:Y 第二段匹配
  )
}
```

`--channels` 参数支持两种格式:
- `server:name` -- 直接匹配 MCP 服务器名称
- `plugin:name@marketplace` -- 匹配插件提供的服务器

### 5.3 组织级白名单覆盖

**文件引用:** `src/services/mcp/channelNotification.ts:127-138`

```typescript
export function getEffectiveChannelAllowlist(
  sub: ReturnType<typeof getSubscriptionType>,
  orgList: ChannelAllowlistEntry[] | undefined,
): { entries: ChannelAllowlistEntry[], source: 'org' | 'ledger' } {
  if ((sub === 'team' || sub === 'enterprise') && orgList) {
    return { entries: orgList, source: 'org' }  // 组织列表替换 GrowthBook
  }
  return { entries: getChannelAllowlist(), source: 'ledger' }  // 默认 GrowthBook
}
```

Teams/Enterprise 组织可以通过 managed settings 的 `allowedChannelPlugins`
完全替换 GrowthBook ledger, 管理员拥有最终信任决策权。

---

## Channel 白名单管理

### 6.1 GrowthBook 白名单

**文件引用:** `src/services/mcp/channelAllowlist.ts:28-53`

```typescript
const ChannelAllowlistSchema = lazySchema(() =>
  z.array(z.object({
    marketplace: z.string(),
    plugin: z.string(),
  })),
)

export function getChannelAllowlist(): ChannelAllowlistEntry[] {
  const raw = getFeatureValue_CACHED_MAY_BE_STALE<unknown>(
    'internal_harbor_ledger', [],
  )
  return ChannelAllowlistSchema().safeParse(raw).success
    ? parsed.data : []
}
```

### 6.2 插件级粒度

白名单以 `{marketplace, plugin}` 为粒度, 不是每个 MCP 服务器:

```
设计理由:

  如果一个插件被批准, 其所有 channel 服务器都被批准。

  为什么不用 per-server 粒度?
  1. 一个产生恶意第二服务器的插件本身已被妥协
  2. per-server 条目会在无害的插件重构时中断
  3. 降低管理复杂度
```

### 6.3 开发模式旁路

`--dangerously-load-development-channels` 标志绕过白名单检查:
- 通过 `entry.dev` 标记
- 每个 entry 独立 (一个 dev entry 不影响其他 entry)
- 仅用于本地开发

---

## MCP Server 端实现

### 7.1 server/ 目录

**文件引用:** `src/server/` 目录

| 文件 | 职责 |
|------|------|
| `createDirectConnectSession.ts` | 创建直连会话 |
| `directConnectManager.ts` | 直连会话管理 |
| `types.ts` | 类型定义 |

### 7.2 DirectConnect 会话管理器

**文件引用:** `src/server/directConnectManager.ts:13-80`

```typescript
export type DirectConnectConfig = {
  serverUrl: string
  sessionId: string
  wsUrl: string
  authToken?: string
}

export type DirectConnectCallbacks = {
  onMessage: (message: SDKMessage) => void
  onPermissionRequest: (request, requestId) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

export class DirectConnectSessionManager {
  private ws: WebSocket | null = null

  connect(): void {
    this.ws = new WebSocket(this.config.wsUrl, {
      headers: { authorization: `Bearer ${this.config.authToken}` },
    })
    // 消息处理: JSON 解析 -> StdoutMessage 类型检查 -> 路由
  }
}
```

DirectConnect 使用 WebSocket 进行双向通信:
- 入站: SDK 消息、权限请求
- 出站: 用户输入、权限响应

### 7.3 消息路由

```
DirectConnect 消息路由:

  WebSocket 消息到达
       |
  JSON 解析 (逐行, 支持 NDJSON)
       |
  isStdoutMessage(raw) ?
  -> 否: 跳过
       |
  根据 type 路由:
    SDKMessage -> callbacks.onMessage
    SDKControlPermissionRequest -> callbacks.onPermissionRequest
```

---

## Direct Connect 远程会话

### 8.1 远程会话架构

```
远程会话架构:

  用户终端 (本地)
       |
  DirectConnectSessionManager
       |
  WebSocket (wss://)
       |
  远程 该命令行工具实例
       |
  实际执行环境 (CCR / Remote)
```

### 8.2 RemotePermissionResponse

远程会话支持权限请求的远程审批:

```typescript
// 从 RemoteSessionManager 导入
type RemotePermissionResponse = {
  // ... 权限响应数据
}
```

### 8.3 远程消息内容

```typescript
// 从 teleport/api 导入
type RemoteMessageContent = {
  // ... 远程消息内容
}
```

---

## Bridge 系统与外部通信

### 9.1 Bridge 架构概述

```
Bridge 系统架构:

  +-----------------------------------------------------------+
  |                    该命令行工具CLI                          |
  |                                                             |
  |  +------------------+    +------------------+               |
  |  | REPL Bridge      |    | Remote Bridge    |               |
  |  | (本地 SDK/IDE)   |    | (远程会话)       |               |
  |  +--------+---------+    +--------+---------+               |
  |           |                       |                         |
  |  +--------v-----------------------v---------+               |
  |  |          Bridge Messaging                 |               |
  |  |  - inboundMessages.ts                     |               |
  |  |  - inboundAttachments.ts                  |               |
  |  +------------------------------------------+               |
  |           |                                                 |
  |  +--------v---------+                                       |
  |  | Bridge Permission|                                       |
  |  | Callbacks        |  <--- 与 Channel Permission 竞速      |
  |  +------------------+                                       |
  +-----------------------------------------------------------+
```

### 9.2 Bridge 权限回调

**文件引用:** `src/bridge/bridgePermissionCallbacks.ts`

Bridge 权限回调与 Channel 权限回调采用相同的"第一个响应者获胜"模式:

```
权限响应竞速:

  权限请求触发
       |
  同时发送到:
    1. 本地 UI 对话框
    2. Bridge (SDK/IDE)
    3. Channel (Telegram/Discord/...)
    4. Hooks / Classifier
       |
  第一个响应者获胜 (claim() 语义)
```

### 9.3 Bridge 与 Channel 的比较

| 特性 | Bridge | Channel |
|------|--------|---------|
| 传输方式 | 进程间通信/WebSocket | MCP 通知 |
| 用途 | SDK/IDE 集成 | 外部消息平台 |
| 权限中继 | 支持 | 支持 (opt-in) |
| 认证 | JWT / OAuth | OAuth (claude.ai) |
| 门控 | 无 (系统内部) | 6 层门控 |
| 白名单 | 不需要 | GrowthBook / 组织 |

---

## VSCode SDK MCP 集成

### 10.1 VSCode MCP 通信

**文件引用:** `src/services/mcp/vscodeSdkMcp.ts:1-60`

```typescript
let vscodeMcpClient: ConnectedMCPServer | null = null

export function notifyVscodeFileUpdated(
  filePath: string,
  oldContent: string | null,
  newContent: string | null,
): void {
  if (process.env.USER_TYPE !== 'ant' || !vscodeMcpClient) return

  void vscodeMcpClient.client.notification({
    method: 'file_updated',
    params: { filePath, oldContent, newContent },
  })
}
```

当 上游工具编辑文件时, 通过 MCP 通知 VSCode 刷新编辑器内容。

### 10.2 日志事件转发

```typescript
export const LogEventNotificationSchema = lazySchema(() =>
  z.object({
    method: z.literal('log_event'),
    params: z.object({
      eventName: z.string(),
      eventData: z.object({}).passthrough(),
    }),
  }),
)
```

VSCode MCP 还支持接收日志事件通知。

### 10.3 自动模式状态同步

```typescript
type AutoModeEnabledState = 'enabled' | 'disabled' | 'opt-in'
function readAutoModeEnabledState(): AutoModeEnabledState | undefined {
  const v = getFeatureValue_CACHED_MAY_BE_STALE<{ enabled?: string }>(
    'internal_auto_mode_config', {},
  )?.enabled
  return v === 'enabled' || v === 'disabled' || v === 'opt-in' ? v : undefined
}
```

---

## MCP 官方注册表集成

### 11.1 注册表预取

**文件引用:** `src/services/mcp/officialRegistry.ts:33-60`

```
MCP 官方注册表:

  启动时异步预取:
  GET https://api.anthropic.com/mcp-registry/v0/servers
      ?version=latest&visibility=commercial

  响应结构:
  {
    servers: [
      {
        server: {
          remotes: [{ url: "https://example.com/mcp" }]
        }
      }
    ]
  }

  处理:
  1. 提取所有远程 URL
  2. 标准化 (去除查询字符串和末尾斜杠)
  3. 存入 Set<string> 供后续查询

  用途:
  - 识别用户配置的 MCP 服务器是否为官方认证
  - 可能用于 UI 提示或安全决策

  错误处理:
  - 5 秒超时
  - 失败时静默忽略 (不阻塞启动)
  - CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC 环境变量可完全禁用
```

---

## Plugin 系统与外部扩展

### 12.1 插件与 MCP 的关系

插件可以提供 MCP 服务器:

```
插件 MCP 服务器加载:

  配置加载 (config.ts)
       |
  getPluginMcpServers()
       |
  为每个插件的 MCP 服务器添加:
    scope: 'dynamic'
    pluginSource: 'slack@anthropic' (或其他标识)
       |
  标准连接流程 (connectToServer)
       |
  如果插件声明 claude/channel:
    进入 Channel 门控流程
    需要通过白名单验证
```

### 12.2 Plugin Source 验证

```
Marketplace 验证 (gateChannelServer 内部):

  用户声明: --channels plugin:slack@anthropic
                                    ^^^^^^^^^^^^
                                    期望的 marketplace

  实际安装: pluginSource = "slack@anthropic"
                 |
  parsePluginIdentifier(pluginSource).marketplace
                 |
  比较: actual === entry.marketplace ?
    是 -> 继续白名单检查
    否 -> skip (kind: 'marketplace',
           reason: "you asked for ... but the installed ... is from ...")
```

### 12.3 strictPluginOnlyCustomization

当企业策略启用 `strictPluginOnlyCustomization` 时:

```
MCP 服务器限制:

  用户自定义: 被阻止 (仅限插件提供)
  插件提供:   正常加载
  内置:       正常加载
  policySettings: 正常加载

  检查函数: isRestrictedToPluginOnly('mcp')
  信任源:   isSourceAdminTrusted(agentDefinition.source)
```

---

## 通知与唤醒机制

### 13.1 SleepTool 轮询唤醒

Channel 消息入站后通过消息队列传递, SleepTool 每隔约 1 秒检查:

```
唤醒流程:

  Channel 消息到达
       |
  notifications/claude/channel 处理器
       |
  wrapChannelMessage() -> <channel> XML
       |
  入队消息队列
       |
  SleepTool 轮询 hasCommandsInQueue()
       |-- 有消息 -> 立即唤醒, 处理消息
       |-- 无消息 -> 继续休眠 (最长 1 秒后再检查)
```

### 13.2 任务通知

代理完成后的通知:

```typescript
// 从 LocalAgentTask 导入
enqueueAgentNotification(...)

// 通知作为 user-role 消息注入到对话中
// 父代理在下一轮看到通知并决定如何处理
```

---

## 安全模型分析

### 14.1 威胁模型

**文件引用:** `src/services/mcp/channelPermissions.ts:17-23`

代码注释记录了 Kenneth 的安全审查意见:

```
Kenneth's question: "would this let Claude self-approve?"

答案: 审批方是人类 (通过 Channel), 不是 Claude。

但信任边界不是终端, 而是白名单 (internal_harbor_ledger)。
一个被妥协的 Channel 服务器可以伪造 "yes <id>" 而无需人类看到提示。

被接受的风险分析:
  - 被妥协的 Channel 已经拥有无限的对话注入轮次
  - 社会工程随时间推移, 等待 acceptEdits 等
  - inject-then-self-approve 更快, 但能力不更强
  - 对话框减慢被妥协的 Channel; 不能完全阻止

参考: PR discussion #2956440848
```

### 14.2 防护层次

```
安全防护层次:

  Layer 1: 白名单 (marketplace + plugin 匹配)
    -> 防止未授权插件成为 Channel
    -> 组织管理员可覆盖

  Layer 2: 双能力验证
    -> 服务器必须显式声明 permission 能力
    -> 防止 relay-only Channel 意外成为权限表面

  Layer 3: 结构化事件 (非文本匹配)
    -> 服务器解析用户回复后发出结构化事件
    -> 普通聊天文本不能意外触发权限批准
    -> CC 不做 regex 匹配, 只匹配 pending map

  Layer 4: Claim 语义
    -> 第一个响应者获胜
    -> 重复事件被忽略 (pending.delete 先于 resolver 调用)
    -> 防止竞态和重放

  Layer 5: 短 ID 安全
    -> FNV-1a hash (不可预测)
    -> 9.8M 空间 (birthday collision @50% 需要 ~3K 并发)
    -> 脏话过滤 (专业性保证)

  Layer 6: OAuth 强制
    -> API Key 用户被阻止
    -> 确保可追溯身份
```

### 14.3 XML 注入防护

**文件引用:** `src/services/mcp/channelNotification.ts:98-104`

```
Meta key 验证: /^[a-zA-Z_][a-zA-Z0-9_]*$/

目的: 防止 XML 属性结构注入
  恶意 key: 'x="" injected="y'
  -> 会产生: source="name" x="" injected="y"="value"
  -> 被拒绝 (不匹配正则)

实际使用的 key:
  chat_id, user, thread_ts, message_id
```

---

## 亮点发现

### 发现 1: Channel 即 MCP 服务器的抽象设计

上游工具没有为 Telegram、Discord 等平台编写特定代码。相反, 它定义了一个
基于 MCP 能力声明的通用 Channel 协议。任何 MCP 服务器只要声明
`experimental['claude/channel']` 能力并实现相应的通知方法, 就可以成为通信通道。
这种抽象使得:
- 添加新平台不需要修改 上游工具核心代码
- 平台特定的消息格式化在 MCP 服务器端处理
- 同一套门控/权限/白名单逻辑适用于所有平台

### 发现 2: 六层门控的防御深度

Channel 门控系统实现了 6 层检查, 门控顺序经过精心设计:
- capability 在最前面: 普通 MCP 服务器永远不会触及后续层
- disabled 在 auth 之前: 总开关可以不受会话状态影响
- auth 在 policy 之前: API key 用户被早期阻止
- session 要求显式 opt-in: 防止服务器"惊喜式"添加能力

代码注释引用了具体的团队讨论和 PR 编号, 表明每一层都经过安全审查。

### 发现 3: 权限 ID 的手机友好设计

权限 ID 使用纯字母 (去除 'l') 而非十六进制, 原因是手机用户在字母和数字键盘间
切换的体验差。注释引用 Kenneth 的话: "this is why i bias to numbers, hard to
have anything worse than 80085" -- 暗示纯数字方案也有不雅组合问题。

### 发现 4: 被妥协 Channel 的威胁分析

代码注释中对"被妥协的 Channel 服务器"进行了完整的威胁建模:
- 承认被妥协的服务器可以伪造权限批准
- 但论证这不比其已有的能力更危险 (社会工程 + acceptEdits)
- 明确声明"对话框减慢攻击者, 不能完全阻止"
- 引用具体的 PR 讨论编号, 表明这是团队级别的安全决策

### 发现 5: 结构化事件 vs 文本匹配的安全升级

早期设计中 上游工具可能直接在 Channel 文本消息中匹配权限回复。
现有设计要求 Channel 服务器先解析用户回复 (regex 由服务器实现), 然后发出
结构化的 `notifications/claude/channel/permission` 事件。上游工具不再
在文本消息中做 regex 匹配 -- "text in the general channel can never accidentally
match"。这消除了误触发的可能性。

### 发现 6: InProcessTransport 的 queueMicrotask 设计

进程内 MCP 传输使用 `queueMicrotask` 而非同步调用来投递消息。这不是性能优化,
而是防止同步的请求-响应循环导致栈溢出。MCP 协议的请求-响应模式如果在进程内
同步执行, `send() -> onmessage() -> send() -> onmessage()` 会无限递归。

### 发现 7: DirectConnect 的 NDJSON 解析

`directConnectManager.ts` 对 WebSocket 消息使用逐行 JSON 解析:
```typescript
const lines = data.split('\n').filter((l: string) => l.trim())
for (const line of lines) { ... jsonParse(line) ... }
```

这表明 DirectConnect 协议支持单个 WebSocket 消息中包含多个 JSON 对象 (NDJSON),
可能用于批量传输或在网络不稳定时合并小消息。

### 发现 8: VSCode 文件更新通知仅限内部

`notifyVscodeFileUpdated` 函数有一个硬编码的 guard:
```typescript
if (process.env.USER_TYPE !== 'ant' || !vscodeMcpClient) return
```

`USER_TYPE !== 'ant'` 表明 VSCode 文件更新通知目前仅对 Anthropic 内部用户启用,
外部用户不会触发此功能。这可能是一个正在开发中的功能, 尚未对外发布。
