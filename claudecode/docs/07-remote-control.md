# 07 - Remote Control 远程控制系统

## 1. 概述

上游工具的远程控制（Remote Control）系统是一套完整的分布式架构，
允许用户通过 claude.ai Web 界面或 SDK 远程操控本地 CLI 实例，或将 CLI
会话在远程容器中运行。该系统涵盖了 WebSocket
实时通信、权限双向协商、消息去重、JWT 令牌刷新和两代传输协议（v1/v2）。

### 核心设计目标

1. **双向控制**: 本地 CLI 和远程 Web UI 可以互相发送消息和控制指令
2. **权限协商**: 工具调用的权限请求可以跨越网络边界进行审批
3. **传输可靠性**: 通过 epoch 机制、序列号、UUID 去重保证消息不丢失
4. **安全性**: JWT + OAuth 双重认证，防重放机制，epoch 强序保证

```
主要代码位置:
  remote/              - 远程会话管理 (4 个文件)
  server/              - 直连服务端 (3 个文件)
  bridge/              - Bridge 核心逻辑 (~30 个文件)
  entrypoints/sdk/     - SDK 控制协议类型定义
```

---

## 2. 系统架构总览

```
+------------------------------------------------------------------+
|                      Remote Control 总体架构                       |
+------------------------------------------------------------------+

  模式 A: CCR (远程会话) 远程会话
  =========================================

  +-----------+       WebSocket (wss://)       +----------------+
  | 本地 CLI  |<------------------------------>| Anthropic 服务 |
  | (REPL)    |  subscribe + control_response  | (CCR Backend)  |
  +-----------+       HTTP POST                +----------------+
        |         sendEventToRemoteSession           |
        v                                            v
  +-------------------+                     +------------------+
  | RemoteSession     |                     | 远程容器(Worker)  |
  | Manager           |                     | 实际执行 Agent   |
  +-------------------+                     +------------------+


  模式 B: Bridge (桥接) 模式 — 本地 CLI 主动连接
  ================================================

  +-----------+   OAuth + /bridge   +-------------------+
  | 本地 CLI  |-------------------->| /v1/code/sessions |
  | (REPL)    |                     | /v1/code/.../bridge|
  +-----------+                     +-------------------+
        |                                    |
        | SSE (reads) + CCRClient (writes)   | worker_jwt + epoch
        |                                    |
        v                                    v
  +--------------------+            +-------------------+
  | ReplBridgeTransport|            | Session-Ingress   |
  | (v1 or v2)        |            | (Server)          |
  +--------------------+            +-------------------+


  模式 C: Direct Connect (直连) 模式
  ====================================

  +-----------+  POST /sessions    +------------------+
  | 本地 CLI  |------------------->| 直连服务器       |
  | (REPL)    |                    | (用户部署)       |
  +-----------+  WebSocket         +------------------+
        |<------ control_request --------|
        |------- control_response ------>|
        |------- user message ---------->|
        |<------ SDKMessage -------------|
```

---

## 3. Remote 目录 — 远程会话管理

### 3.1 RemoteSessionManager (remote/RemoteSessionManager.ts)

这是远程会话管理的核心门面类。当用户通过 claude.ai 或 SDK 连接到远程 CCR 会话时，
本地 CLI 实例化此类来管理整个通信生命周期。

**文件**: `remote/RemoteSessionManager.ts`

```
类结构:
  RemoteSessionManager
    ├── config: RemoteSessionConfig     (sessionId, getAccessToken, orgUuid)
    ├── callbacks: RemoteSessionCallbacks (onMessage, onPermissionRequest, ...)
    ├── websocket: SessionsWebSocket    (底层 WS 连接)
    └── pendingPermissionRequests: Map   (待处理权限请求)
```

**关键类型定义** (remote/RemoteSessionManager.ts:40-85):

