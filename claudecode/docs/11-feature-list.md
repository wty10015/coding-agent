# 11. Feature List / MCP 客户端实现深度分析

## 目录

1. [概述](#概述)
2. [MCP 协议架构总览](#mcp-协议架构总览)
3. [传输层实现](#传输层实现)
4. [MCP 客户端核心逻辑](#mcp-客户端核心逻辑)
5. [OAuth 认证体系](#oauth-认证体系)
6. [跨应用访问 (XAA / SEP-990)](#跨应用访问)
7. [Channel 通知系统](#channel-通知系统)
8. [Feature Flag 与功能发现](#feature-flag-与功能发现)
9. [配置管理与多层级配置](#配置管理与多层级配置)
10. [Elicitation 交互机制](#elicitation-交互机制)
11. [连接管理与重连策略](#连接管理与重连策略)
12. [安全与权限控制](#安全与权限控制)
13. [亮点发现](#亮点发现)

---

## 概述

上游工具的 MCP (Model Context Protocol) 实现是整个系统中最庞大的子系统之一。
核心客户端文件 `client.ts` 超过 3300 行, 认证模块 `auth.ts` 超过 2400 行。
MCP 子系统位于 `services/mcp/` 目录下, 包含 23 个源文件, 覆盖了从传输层到
应用层的完整协议栈实现。

**核心源文件清单:**

| 文件 | 行数(约) | 职责 |
|------|----------|------|
| `client.ts` | ~3348 | MCP 客户端连接、工具获取、调用 |
| `auth.ts` | ~2465 | OAuth 认证、令牌管理 |
| `config.ts` | ~1500 | 多层级配置加载 |
| `types.ts` | ~259 | Schema 定义、类型系统 |
| `channelNotification.ts` | ~317 | Channel 消息推送 |
| `channelPermissions.ts` | ~241 | Channel 权限中继 |
| `channelAllowlist.ts` | ~77 | 白名单管理 |
| `elicitationHandler.ts` | ~200+ | Elicitation 交互 |
| `xaa.ts` | ~500+ | 跨应用认证 |
| `SdkControlTransport.ts` | ~100+ | SDK 进程内传输 |
| `InProcessTransport.ts` | ~64 | 进程内传输对 |

---

## MCP 协议架构总览

```
+-----------------------------------------------------------------------+
|                         该命令行工具CLI Process                        |
|                                                                        |
|  +------------------+    +------------------+    +------------------+  |
|  | MCPConnection    |    |   AppState       |    | MCPConnection    |  |
|  | Manager (React)  |--->|   (tools, MCP    |<---| Context          |  |
|  | useManageMCP     |    |    clients, etc.) |    | (reconnect,     |  |
|  | Connections.ts   |    +------------------+    |  toggle)         |  |
|  +--------+---------+                            +------------------+  |
|           |                                                            |
|  +--------v---------------------------------------------------------+  |
|  |                    connectToServer() [memoized]                   |  |
|  |  src/services/mcp/client.ts:595                                   |  |
|  +--+----------+----------+----------+----------+----------+--------+  |
|     |          |          |          |          |          |           |
|     v          v          v          v          v          v           |
|  +------+  +------+  +------+  +------+  +------+  +------+         |
|  |stdio |  | SSE  |  | HTTP |  |  WS  |  | SDK  |  |proxy |         |
|  |Trans.|  |Trans.|  |Trans.|  |Trans.|  |Trans.|  |Trans.|         |
|  +--+---+  +--+---+  +--+---+  +--+---+  +--+---+  +--+---+         |
|     |         |          |         |         |         |              |
+-----|---------|----------|---------|---------|---------|---------------+
      |         |          |         |         |         |
      v         v          v         v         v         v
  [子进程]  [SSE端点]  [HTTP端点] [WS端点] [SDK进程]  [claude.ai
   MCP       远程        远程       远程     内部       代理]
  Server    Server      Server    Server   Server     Server
```

**文件引用:** `src/services/mcp/types.ts:23-25`
```typescript
export const TransportSchema = lazySchema(() =>
  z.enum(['stdio', 'sse', 'sse-ide', 'http', 'ws', 'sdk']),
)
```

---

## 传输层实现

### 3.1 支持的传输类型 (8种)

上游工具支持 8 种不同的 MCP 传输类型, 这是目前已知 MCP 客户端实现中最完整的:

| 传输类型 | Schema 类型 | 用途 | 认证方式 |
|----------|------------|------|----------|
| `stdio` | McpStdioServerConfigSchema | 本地子进程 | 无 (环境变量) |
| `sse` | McpSSEServerConfigSchema | 远程 SSE | OAuth / Headers |
| `sse-ide` | McpSSEIDEServerConfigSchema | IDE 扩展 (SSE) | 无 |
| `ws-ide` | McpWebSocketIDEServerConfigSchema | IDE 扩展 (WS) | authToken |
| `http` | McpHTTPServerConfigSchema | Streamable HTTP | OAuth / Headers |
| `ws` | McpWebSocketServerConfigSchema | WebSocket | Headers |
| `sdk` | McpSdkServerConfigSchema | SDK 进程内 | 控制消息 |
| `claudeai-proxy` | McpClaudeAIProxyServerConfigSchema | claude.ai 代理 | OAuth Bearer |

### 3.2 stdio 传输

标准的子进程通信方式。支持环境变量注入:

**文件引用:** `src/services/mcp/client.ts:944-958`
```typescript
} else if (serverRef.type === 'stdio' || !serverRef.type) {
  const finalCommand =
    process.env.CLAUDE_CODE_SHELL_PREFIX || serverRef.command
  const finalArgs = process.env.CLAUDE_CODE_SHELL_PREFIX
    ? [[serverRef.command, ...serverRef.args].join(' ')]
    : serverRef.args
  transport = new StdioClientTransport({
    command: finalCommand,
    args: finalArgs,
    env: {
      ...subprocessEnv(),
      ...serverRef.env,
    } as Record<string, string>,
    stderr: 'pipe',
  })
}
```

关键设计: `stderr: 'pipe'` 防止 MCP 服务器的错误输出干扰 UI。stderr 被累积
到 `stderrOutput` 字符串, 上限 64MB, 用于调试连接失败。

### 3.3 进程内传输 (InProcessTransport)

为避免为特定 MCP 服务器启动独立子进程(约 325MB 内存开销), 上游工具实现了
进程内传输。

**文件引用:** `src/services/mcp/InProcessTransport.ts:1-63`
```typescript
class InProcessTransport implements Transport {
  private peer: InProcessTransport | undefined
  private closed = false

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error('Transport is closed')
    }
    // 异步投递, 避免同步请求/响应导致栈溢出
    queueMicrotask(() => {
      this.peer?.onmessage?.(message)
    })
  }
}

export function createLinkedTransportPair(): [Transport, Transport] {
  const a = new InProcessTransport()
  const b = new InProcessTransport()
  a._setPeer(b)
  b._setPeer(a)
  return [a, b]
}
```

当前两个使用场景:
1. **Chrome MCP Server** (`client.ts:908-924`): Chrome 浏览器集成
2. **Computer Use MCP Server** (`client.ts:925-943`): 计算机使用功能 (feature flag: `CHICAGO_MCP`)

### 3.4 SDK 控制传输 (SdkControlTransport)

专为 SDK 进程内 MCP 服务器设计的桥接传输。

**文件引用:** `src/services/mcp/SdkControlTransport.ts:1-37`

```
架构:

  CLI 进程                                  SDK 进程
  +------------------+                     +------------------+
  | MCP Client       |                     | MCP Server       |
  |    |              |    JSON-RPC         |              |   |
  |    v              |  control msgs       |              v   |
  | SdkControlClient |<----- stdout ------>| SdkControl       |
  | Transport        |                     | ServerTransport  |
  +------------------+                     +------------------+

消息流:
  CLI -> SDK: Client.callTool() -> SdkControlClientTransport.send()
              -> control request (server_name + request_id) -> stdout
              -> SDK StructuredIO -> SdkControlServerTransport.onmessage()
              -> MCP Server.handle()

  SDK -> CLI: MCP Server.send() -> SdkControlServerTransport.send()
              -> sendMcpMessage callback -> Query resolve pending
              -> complete control request
```

### 3.5 WebSocket 传输

支持标准 WebSocket 和 IDE WebSocket 两种变体。

**文件引用:** `src/services/mcp/client.ts:735-783`

针对 Bun 和 Node.js 运行时做了适配:
- Bun: 使用 `globalThis.WebSocket`, 支持 `headers`, `proxy`, `tls` 选项
- Node.js: 使用 `ws` 包的三参数构造函数 `new WS(url, protocols, options)`

### 3.6 Streamable HTTP 传输

遵循 MCP 2025-03-26 规范的 Streamable HTTP 实现:

**文件引用:** `src/services/mcp/client.ts:466-471`
```typescript
const MCP_STREAMABLE_HTTP_ACCEPT = 'application/json, text/event-stream'
```

每个 POST 请求必须声明同时接受 JSON 和 SSE, 否则服务器可能返回 HTTP 406。

### 3.7 claude.ai 代理传输

通过 claude.ai 的 MCP 代理转发请求, 使用 OAuth Bearer Token:

**文件引用:** `src/services/mcp/client.ts:868-904`
```typescript
const proxyUrl = `${oauthConfig.MCP_PROXY_URL}${
  oauthConfig.MCP_PROXY_PATH.replace('{server_id}', serverRef.id)
}`
const fetchWithAuth = createClaudeAiProxyFetch(globalThis.fetch)
```

代理的 `createClaudeAiProxyFetch` 实现了 401 自动重试: 如果令牌过期, 自动刷新
后重试一次。

---

## MCP 客户端核心逻辑

### 4.1 连接建立 (connectToServer)

连接函数使用 lodash `memoize` 缓存, 基于 `name + JSON(config)` 作为缓存键:

**文件引用:** `src/services/mcp/client.ts:581-596`
```typescript
export function getServerCacheKey(
  name: string,
  serverRef: ScopedMcpServerConfig,
): string {
  return `${name}-${jsonStringify(serverRef)}`
}

export const connectToServer = memoize(
  async (name, serverRef, serverStats?) => { ... },
  getServerCacheKey,
)
```

客户端创建时声明的能力:

**文件引用:** `src/services/mcp/client.ts:985-1001`
```typescript
const client = new Client(
  { name: 'coding-agent', title: '该命令行工具', version: MACRO.VERSION },
  {
    capabilities: {
      roots: {},
      elicitation: {},  // 空对象 = 声明能力 (兼容 Java MCP SDK)
    },
  },
)
```

### 4.2 批量连接策略

本地和远程服务器使用不同的批量大小:

**文件引用:** `src/services/mcp/client.ts:552-565`
```typescript
export function getMcpServerConnectionBatchSize(): number {
  return parseInt(process.env.MCP_SERVER_CONNECTION_BATCH_SIZE || '', 10) || 3
}

function getRemoteMcpServerConnectionBatchSize(): number {
  return parseInt(process.env.MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE || '', 10) || 20
}

function isLocalMcpServer(config: ScopedMcpServerConfig): boolean {
  return !config.type || config.type === 'stdio' || config.type === 'sdk'
}
```

- 本地服务器(stdio/sdk): 默认 3 个并发连接
- 远程服务器(SSE/HTTP/WS等): 默认 20 个并发连接

### 4.3 工具获取 (fetchToolsForClient)

使用 LRU 缓存的记忆化函数:

**文件引用:** `src/services/mcp/client.ts:1743-1998`

关键处理步骤:
1. 检查服务器是否声明 `tools` 能力
2. 发送 `tools/list` 请求
3. Unicode 清理 (`recursivelySanitizeUnicode`)
4. SDK MCP 服务器可跳过 `mcp__` 前缀 (`CLAUDE_AGENT_SDK_MCP_NO_PREFIX`)
5. 工具描述截断到 2048 字符
6. 工具注解 (annotations) 映射:
   - `readOnlyHint` -> `isConcurrencySafe()`, `isReadOnly()`
   - `destructiveHint` -> `isDestructive()`
   - `openWorldHint` -> `isOpenWorld()`
   - `title` -> `userFacingName()`
7. 搜索提示 (`anthropic/searchHint`) 和始终加载 (`anthropic/alwaysLoad`)
8. IDE 工具白名单过滤: 仅 `mcp__ide__executeCode` 和 `mcp__ide__getDiagnostics`

### 4.4 工具调用与会话恢复

工具调用支持会话过期自动重试:

**文件引用:** `src/services/mcp/client.ts:1859-1970`
```
调用流程:

  Agent 请求 MCP 工具
       |
       v
  ensureConnectedClient(client)  <-- 确保连接可用
       |
       v
  callMCPToolWithUrlElicitationRetry()  <-- 支持 URL elicitation 重试
       |
       +-- 成功 --> 返回结果 (content + _meta + structuredContent)
       |
       +-- McpSessionExpiredError
       |   (HTTP 404 + JSON-RPC -32001)
       |   --> 清除缓存, 重连, 最多重试 1 次
       |
       +-- McpAuthError --> 标记 needs-auth
       |
       +-- 其他错误 --> 包装为 TelemetrySafeError
```

### 4.5 超时管理

**文件引用:** `src/services/mcp/client.ts:207-228`
```typescript
const DEFAULT_MCP_TOOL_TIMEOUT_MS = 100_000_000  // ~27.8 小时
const MCP_REQUEST_TIMEOUT_MS = 60000              // 60 秒
const MCP_AUTH_CACHE_TTL_MS = 15 * 60 * 1000     // 15 分钟
```

`wrapFetchWithTimeout` 的设计精妙之处在于:
- POST 请求: 60 秒超时
- GET 请求: 无超时 (SSE 长连接)
- 使用 `setTimeout` 而非 `AbortSignal.timeout()` (Bun 的 native 内存问题)

---

## OAuth 认证体系

### 5.1 ClaudeAuthProvider

**文件引用:** `src/services/mcp/auth.ts:1-150`

OAuth 认证支持:
- RFC 8414 授权服务器元数据发现
- RFC 7636 PKCE 扩展
- 动态客户端注册 (DCR)
- 令牌刷新与失效处理

错误分类:

```typescript
type MCPRefreshFailureReason =
  | 'metadata_discovery_failed'
  | 'no_client_info'
  | 'no_tokens_returned'
  | 'invalid_grant'
  | 'transient_retries_exhausted'
  | 'request_failed'

type MCPOAuthFlowErrorReason =
  | 'cancelled' | 'timeout' | 'provider_denied'
  | 'state_mismatch' | 'port_unavailable'
  | 'sdk_auth_failed' | 'token_exchange_failed' | 'unknown'
```

### 5.2 Slack 兼容性 Hack

**文件引用:** `src/services/mcp/auth.ts:127-150`

Slack OAuth 服务器在错误时返回 HTTP 200 + JSON body, 而非标准的 HTTP 400:

```typescript
const NONSTANDARD_INVALID_GRANT_ALIASES = new Set([
  'invalid_refresh_token',
  'expired_refresh_token',
  'token_expired',
])
```

`wrapFetchForSlackStyleErrors` 拦截 2xx POST 响应, 如果 body 匹配
`OAuthErrorResponseSchema` 但不匹配 `OAuthTokensSchema`, 则将响应重写为 400,
以触发 SDK 的正常错误处理路径。

### 5.3 安全参数清理

**文件引用:** `src/services/mcp/auth.ts:98-125`
```typescript
const SENSITIVE_OAUTH_PARAMS = [
  'state', 'nonce', 'code_challenge', 'code_verifier', 'code',
]

function redactSensitiveUrlParams(url: string): string {
  // 将敏感参数替换为 [REDACTED]
}
```

### 5.4 needs-auth 缓存

认证失败的服务器在 15 分钟内不会重复触发认证流程:

**文件引用:** `src/services/mcp/client.ts:257-316`
```
缓存路径: $CLAUDE_CONFIG_HOME/mcp-needs-auth-cache.json
内容: { [serverId]: { timestamp: number } }
TTL: 15 分钟
写入序列化: 通过 Promise chain 防止并发竞态
读取缓存: 使用 memoized Promise, 写入时失效
```

---

## 跨应用访问

### 6.1 XAA (Cross-App Access / SEP-990)

**文件引用:** `src/services/mcp/xaa.ts:1-52`

XAA 允许在无浏览器同意屏幕的情况下获取 MCP 访问令牌:

```
XAA 令牌交换流程:

  1. RFC 8693 Token Exchange @ IdP:
     id_token -----> IdP -----> ID-JAG (Identity Assertion Grant)

  2. RFC 7523 JWT Bearer Grant @ AS:
     ID-JAG -------> Authorization Server -------> access_token

配置层级:
  - 全局: settings.xaaIdp (IdP 连接信息)
  - 每服务器: mcpServers[name].oauth.xaa = true

引用规范:
  - ID-JAG (IETF draft)
  - MCP ext-auth (SEP-990)
  - RFC 8693 (Token Exchange)
  - RFC 7523 (JWT Bearer)
  - RFC 9728 (Protected Resource Metadata)
```

### 6.2 Step-Up 检测

**文件引用:** `src/services/mcp/auth.ts` (wrapFetchWithStepUpDetection)

当 MCP 服务器返回 403 且需要更高级别认证时, `wrapFetchWithStepUpDetection`
自动触发 step-up 认证流程, 在 SDK 的标准认证处理之前拦截。

---

## Channel 通知系统

### 7.1 架构概述

Channel 系统将外部消息平台 (Telegram, Discord, Slack, iMessage) 接入 上游工具会话。

**文件引用:** `src/services/mcp/channelNotification.ts:1-17`

```
Channel 架构:

  外部平台 (Telegram/Discord/Slack/iMessage)
       |
       v
  MCP Channel Server (声明 claude/channel 能力)
       |
       |--- 入站消息: notifications/claude/channel
       |    -> wrapChannelMessage() -> <channel source="name">content</channel>
       |    -> 加入消息队列 -> SleepTool 轮询唤醒
       |
       |--- 出站消息: MCP 工具调用 (e.g., send_message)
       |
       |--- 权限中继: notifications/claude/channel/permission
       |    -> 结构化事件 {request_id, behavior}
       |
  该命令行工具主循环
```

### 7.2 功能门控 (Feature Gating)

Channel 功能有 6 层门控:

**文件引用:** `src/services/mcp/channelNotification.ts:191-316`

```
门控顺序 (gateChannelServer):

  1. capability    服务器声明 experimental['claude/channel']
  2. disabled      运行时总开关 (GrowthBook: internal_harbor)
  3. auth          仅 OAuth 用户 (API Key 被阻止)
  4. policy        Teams/Enterprise 组织须显式启用 channelsEnabled
  5. session       服务器须在 --channels 列表中
  6. allowlist     插件须在批准的 Channel 白名单中

  任一层失败 -> skip (连接保持, 但不注册通知处理器)
  全部通过 -> register (订阅 notifications/claude/channel)
```

### 7.3 权限中继协议

**文件引用:** `src/services/mcp/channelPermissions.ts:1-241`

当权限对话框弹出时, 上游工具会同时通过活跃的 Channel 发送权限请求:

```
权限中继流程:

  1. 该命令行工具触发权限对话框
       |
  2. 生成短 ID (5 字母, 25^5 ~9.8M 空间)
     hashToId(toolUseID) -> FNV-1a -> base-25 编码
     过滤脏话子串 (10 次重哈希上限)
       |
  3. 发送权限请求:
     notifications/claude/channel/permission_request
     { request_id, tool_name, description, input_preview (200字截断) }
       |
  4. 人类在手机上回复 "yes tbxkq" 或 "no tbxkq"
       |
  5. Channel 服务器解析回复:
     /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i
       |
  6. 服务器发出结构化事件:
     notifications/claude/channel/permission
     { request_id: "tbxkq", behavior: "allow" }
       |
  7. CC 匹配 pending map, 第一个响应者获胜 (claim 语义)
```

**关键安全设计:**
- 不使用字母 'l' (与 1/I 混淆)
- 脏话过滤 (`ID_AVOID_SUBSTRINGS`)
- 服务器必须声明两个能力才能成为权限中继
- 文本消息不能意外触发权限批准

---

## Feature Flag 与功能发现

### 8.1 编译时 Feature Flag

上游工具使用 `bun:bundle` 的 `feature()` 进行死代码消除:

**文件引用:** `src/services/mcp/client.ts:1, 117, 241-249`
```typescript
import { feature } from 'bun:bundle'

const fetchMcpSkillsForClient = feature('MCP_SKILLS') ? ... : null
const computerUseWrapper = feature('CHICAGO_MCP') ? ... : undefined
const isComputerUseMCPServer = feature('CHICAGO_MCP') ? ... : undefined
```

已知 MCP 相关 Feature Flag:

| Flag | 功能 |
|------|------|
| `MCP_SKILLS` | MCP 技能发现 |
| `CHICAGO_MCP` | 计算机使用 MCP 服务器 |
| `KAIROS` / `KAIROS_CHANNELS` | Channel 系统 |
| `FORK_SUBAGENT` | Fork 子代理 |
| `COORDINATOR_MODE` | 协调者模式 |
| `VOICE_MODE` | 语音模式 |
| `TRANSCRIPT_CLASSIFIER` | 转录分类器 |
| `PROACTIVE` | 主动行为 |
| `VERIFICATION_AGENT` | 验证代理 |

### 8.2 运行时 Feature Gate (GrowthBook)

运行时功能使用 GrowthBook 进行 A/B 测试和渐进发布:

**文件引用:** `src/services/mcp/channelAllowlist.ts:51-53`
```typescript
export function isChannelsEnabled(): boolean {
  return getFeatureValue_CACHED_MAY_BE_STALE('internal_harbor', false)
}
```

MCP 相关 GrowthBook Feature:

| Feature Key | 默认值 | 功能 |
|-------------|--------|------|
| `internal_harbor` | false | Channel 总开关 |
| `internal_harbor_permissions` | false | Channel 权限中继 |
| `internal_harbor_ledger` | [] | Channel 白名单 |
| `internal_auto_background_agents` | false | 自动后台代理 |
| `internal_amber_stoat` | true | Explore/Plan 内置代理 |
| `internal_slim_subagent_claudemd` | true | 精简子代理 CLAUDE.md |

### 8.3 MCP 官方注册表

**文件引用:** `src/services/mcp/officialRegistry.ts:33-60`
```typescript
export async function prefetchOfficialMcpUrls(): Promise<void> {
  const response = await axios.get<RegistryResponse>(
    'https://api.anthropic.com/mcp-registry/v0/servers?version=latest&visibility=commercial',
    { timeout: 5000 },
  )
  // 收集所有远程 URL, 用于后续匹配
}
```

启动时异步预取官方 MCP 服务器 URL 列表, 用于识别用户配置的服务器是否为官方认证。

---

## 配置管理与多层级配置

### 9.1 配置来源 (7 个层级)

**文件引用:** `src/services/mcp/types.ts:10-20`
```typescript
export const ConfigScopeSchema = lazySchema(() =>
  z.enum([
    'local',       // 本地项目 (.claude/settings.local.json)
    'user',        // 用户级 (~/.claude/settings.json)
    'project',     // 项目级 (.claude/settings.json)
    'dynamic',     // 运行时动态 (Agent MCP, SDK 注入)
    'enterprise',  // 企业级 (managed settings)
    'claudeai',    // claude.ai 代理
    'managed',     // 远程托管设置
  ]),
)
```

### 9.2 配置加载流程

**文件引用:** `src/services/mcp/config.ts:1-50` (引用)

```
配置加载优先级:

  managed (最高)
    |
  enterprise
    |
  claudeai
    |
  project
    |
  local
    |
  user (最低)
    |
  dynamic (运行时覆盖)

合并策略:
  - 同名服务器: 高优先级覆盖低优先级
  - 禁用检查: isMcpServerDisabled() 过滤
  - 插件注入: getPluginMcpServers() 追加插件提供的 MCP 服务器
```

### 9.3 Fail-Open 策略

多处使用 fail-open 策略确保系统在配置获取失败时仍可运行:

**引用示例:**
- `src/services/policyLimits/index.ts:519`: `return true // fail open`
- `src/services/settingsSync/index.ts:108`: 非必要流量不阻塞启动
- `src/services/remoteManagedSettings/index.ts:441`: 无缓存时继续运行

---

## Elicitation 交互机制

### 10.1 Elicitation 概述

MCP 服务器可以通过 Elicitation 机制向用户请求输入。

**文件引用:** `src/services/mcp/elicitationHandler.ts:1-80`

支持两种模式:
- **form**: 表单输入 (JSON Schema 驱动)
- **url**: URL 跳转 (浏览器打开 + 等待完成通知)

### 10.2 URL Elicitation 流程

```
URL Elicitation 流程:

  MCP Server --(elicitation request)--> Client
       |
  Client 打开浏览器 -> 用户操作
       |
  等待状态 (actionLabel: "Retry now" 或 "Skip confirmation")
       |
  Server --(ElicitationCompleteNotification)--> Client 标记完成
       |
  用户操作:
    dismiss -> 取消等待
    retry   -> 重新尝试
    cancel  -> 取消 elicitation
```

### 10.3 Hook 集成

Elicitation 经过 hook 管道:
```typescript
executeElicitationHooks(params)     // 前置 hook
// ... 用户交互 ...
executeElicitationResultHooks(result) // 后置 hook
```

---

## 连接管理与重连策略

### 11.1 错误检测与分类

**文件引用:** `src/services/mcp/client.ts:1249-1263`
```typescript
const isTerminalConnectionError = (msg: string): boolean => {
  return (
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('EPIPE') ||
    msg.includes('EHOSTUNREACH') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('Body Timeout Error') ||
    msg.includes('terminated') ||
    msg.includes('SSE stream disconnected') ||
    msg.includes('Failed to reconnect SSE stream')
  )
}
```

### 11.2 重连机制

```
重连策略:

  连接正常
       |
  onerror 触发
       |
  是否为终端错误?
       |
  +-- 是 --> 累计连续错误计数
  |          (MAX_ERRORS_BEFORE_RECONNECT = 3)
  |              |
  |          >= 3 次 --> closeTransportAndRejectPending()
  |                      -> client.close() -> 清除 memo 缓存
  |                      -> 下次操作自动重连
  |
  +-- 否 --> 继续监控
       |
  特殊处理:
  - MCP Session 过期 (HTTP 404 + JSON-RPC -32001) -> 立即重连
  - SSE 重连耗尽 ("Maximum reconnection attempts") -> 立即关闭
```

### 11.3 进程清理

stdio 服务器的信号升级策略:

**文件引用:** `src/services/mcp/client.ts:1429-1557`
```
信号升级: SIGINT (100ms) -> SIGTERM (400ms) -> SIGKILL (500ms)

  发送 SIGINT
       |--- 100ms ---
       |
  检查进程? 退出 -> 完成
       |
  发送 SIGTERM
       |--- 400ms ---
       |
  检查进程? 退出 -> 完成
       |
  发送 SIGKILL
       |--- 100ms 超时 ---
       |
  总超时 600ms failsafe
```

---

## 安全与权限控制

### 12.1 配置范围安全

不同配置范围具有不同信任级别:

| 范围 | 信任来源 | MCP 服务器来源 |
|------|----------|---------------|
| managed | 组织管理员 | 远程推送 |
| enterprise | 企业管理员 | 策略文件 |
| project | 项目维护者 | .claude/ 目录 |
| local | 当前用户 | 本地设置 |
| user | 当前用户 | 全局设置 |
| dynamic | 运行时 | Agent/SDK 动态注入 |

### 12.2 插件限制策略

**文件引用:** `src/tools/AgentTool/runAgent.ts:112-127`

当 `strictPluginOnlyCustomization` 锁定 MCP 时:
- 用户定义的 Agent frontmatter MCP 服务器被跳过
- 插件/内置/策略 Agent 的 MCP 服务器正常加载
- 保证管理员控制的表面不被用户规避

### 12.3 环境变量注入安全

MCP 服务器的环境变量通过 `envExpansion.ts` 处理, 支持 `${VAR}` 语法扩展,
但默认不传播宿主进程的敏感环境变量。

---

## 亮点发现

### 发现 1: Slack OAuth 兼容性 Hack

`auth.ts` 中存在一个精心设计的 HTTP 200 错误响应重写层。Slack 的 OAuth 服务器
违反 RFC 6749, 在错误时返回 HTTP 200 + JSON body。上游工具通过拦截 fetch
响应, 将这类"伪成功"重写为 HTTP 400, 使得 SDK 的标准错误处理逻辑能够正确匹配。
此外还处理了 Slack 的非标准错误码 (`invalid_refresh_token`, `expired_refresh_token`,
`token_expired`) 到标准 `invalid_grant` 的映射。

### 发现 2: 8 种传输类型 + 进程内 MCP 服务器

这可能是目前 MCP 客户端实现中支持传输类型最多的。特别是 `InProcessTransport`
使用 `queueMicrotask` 进行异步消息投递, 既避免了子进程开销(Chrome MCP 节省
~325MB 内存), 又防止了同步消息循环导致的栈溢出。

### 发现 3: Channel 权限中继的脏话过滤器

`channelPermissions.ts` 中为 5 字母权限 ID 实现了一个脏话过滤系统。因为随机
5 字母组合可能拼出不雅单词, 而这些 ID 会通过 Telegram/iMessage 发送到用户手机。
注释引用了具体的 PR 讨论 (#2956440848) 和团队成员 Kenneth 的安全审查意见。

### 发现 4: 信号升级的精确时序

stdio MCP 服务器的清理使用了 SIGINT -> SIGTERM -> SIGKILL 三级信号升级,
每级间有精确的等待时间(100ms, 400ms), 总超时 600ms。使用 50ms 间隔的
`setInterval` 轮询进程状态, 并设置 600ms 的 failsafe 超时防止无限等待。

### 发现 5: MCP 请求超时使用 setTimeout 而非 AbortSignal.timeout()

`wrapFetchWithTimeout` 明确避免使用 `AbortSignal.timeout()`, 原因是 Bun 运行时
中 AbortSignal 的 native timer 即使在请求完成后也不会释放, 每个请求泄漏 ~2.4KB
native 内存。改用 `setTimeout` + `clearTimeout` 模式手动管理。

### 发现 6: 会话过期检测的双信号验证

`isMcpSessionExpiredError` 同时检查 HTTP 404 和 JSON-RPC -32001 错误码, 而非仅
检查 404。注释明确说明这是为了避免将"URL 不存在"等通用 404 误判为会话过期。

### 发现 7: MCPToolResult 的三维数据结构

MCP 工具调用的返回值包含三个层次:
- `content`: 标准 MCP 内容块
- `_meta`: MCP 元数据 (即使 isError=true 也传递)
- `structuredContent`: 结构化内容

这种设计允许 MCP 服务器在返回错误的同时传递元数据, 符合 MCP 规范中
"_meta 在 base Result 类型上, 对错误结果也有效" 的规定。