```typescript
// 远程权限响应 — 简化版的 PermissionResult
export type RemotePermissionResponse =
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'deny'; message: string }

// 远程会话配置
export type RemoteSessionConfig = {
  sessionId: string
  getAccessToken: () => string
  orgUuid: string
  hasInitialPrompt?: boolean  // 是否有初始提示正在处理
  viewerOnly?: boolean        // 纯观察者模式 (如 claude assistant)
}
```

**消息分发流程** (remote/RemoteSessionManager.ts:146-184):

```
handleMessage()
    |
    +--> type === 'control_request'
    |       +--> subtype === 'can_use_tool'  →  onPermissionRequest()
    |       +--> unknown subtype  →  sendControlResponse(error)
    |
    +--> type === 'control_cancel_request'
    |       +--> 取消待处理权限 → onPermissionCancelled()
    |
    +--> type === 'control_response'
    |       +--> 记录日志
    |
    +--> isSDKMessage()
            +--> onMessage() (转发给 REPL 渲染)
```

**亮点**: `viewerOnly` 模式 (line 59-61) 表示这个客户端是纯查看器，
Ctrl+C/Escape 不会发送中断到远程 agent；60 秒重连超时禁用；会话标题
不会更新。这是 `claude assistant` 命令的运行模式。

### 3.2 SessionsWebSocket (remote/SessionsWebSocket.ts)

底层 WebSocket 通信层，负责与 CCR 服务器建立和维护 WebSocket 连接。

**协议流程** (remote/SessionsWebSocket.ts:77-81):

```
1. 连接到 wss://api.anthropic.com/v1/sessions/ws/{sessionId}/subscribe
2. 通过 HTTP Headers 认证 (Authorization: Bearer token)
3. 接收 SDKMessage 事件流
```

**重连策略** (remote/SessionsWebSocket.ts:17-26):

| 参数 | 值 | 说明 |
|------|------|------|
| RECONNECT_DELAY_MS | 2000ms | 基础重连延迟 |
| MAX_RECONNECT_ATTEMPTS | 5 | 最大重连次数 |
| PING_INTERVAL_MS | 30000ms | 心跳间隔 |
| MAX_SESSION_NOT_FOUND_RETRIES | 3 | 4001 错误重试上限 |

**永久关闭码 vs 可恢复关闭码**:

```
永久关闭 (PERMANENT_CLOSE_CODES):
  4003 - unauthorized → 立即停止重连

可恢复关闭:
  4001 - session not found
    → 可能是 compaction 期间的瞬态错误
    → 有限重试 (最多 3 次)
    → 递增延迟: delay = 2000ms * retryCount

  其他非永久码:
    → 如果之前已连接，尝试重连
    → 最多 5 次
```

**双运行时适配** (remote/SessionsWebSocket.ts:120-204):

代码显式区分了 Bun 和 Node.js 两种 WebSocket 实现:

```typescript
if (typeof Bun !== 'undefined') {
  // Bun: 使用 globalThis.WebSocket，支持 headers/proxy 选项
  const ws = new globalThis.WebSocket(url, { headers, proxy, tls })
  ws.addEventListener('open', ...)
  ws.addEventListener('message', ...)
} else {
  // Node: 使用 ws 包
  const { default: WS } = await import('ws')
  const ws = new WS(url, { headers, agent, ...tls })
  ws.on('open', ...)
  ws.on('message', ...)
}
```

### 3.3 sdkMessageAdapter (remote/sdkMessageAdapter.ts)

消息格式转换适配器，将 CCR 后端的 SDK 格式消息转为本地 REPL 内部格式。

**转换映射表**:

| SDK 类型 | 转换目标 | 说明 |
|----------|----------|------|
| SDKAssistantMessage | AssistantMessage | 助手回复 |
| SDKPartialAssistantMessage | StreamEvent | 流式事件 |
| SDKResultMessage | SystemMessage | 仅错误时显示 |
| SDKSystemMessage (init) | SystemMessage | 初始化信息 |
| SDKStatusMessage | SystemMessage | 状态变更 (如 compacting) |
| SDKToolProgressMessage | SystemMessage | 工具执行进度 |
| SDKCompactBoundaryMessage | SystemMessage | 压缩边界标记 |
| user (tool_result) | UserMessage | 可选，Direct Connect 模式 |
| auth_status | ignored | 认证状态另行处理 |
| tool_use_summary | ignored | SDK 专用事件 |
| rate_limit_event | ignored | SDK 专用事件 |

**关键设计决策** (remote/sdkMessageAdapter.ts:220-225):

成功的 `result` 消息被忽略 — `isLoading=false` 就足以告知 REPL 会话结束，
无需冗余的成功消息。这在多轮会话中减少了大量噪音。

### 3.4 remotePermissionBridge (remote/remotePermissionBridge.ts)

为远程权限请求创建合成的 AssistantMessage 和工具存根。

**问题**: `ToolUseConfirm` 类型需要一个 `AssistantMessage`，但在远程模式
下工具运行在 CCR 容器上，本地没有真正的 AssistantMessage。

**解决方案** (remote/remotePermissionBridge.ts:12-46):

```typescript
function createSyntheticAssistantMessage(request, requestId) {
  return {
    type: 'assistant',
    uuid: randomUUID(),
    message: {
      id: `remote-${requestId}`,  // 用前缀区分合成消息
      content: [{
        type: 'tool_use',
        id: request.tool_use_id,
        name: request.tool_name,
        input: request.input,
      }],
      model: '',           // 空模型标识
      usage: { /* 所有字段为0 */ },
    },
  }
}
```

**工具存根** (remote/remotePermissionBridge.ts:53-78):

当远程 CCR 有 MCP 工具等本地不了解的工具时，创建最小化的 Tool 存根:

```typescript
function createToolStub(toolName: string): Tool {
  return {
    name: toolName,
    isReadOnly: () => false,          // 保守假设
    needsPermissions: () => true,     // 始终要求权限
    call: async () => ({ data: '' }), // 永不本地调用
    // ...
  }
}
```

---

## 4. Server 目录 — Direct Connect 模式

### 4.1 架构概述

Direct Connect 是一种替代方案，用户可以部署自己的服务器来运行 上游工具
会话，而不依赖 Anthropic 的 CCR 基础设施。

**文件**: `server/types.ts`

```typescript
type ServerConfig = {
  port: number
  host: string
  authToken: string
  unix?: string                    // Unix socket 路径
  idleTimeoutMs?: number           // 分离会话空闲超时
  maxSessions?: number             // 最大并发会话数
  workspace?: string               // 默认工作目录
}

type SessionState = 'starting' | 'running' | 'detached' | 'stopping' | 'stopped'
```

### 4.2 会话创建流程 (server/createDirectConnectSession.ts)

```
客户端                              服务端
  |                                   |
  | POST /sessions                    |
  | { cwd, dangerously_skip_permissions? }
  |---------------------------------->|
  |                                   | 创建子进程
  |                                   | 返回 session_id + ws_url
  |<----------------------------------|
  |                                   |
  | WebSocket 连接 ws_url             |
  |=================================>|
  |   双向通信开始                     |
```

### 4.3 DirectConnectSessionManager (server/directConnectManager.ts)

与 RemoteSessionManager 的接口完全平行，但通信机制不同:

**关键差异**:

| 特性 | CCR 模式 | Direct Connect |
|------|----------|----------------|
| 认证 | OAuth + JWT | Bearer Token |
| 消息发送 | HTTP POST (sendEventToRemoteSession) | WebSocket |
| 消息接收 | WebSocket subscribe | WebSocket |
| 重连策略 | 5 次重试 + 指数退避 | 无内置重连 |
| 消息格式 | 单 JSON | 换行分隔多 JSON |

**消息过滤** (server/directConnectManager.ts:103-113):

Direct Connect 过滤掉以下消息类型:
- `control_response` — 控制回复
- `keep_alive` — 心跳
- `control_cancel_request` — 取消请求
- `streamlined_text` — 精简文本
- `streamlined_tool_use_summary` — 精简工具摘要
- `system` + `post_turn_summary` — 轮次后摘要

---

## 5. Bridge 系统 — 核心桥接机制

### 5.1 FlushGate (bridge/flushGate.ts)

FlushGate 是一个精巧的状态机，解决了一个关键的消息排序问题。

**问题**: 当 bridge 会话启动时，历史消息通过单次 HTTP POST 批量刷新到服务器。
在刷新期间，新产生的消息必须排队，否则服务器会收到交错的历史和实时消息。

```
FlushGate 状态机
================

  [ inactive ]
       |
    start()
       |
       v
  [ active ]  ── enqueue(items) → 返回 true, 消息排队
       |
    end() ──────→ 返回排队的消息, 调用方负责发送
       |
       v
  [ inactive ]  ── enqueue(items) → 返回 false, 调用方直接发送


  异常路径:
    drop()       ── 丢弃所有排队消息 (传输永久关闭)
    deactivate() ── 清除 active 标志但保留排队消息
                    (传输替换时使用 — 新传输会 drain)
```

**代码** (bridge/flushGate.ts:16-71):

```typescript
export class FlushGate<T> {
  private _active = false
  private _pending: T[] = []

  start(): void { this._active = true }

  end(): T[] {
    this._active = false
    return this._pending.splice(0)  // 返回并清空
  }

  enqueue(...items: T[]): boolean {
    if (!this._active) return false  // 非活跃: 调用方自行发送
    this._pending.push(...items)
    return true                      // 活跃: 已排队
  }

  drop(): number {
    this._active = false
    const count = this._pending.length
    this._pending.length = 0
    return count
  }
}
```

### 5.2 BoundedUUIDSet (bridge/bridgeMessaging.ts:429-461)

消息回声去重的核心数据结构 — FIFO 有界集合，基于环形缓冲区实现。

```
BoundedUUIDSet (环形缓冲区)
===========================

  容量: 2000 (可配置)

  +---+---+---+---+---+---+---+---+---+
  | A | B | C | D | E |   |   |   |   |
  +---+---+---+---+---+---+---+---+---+
                        ^
                     writeIdx

  add("F"):
  +---+---+---+---+---+---+---+---+---+
  | A | B | C | D | E | F |   |   |   |
  +---+---+---+---+---+---+---+---+---+
                            ^
                         writeIdx

  当缓冲区满时:
  +---+---+---+---+---+---+---+---+---+
  | J | K | L | M | N | O | P | Q | R |
  +---+---+---+---+---+---+---+---+---+
    ^
  writeIdx → 驱逐最老的 'J', 替换为新 UUID
```

**去重策略** (bridge/bridgeMessaging.ts:132-208):

消息通过两层去重:
1. `recentPostedUUIDs` — 我们发送的消息的回声（服务器转发回来的）
2. `recentInboundUUIDs` — 重复投递的入站消息（序列号协商边缘情况）

### 5.3 remoteBridgeCore — v2 无环境层桥接核心

**文件**: `bridge/remoteBridgeCore.ts`

这是最新的 v2 桥接实现，绕过了 Environments API 层，直接与 session-ingress
连接。

**v1 vs v2 对比**:

```
v1 (环境层路径 — replBridge.ts, ~2400 行):
  1. Environments API: 创建/轮询/分发工作
  2. WorkSecret: 解码 work_secret → session_id + JWT
  3. 注册 Worker: POST /worker/register → worker_epoch
  4. HybridTransport (WS 读 + POST 写)
  5. 完整生命周期: register → poll → ack → heartbeat → deregister

v2 (无环境层路径 — remoteBridgeCore.ts, ~1000 行):
  1. POST /v1/code/sessions           → session.id (cse_*)
  2. POST /v1/code/sessions/{id}/bridge → worker_jwt + epoch
     (每次 /bridge 调用都递增 epoch — 它就是 register)
  3. createV2ReplTransport            → SSE + CCRClient
  4. JWT 刷新调度器                    → 主动 /bridge 再调用
  5. 401 恢复                         → 获取新 JWT 重建传输
```

**10 步初始化流程** (bridge/remoteBridgeCore.ts:140-887):

```
initEnvLessBridgeCore()
  |
  1. POST /v1/code/sessions (OAuth)     → sessionId
  2. POST /bridge (OAuth)               → worker_jwt + expires_in + epoch
  3. createV2ReplTransport(jwt, epoch)  → SSETransport + CCRClient
  4. 初始化状态 (UUID 去重集合, FlushGate)
  5. 创建 JWT 刷新调度器
  6. wireTransportCallbacks()
  7. 注册传输重建逻辑 (主动刷新 + 401 恢复)
  8. 401 恢复逻辑
  9. 启动连接 + 历史刷新
 10. 返回 ReplBridgeHandle
```

### 5.4 worker_epoch 反重放机制

**epoch 是什么?**

每次调用 `POST /v1/code/sessions/{id}/bridge` 都会在服务端递增 epoch。
epoch 绑定到 worker JWT 中，CCRClient 的每次心跳和写操作都会带上此 epoch。

```
时间线:

  t0: /bridge → epoch=1, jwt_1
      CCRClient 使用 jwt_1, epoch=1

  t1: JWT 即将过期, 主动刷新
      /bridge → epoch=2, jwt_2

  t2: 旧传输 (epoch=1) 发送心跳
      → 服务器返回 409 (epoch 不匹配)
      → 旧传输关闭 (close code 4090)

  t3: 新传输 (epoch=2) 接管
      → SSE 从旧传输的序列号继续 (无消息丢失)
```

**防止双重 epoch 递增** (bridge/remoteBridgeCore.ts:333-340):

```typescript
// 笔记本唤醒: 过期的主动定时器 + SSE 401 几乎同时触发
// 在 /bridge 请求之前声明标志，这样另一个路径会完全跳过
// — 防止双重 epoch 递增 (每次 /bridge 调用都会递增;
//   如果两者都获取，第一次重建会得到过期的 epoch 并 409)
if (authRecoveryInFlight || tornDown) {
  return  // 跳过
}
authRecoveryInFlight = true
```

### 5.5 ReplBridgeTransport (bridge/replBridgeTransport.ts)

传输抽象层，统一了 v1 和 v2 两种传输协议:

```
ReplBridgeTransport 接口
========================

  write(message)        → 写入单条消息
  writeBatch(messages)  → 批量写入
  close()               → 关闭连接
  connect()             → 建立连接
  setOnData(cb)         → 设置数据回调
  setOnClose(cb)        → 设置关闭回调
  setOnConnect(cb)      → 设置连接成功回调
  getLastSequenceNum()  → SSE 序列号高水位 (v2) / 0 (v1)
  reportState(state)    → 报告状态 (v2) / no-op (v1)
  reportDelivery(id,s)  → 投递确认 (v2) / no-op (v1)
  flush()               → 排空写队列 (v2) / 立即完成 (v1)
```

**v1 适配器** (bridge/replBridgeTransport.ts:78-103):
```
HybridTransport (WS 读 + POST 写到 Session-Ingress)
  → 薄包装, 所有新特性为 no-op
```

**v2 适配器** (bridge/replBridgeTransport.ts:119-370):
```
SSETransport (读) + CCRClient (写到 CCR v2 /worker/*)
  → 完整特性: epoch 验证, 心跳, 投递追踪, 状态报告
  → 双重 ACK: received + processed 同时发送 (line 249-252)
    防止 daemon 重启时的幻影提示重放
```

**epoch 不匹配处理** (bridge/replBridgeTransport.ts:209-231):

```typescript
onEpochMismatch: () => {
  try {
    ccr.close()
    sse.close()
    onCloseCb?.(4090)  // 4090 = epoch 不匹配, 区别于 4091 = init 失败
  } catch (closeErr) {
    // 即使关闭失败也必须抛出
  }
  throw new Error('epoch superseded')
}
```

### 5.6 bridgeMessaging — 共享传输层帮助函数

**文件**: `bridge/bridgeMessaging.ts`

提取自 replBridge.ts，让 v1 和 v2 核心共用相同的入站解析、
控制请求处理和回声去重机制。

**消息路由** (bridge/bridgeMessaging.ts:132-208):

```
handleIngressMessage(data)
  |
  +--> isSDKControlResponse?
  |       → onPermissionResponse() (远程客户端回答了权限提示)
  |
  +--> isSDKControlRequest?
  |       → handleServerControlRequest()
  |         必须快速响应，否则服务器 10-14 秒后终止 WS
  |
  +--> isSDKMessage?
  |       +--> UUID in recentPostedUUIDs?  → 忽略回声
  |       +--> UUID in recentInboundUUIDs? → 忽略重放
  |       +--> type === 'user'
  |       |       → recentInboundUUIDs.add(uuid)
  |       |       → onInboundMessage()
  |       +--> 其他 type → 忽略
```

**服务端控制请求处理** (bridge/bridgeMessaging.ts:243-391):

| 子类型 | 动作 | 说明 |
|--------|------|------|
| initialize | 响应 pid + 空能力 | 必须成功，否则服务器终止 |
| set_model | 调用 onSetModel | 切换模型 |
| set_max_thinking_tokens | 调用回调 | 调整思考 token 上限 |
| set_permission_mode | 调用回调，返回 ok/error | 切换权限模式 |
| interrupt | 调用 onInterrupt | 中断当前请求 |
| unknown | 返回 error | 防止服务器挂起 |

**outboundOnly 模式** (bridge/bridgeMessaging.ts:231-283):

当 `outboundOnly=true` 时 (如 CCR Mirror)，所有可变请求返回错误:
```
"This session is outbound-only. Enable Remote Control locally to allow inbound control."
```
但 `initialize` 仍然返回成功 — 否则服务器会终止连接。

---

## 6. SDK 控制协议

### 6.1 控制消息类型

定义在 `entrypoints/sdk/controlSchemas.ts`:

```
消息类型层级:
=============

SDKControlRequest
  ├── type: 'control_request'
  ├── request_id: string (UUID)
  └── request: SDKControlRequestInner
       ├── subtype: 'can_use_tool'  (SDKControlPermissionRequest)
       │    ├── tool_name: string
       │    ├── tool_use_id: string
       │    └── input: Record<string, unknown>
       ├── subtype: 'initialize'
       ├── subtype: 'interrupt'
       ├── subtype: 'set_model'
       │    └── model: string | undefined
       ├── subtype: 'set_max_thinking_tokens'
       │    └── max_thinking_tokens: number | null
       └── subtype: 'set_permission_mode'
            └── mode: PermissionMode

SDKControlResponse
  ├── type: 'control_response'
  └── response:
       ├── subtype: 'success'
       │    ├── request_id: string
       │    └── response?: any
       └── subtype: 'error'
            ├── request_id: string
            └── error: string

SDKControlCancelRequest
  ├── type: 'control_cancel_request'
  └── request_id: string
```

### 6.2 权限请求/响应流程

```
远程容器 (Worker)                 本地 CLI (REPL)
    |                                   |
    | 需要使用工具 (如 Write)            |
    | control_request                   |
    |   subtype: 'can_use_tool'         |
    |   tool_name: 'Write'              |
    |   tool_use_id: 'tu_123'           |
    |---------------------------------->|
    |                                   | 显示权限提示
    |                                   | 用户审批/拒绝
    |   control_response                |
    |   subtype: 'success'              |
    |   response.behavior: 'allow'      |
    |<----------------------------------|
    |                                   |
    | 执行工具                           |
    |                                   |

  取消场景 (如用户超时):
    |   control_cancel_request          |
    |   request_id: '...'               |
    |---------------------------------->|
    |                                   | 移除待处理权限
    |                                   | onPermissionCancelled()
```

---

## 7. codeSessionApi — 会话 API 封装

**文件**: `bridge/codeSessionApi.ts`

独立的轻量文件，不引入 CLI 重依赖（analytics, transport），
可被 SDK `/bridge` 子路径单独打包。

**创建会话** (bridge/codeSessionApi.ts:26-80):

```
POST /v1/code/sessions
  Headers: Authorization: Bearer <OAuth>
  Body: { title, bridge: {} }
  Response: { session: { id: "cse_xxx" } }
```

注意 `bridge: {}` 是必须的 — 它是 oneof runner 的正信号。
省略或发送 `environment_id: ""` 现在会返回 400。

**获取桥接凭证** (bridge/codeSessionApi.ts:93-168):

```
POST /v1/code/sessions/{id}/bridge
  Headers: Authorization: Bearer <OAuth>
           X-Trusted-Device-Token: <optional>
  Response: {
    worker_jwt: string,     // 不透明 JWT — 不要解码
    api_base_url: string,
    expires_in: number,     // 秒
    worker_epoch: number    // protojson 可能是 string (int64)
  }
```

**亮点**: `worker_epoch` 的类型处理 (line 150-161)。protojson 将 int64
序列化为字符串以避免 JS 精度损失，Go 编码器可能返回 number。代码兼容两者:

```typescript
const rawEpoch = data.worker_epoch
const epoch = typeof rawEpoch === 'string' ? Number(rawEpoch) : rawEpoch
```

---

## 8. 消息排序与可靠性保证

### 8.1 序列号机制

v2 的 SSETransport 维护序列号高水位:

```
SSE 流:
  event_id: 1  → data: ...
  event_id: 2  → data: ...
  event_id: 3  → data: ...  ← lastSequenceNum = 3

传输重建时:
  新 SSETransport(initialSequenceNum = 3)
  → 发送 from_sequence_num=3 / Last-Event-ID=3
  → 服务器从 seq 4 开始重放
```

### 8.2 历史刷新排序

```
时间线:

  t0: FlushGate.start()
  t1: 用户发送消息 M1 → FlushGate.enqueue(M1) → 排队
  t2: flushHistory([H1,H2,H3]) → POST 到服务器
  t3: 用户发送消息 M2 → FlushGate.enqueue(M2) → 排队
  t4: flushHistory 完成 → FlushGate.end() → 返回 [M1, M2]
  t5: drainFlushGate() → 发送 [M1, M2]

  服务器收到顺序: H1, H2, H3, M1, M2  ✓ 有序
```

### 8.3 写入期间的 401 恢复

```
FlushGate 在 rebuildTransport 中的关键作用:

  rebuildTransport(fresh_creds):
    flushGate.start()           ← 开始排队新写入
    seq = transport.getLastSequenceNum()
    transport.close()            ← 旧传输关闭
    transport = new V2Transport(...)  ← 新传输创建
    wireTransportCallbacks()
    transport.connect()
    drainFlushGate()             ← 排空到新传输
    |
    finally:
      flushGate.drop()           ← 失败路径: 丢弃
```

---

## 9. 安全考量

### 9.1 认证层级

```
  OAuth Token (用户级)
    → 用于创建会话和获取 /bridge 凭证
    → 生存时间 ~4 小时

  Worker JWT (会话级)
    → 由 /bridge 端点签发
    → 绑定 session_id 和 worker role
    → 生存时间由 expires_in 指定
    → 5 分钟前主动刷新

  Bearer Token (Direct Connect)
    → 用户自行管理
    → 用于自部署服务器
```

### 9.2 防重放

- **epoch**: 每次 /bridge 调用递增，旧 epoch 的请求被 409 拒绝
- **UUID 去重**: BoundedUUIDSet 环形缓冲区防止消息重复处理
- **序列号**: SSE 序列号防止历史回放后的重复消息
- **authRecoveryInFlight**: 原子标志防止并发 /bridge 调用导致双重 epoch 递增

### 9.3 令牌隔离

v2 传输使用 per-instance 闭包提供 auth token:

```typescript
// 保持 worker JWT 不进入 process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN
// 该环境变量会被 mcp/client.ts 无门控地读取并发送到
// 用户配置的 ws/http MCP 服务器
getAuthToken: () => credentials.worker_jwt
```

---

## 10. 亮点发现

### 发现 1: Compaction 期间的瞬态 4001

`SessionsWebSocket.ts:255-272` 中的特殊处理揭示了一个有趣的边缘情况:
在 compaction（对话压缩）期间，服务器可能短暂认为会话已过期，因为 CLI
worker 正忙于 compaction API 调用而没有发送事件。代码对此设置了独立的重试
预算（最多 3 次），带递增延迟。

### 发现 2: 睡眠唤醒竞态

`remoteBridgeCore.ts:333-340` 的注释揭示了笔记本睡眠/唤醒是远程控制的
主要敌人。过期的主动刷新定时器和 SSE 401 几乎同时触发，必须用
`authRecoveryInFlight` 原子标志序列化，否则会导致双重 epoch 递增。

### 发现 3: 双重 ACK 防幻影重放

`replBridgeTransport.ts:249-252` 中 SSE 事件同时发送 `received` 和
`processed` ACK。注释解释这是为了防止 daemon 重启时的 N 个幻影提示
重放（观测到 21→24→25 个幻影 "user sent a new message" 系统提醒）。

### 发现 4: outboundOnly 模式的双面性

`outboundOnly` 模式允许 bridge 只向服务器推送事件（CCR Mirror），
但 `initialize` 控制请求必须返回成功。这意味着即使是"只写"连接也需要
维护最低限度的读取能力来响应服务器握手。

### 发现 5: protojson int64 兼容处理

`codeSessionApi.ts:150-161` 展示了 Go 服务端和 JS 客户端之间的一个
微妙的互操作问题: protobuf JSON 编码将 int64 序列化为字符串（因为
JavaScript Number 类型无法安全表示所有 int64 值），但 Go 编码器设置
不同时可能返回 number。客户端必须兼容两种格式。

---

## 11. 文件索引

| 文件 | 行数 | 核心职责 |
|------|------|----------|
| `remote/RemoteSessionManager.ts` | 343 | CCR 远程会话门面 |
| `remote/SessionsWebSocket.ts` | 404 | WebSocket 连接管理 |
| `remote/sdkMessageAdapter.ts` | 303 | SDK→REPL 消息转换 |
| `remote/remotePermissionBridge.ts` | 79 | 远程权限合成 |
| `server/createDirectConnectSession.ts` | 89 | 直连会话创建 |
| `server/directConnectManager.ts` | 213 | 直连 WebSocket 管理 |
| `server/types.ts` | 57 | 服务器类型定义 |
| `bridge/flushGate.ts` | 71 | 历史刷新排序门控 |
| `bridge/remoteBridgeCore.ts` | 1009 | v2 无环境层桥接核心 |
| `bridge/bridgeMessaging.ts` | 461 | 共享消息处理 |
| `bridge/replBridgeTransport.ts` | 370 | v1/v2 传输抽象 |
| `bridge/codeSessionApi.ts` | 168 | 会话 API 轻量封装 |
| `bridge/bridgeMain.ts` | ~800+ | 主桥接循环 (daemon) |

---

## 12. 总结

上游工具的远程控制系统是一个复杂但精心设计的分布式架构。三种模式
（CCR、Bridge、Direct Connect）共享统一的控制协议（SDKControlRequest/
Response），但在传输层各有特色。v2 桥接核心通过消除 Environments API
层显著降低了延迟和复杂度，同时引入了 epoch 机制和 FlushGate 来保证
消息的严格排序。UUID 去重、序列号追踪、JWT 主动刷新等机制共同构成了
一个高可靠的实时通信基础设施。
