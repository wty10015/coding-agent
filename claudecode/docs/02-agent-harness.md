# 02 - Agent Harness: 查询循环与工具执行系统

> 源码路径: `src/` (基于 `sourcecode/src/`)

---

## 目录

1. [架构总览](#1-架构总览)
2. [QueryEngine — 会话生命周期管理](#2-queryengine--会话生命周期管理)
3. [query() — 核心查询循环](#3-query--核心查询循环)
4. [API 调用与流式处理](#4-api-调用与流式处理)
5. [StreamingToolExecutor — 流式工具执行器](#5-streamingtoolexecutor--流式工具执行器)
6. [toolOrchestration — 工具编排引擎](#6-toolorchestration--工具编排引擎)
7. [toolExecution — 单工具执行管线](#7-toolexecution--单工具执行管线)
8. [权限检查流程](#8-权限检查流程)
9. [Task 抽象与任务系统](#9-task-抽象与任务系统)
10. [Coordinator 模式 — 多智能体协调](#10-coordinator-模式--多智能体协调)
11. [错误处理与安全默认值](#11-错误处理与安全默认值)
12. [上下文管理与自动压缩](#12-上下文管理与自动压缩)
13. [亮点发现](#13-亮点发现)

---

## 1. 架构总览

上游工具的 Agent Harness 是一个围绕 "查询循环" (Query Loop) 构建的自主执行框架。
其核心思想是: **用户提交一条消息 -> 调用 Claude API -> 模型返回文本 + 工具调用 ->
执行工具 -> 将结果拼回消息列表 -> 继续调用 API, 直到模型不再请求工具为止。**

```
+-------------------------------------------------------------------+
|                     QueryEngine (会话层)                            |
|  +-----------+    +-------+    +-----------+    +----------+       |
|  | 用户输入   |--->| query |<-->| Claude API|--->| 工具执行  |       |
|  +-----------+    | 循环   |    | (stream)  |    | 引擎      |       |
|                   +---+---+    +-----------+    +-----+----+       |
|                       |                               |            |
|                       |  messages[]                    |            |
|                       +<------------------------------+            |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | Auto-Compact     |  | Context Collapse |  | Token Budget     |  |
|  +------------------+  +------------------+  +------------------+  |
+-------------------------------------------------------------------+
```

### 关键文件映射

| 职责 | 文件路径 |
|------|----------|
| 会话引擎 | `QueryEngine.ts` |
| 查询循环 | `query.ts` |
| API 交互 | `services/api/claude.ts` |
| 流式工具执行 | `services/tools/StreamingToolExecutor.ts` |
| 工具编排 | `services/tools/toolOrchestration.ts` |
| 单工具执行 | `services/tools/toolExecution.ts` |
| 工具钩子 | `services/tools/toolHooks.ts` |
| 任务抽象 | `Task.ts`, `tasks.ts` |
| 协调器 | `coordinator/coordinatorMode.ts` |

---

## 2. QueryEngine -- 会话生命周期管理

**文件**: `QueryEngine.ts`

`QueryEngine` 是整个对话会话的所有者。每个 `QueryEngine` 实例维护一个完整的对话状态,
包括消息历史、文件缓存、用量统计等。

### 2.1 类定义

```typescript
// QueryEngine.ts:184
export class QueryEngine {
  private config: QueryEngineConfig
  private mutableMessages: Message[]
  private abortController: AbortController
  private permissionDenials: SDKPermissionDenial[]
  private totalUsage: NonNullableUsage
  private readFileState: FileStateCache
  private discoveredSkillNames = new Set<string>()
  private loadedNestedMemoryPaths = new Set<string>()
}
```

### 2.2 配置结构

```typescript
// QueryEngine.ts:130-173
export type QueryEngineConfig = {
  cwd: string
  tools: Tools
  commands: Command[]
  mcpClients: MCPServerConnection[]
  agents: AgentDefinition[]
  canUseTool: CanUseToolFn
  getAppState: () => AppState
  setAppState: (f: (prev: AppState) => AppState) => void
  initialMessages?: Message[]
  readFileCache: FileStateCache
  customSystemPrompt?: string
  appendSystemPrompt?: string
  maxTurns?: number
  maxBudgetUsd?: number
  taskBudget?: { total: number }
  jsonSchema?: Record<string, unknown>
  // ...更多可选配置
}
```

### 2.3 submitMessage — 提交消息入口

`submitMessage` 是 SDK 和无头模式 (Headless) 的主入口。它:

1. 清空本轮的 skill 发现集合
2. 设置当前工作目录
3. 构建系统提示 (调用 `fetchSystemPromptParts`)
4. 包装 `canUseTool` 以追踪权限拒绝
5. 处理用户输入 (`processUserInput`)
6. 调用 `query()` 进入核心查询循环
7. 将每个流事件映射为 SDK 消息输出

```typescript
// QueryEngine.ts:209-212
async *submitMessage(
  prompt: string | ContentBlockParam[],
  options?: { uuid?: string; isMeta?: boolean },
): AsyncGenerator<SDKMessage, void, unknown> {
```

关键: `submitMessage` 是一个 `AsyncGenerator`, 它会逐步 `yield` 消息,
让调用方可以流式消费模型的输出。

---

## 3. query() -- 核心查询循环

**文件**: `query.ts`

`query()` 是查询循环的核心函数。它调用模型、接收流式输出、
执行工具、追加结果、再次调用模型, 直到模型停止请求工具。

### 3.1 查询参数

```typescript
// query.ts:181-199
export type QueryParams = {
  messages: Message[]
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  canUseTool: CanUseToolFn
  toolUseContext: ToolUseContext
  fallbackModel?: string
  querySource: QuerySource
  maxOutputTokensOverride?: number
  maxTurns?: number
  taskBudget?: { total: number }
  deps?: QueryDeps
}
```

### 3.2 循环状态

```typescript
// query.ts:204-217
type State = {
  messages: Message[]
  toolUseContext: ToolUseContext
  autoCompactTracking: AutoCompactTrackingState | undefined
  maxOutputTokensRecoveryCount: number
  hasAttemptedReactiveCompact: boolean
  maxOutputTokensOverride: number | undefined
  pendingToolUseSummary: Promise<ToolUseSummaryMessage | null> | undefined
  stopHookActive: boolean | undefined
  turnCount: number
  transition: Continue | undefined
}
```

### 3.3 查询循环流程图

```
 queryLoop() 入口
       |
       v
 +---> while (true) {
 |         |
 |         v
 |     1. 解构 State
 |         |
 |         v
 |     2. 技能发现预取 (skillPrefetch)
 |         |
 |         v
 |     3. yield { type: 'stream_request_start' }
 |         |
 |         v
 |     4. 初始化/递增 queryTracking (chainId + depth)
 |         |
 |         v
 |     5. 获取 compactBoundary 后的消息
 |         |
 |         v
 |     6. 应用工具结果预算 (applyToolResultBudget)
 |         |
 |         v
 |     7. 应用 Snip 压缩 (如果启用)
 |         |
 |         v
 |     8. 应用微压缩 (microcompact)
 |         |
 |         v
 |     9. 应用上下文折叠 (contextCollapse, 如果启用)
 |         |
 |         v
 |    10. 构建完整系统提示
 |         |
 |         v
 |    11. 自动压缩检查 (autocompact)
 |         |
 |         v
 |    12. 创建 StreamingToolExecutor
 |         |
 |         v
 |    13. 调用 Claude API (deps.callModel)
 |         |
 |         v
 |    14. 流式处理每个 message:
 |         |  - assistant 消息: yield + 收集 toolUseBlocks
 |         |  - 工具调用: addTool 到 StreamingToolExecutor
 |         |  - 实时获取已完成的工具结果
 |         |
 |         v
 |    15. 流结束后: 收集剩余工具结果 (getRemainingResults)
 |         |
 |         v
 |    16. 检查是否需要继续 (needsFollowUp?)
 |         |
 |         +-- 是: 合并工具结果到 messages, 继续循环
 |         |
 +------<--+-- 否: 执行 stopHooks, return Terminal
 |
 v
 完成
```

### 3.4 流式工具执行的嵌入

在 `query.ts:561-568` 中, 查询循环会在每轮迭代开始时创建 `StreamingToolExecutor`:

```typescript
// query.ts:561-568
const useStreamingToolExecution = config.gates.streamingToolExecution
let streamingToolExecutor = useStreamingToolExecution
  ? new StreamingToolExecutor(
      toolUseContext.options.tools,
      canUseTool,
      toolUseContext,
    )
  : null
```

然后在流式接收 API 响应时, 每当收到一个 `tool_use` 块, 就立即将其加入执行器:

```typescript
// query.ts:840-844
if (streamingToolExecutor && !toolUseContext.abortController.signal.aborted) {
  for (const toolBlock of msgToolUseBlocks) {
    streamingToolExecutor.addTool(toolBlock, message)
  }
}
```

并在流的每次迭代中检查已完成结果:

```typescript
// query.ts:849-862
if (streamingToolExecutor && !toolUseContext.abortController.signal.aborted) {
  for (const result of streamingToolExecutor.getCompletedResults()) {
    if (result.message) {
      yield result.message
      toolResults.push(...)
    }
  }
}
```

这意味着 **工具执行与 API 流式输出是并行的**, 模型还在生成后续文本时,
前面的工具已经开始执行了。

### 3.5 MAX_OUTPUT_TOKENS 恢复

```typescript
// query.ts:164
const MAX_OUTPUT_TOKENS_RECOVERY_LIMIT = 3
```

当模型因 `max_output_tokens` 停止时, 循环不会立即终止, 而是尝试最多 3 次恢复,
将截断的 assistant 消息追回到上下文中, 让模型继续生成。

---

## 4. API 调用与流式处理

**文件**: `services/api/claude.ts`

### 4.1 核心流式调用

`claude.ts` 负责将 上游工具的内部消息格式转换为 Anthropic API 格式, 并管理:

- **模型选择**: 支持 Opus/Sonnet/Haiku 及自定义模型
- **Beta 头管理**: 动态计算需要的 beta 功能头 (缓存、思考、努力度等)
- **工具 Schema 构建**: 将 `Tool` 定义转换为 API 工具 schema
- **流式响应解析**: 将 `BetaRawMessageStreamEvent` 转换为内部 `Message` 类型
- **Prompt 缓存**: 实现全局和会话级缓存策略

### 4.2 工具 Schema 传递

`claude.ts` 中的关键函数 `toolToAPISchema` (在 `utils/api.ts` 中定义) 将
每个 Tool 对象转为 API 需要的 `BetaToolUnion` 格式:

```typescript
// utils/api.ts (引用)
export function toolToAPISchema(tool: Tool): BetaToolUnion {
  // 包括: name, description, input_schema
  // 对于延迟加载工具, 设置 defer_loading: true
}
```

### 4.3 延迟工具加载 (Tool Search)

当工具数量超过阈值时, 上游工具使用 `ToolSearch` 机制:

1. 大部分工具以 `defer_loading: true` 发送 (只含名称和描述, 不含完整 schema)
2. 模型需要先调用 `ToolSearch` 工具来 "发现" 需要的工具
3. 发现后, 下一轮 API 调用会包含完整 schema

```typescript
// services/tools/toolExecution.ts:578-596
export function buildSchemaNotSentHint(
  tool: Tool,
  messages: Message[],
  tools: readonly { name: string }[],
): string | null {
  if (!isToolSearchEnabledOptimistic()) return null
  if (!isToolSearchToolAvailable(tools)) return null
  if (!isDeferredTool(tool)) return null
  const discovered = extractDiscoveredToolNames(messages)
  if (discovered.has(tool.name)) return null
  return `This tool's schema was not sent to the API...`
}
```

### 4.4 Fallback 模型机制

当主模型调用失败时, 系统支持回退到备用模型:

```typescript
// query.ts:650-655
let attemptWithFallback = true
while (attemptWithFallback) {
  attemptWithFallback = false
  try {
    // ... 调用模型
  } catch (innerError) {
    if (innerError instanceof FallbackTriggeredError && fallbackModel) {
      currentModel = fallbackModel
      attemptWithFallback = true
    }
  }
}
```

---

## 5. StreamingToolExecutor -- 流式工具执行器

**文件**: `services/tools/StreamingToolExecutor.ts`

`StreamingToolExecutor` 负责并发工具执行。它在 API 流式输出的同时,
动态调度工具执行。

### 5.1 工具状态机

```typescript
// StreamingToolExecutor.ts:19
type ToolStatus = 'queued' | 'executing' | 'completed' | 'yielded'
```

```
                     addTool()
                        |
                        v
                    +--------+
                    | queued |
                    +---+----+
                        |
              canExecuteTool()?
                   /          \
                  是            否 (等待)
                 /                \
                v                  |
          +-----------+            |
          | executing |            |
          +-----+-----+           |
                |                  |
          tool.call()完成          |
                |                  |
                v                  |
          +-----------+            |
          | completed |<-----------+
          +-----+-----+
                |
       getCompletedResults()
                |
                v
          +---------+
          | yielded |
          +---------+
```

### 5.2 并发控制逻辑

```typescript
// StreamingToolExecutor.ts:129-135
private canExecuteTool(isConcurrencySafe: boolean): boolean {
  const executingTools = this.tools.filter(t => t.status === 'executing')
  return (
    executingTools.length === 0 ||
    (isConcurrencySafe && executingTools.every(t => t.isConcurrencySafe))
  )
}
```

**规则**:
- 如果没有工具在执行, 任何工具都可以开始
- 如果当前有工具在执行:
  - 新工具必须是 `isConcurrencySafe`
  - 所有正在执行的工具也必须是 `isConcurrencySafe`
- 非并发安全的工具必须独占执行

### 5.3 兄弟错误级联

当一个 Bash 工具出错时, 会取消其兄弟工具:

```typescript
// StreamingToolExecutor.ts:359-363
if (tool.block.name === BASH_TOOL_NAME) {
  this.hasErrored = true
  this.erroredToolDescription = this.getToolDescription(tool)
  this.siblingAbortController.abort('sibling_error')
}
```

注意: **只有 Bash 工具的错误会级联取消**。Read/WebFetch 等独立工具的错误不会影响
其他并行工具, 因为它们通常没有隐式依赖关系。

### 5.4 中断行为

```typescript
// StreamingToolExecutor.ts:416-417
interruptBehavior?(): 'cancel' | 'block'
```

当用户在工具执行期间提交新消息时:
- `cancel`: 停止工具并丢弃结果
- `block`: 继续执行, 新消息等待

```typescript
// StreamingToolExecutor.ts:254-260
private updateInterruptibleState(): void {
  const executing = this.tools.filter(t => t.status === 'executing')
  this.toolUseContext.setHasInterruptibleToolInProgress?.(
    executing.length > 0 &&
      executing.every(t => this.getToolInterruptBehavior(t) === 'cancel'),
  )
}
```

---

## 6. toolOrchestration -- 工具编排引擎

**文件**: `services/tools/toolOrchestration.ts`

这是流式执行之外的第二套工具编排路径, 用于非流式场景或备用路径。

### 6.1 工具分区策略

```typescript
// toolOrchestration.ts:91-116
function partitionToolCalls(
  toolUseMessages: ToolUseBlock[],
  toolUseContext: ToolUseContext,
): Batch[] {
  return toolUseMessages.reduce((acc: Batch[], toolUse) => {
    const isConcurrencySafe = ...
    if (isConcurrencySafe && acc[acc.length - 1]?.isConcurrencySafe) {
      acc[acc.length - 1]!.blocks.push(toolUse)  // 合并到当前批次
    } else {
      acc.push({ isConcurrencySafe, blocks: [toolUse] })  // 新批次
    }
    return acc
  }, [])
}
```

```
工具序列: [Read, Grep, Edit, Read, Read, Write]
          ^并发  ^并发  ^串行  ^并发  ^并发  ^串行

分区结果:
  批次1 (并发): [Read, Grep]
  批次2 (串行): [Edit]
  批次3 (并发): [Read, Read]
  批次4 (串行): [Write]
```

### 6.2 并发执行限制

```typescript
// toolOrchestration.ts:8-12
function getMaxToolUseConcurrency(): number {
  return (
    parseInt(process.env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY || '', 10) || 10
  )
}
```

默认最多 10 个工具并行执行, 可通过环境变量 `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` 调整。

---

## 7. toolExecution -- 单工具执行管线

**文件**: `services/tools/toolExecution.ts`

这是每个工具调用的完整执行管线, 从输入验证到权限检查再到实际执行。

### 7.1 runToolUse -- 入口函数

```typescript
// toolExecution.ts:337-341
export async function* runToolUse(
  toolUse: ToolUseBlock,
  assistantMessage: AssistantMessage,
  canUseTool: CanUseToolFn,
  toolUseContext: ToolUseContext,
): AsyncGenerator<MessageUpdateLazy, void> {
```

### 7.2 执行管线流程

```
 runToolUse()
     |
     v
 1. 查找工具定义 (findToolByName)
     |  - 先查 options.tools
     |  - 后查 getAllBaseTools() (兼容已废弃别名)
     |
     v
 2. 检查中止信号 (abortController.signal.aborted)
     |
     v
 3. streamedCheckPermissionsAndCallTool()
     |
     v
 4. checkPermissionsAndCallTool()
     |
     +----> 4a. Zod schema 验证 (inputSchema.safeParse)
     |       |-- 失败: 返回 InputValidationError
     |       |-- 包含 schemaNotSentHint 提示
     |
     +----> 4b. 工具自定义验证 (tool.validateInput)
     |       |-- 失败: 返回验证错误
     |
     +----> 4c. 推测性分类器启动 (Bash 工具)
     |       |-- startSpeculativeClassifierCheck()
     |
     +----> 4d. 输入回填 (backfillObservableInput)
     |       |-- 在克隆上操作, 不影响原始输入
     |
     +----> 4e. PreToolUse 钩子执行
     |       |-- 可能: 修改输入、阻止执行、注入权限决定
     |
     +----> 4f. 权限检查 (resolveHookPermissionDecision)
     |       |-- allow: 继续
     |       |-- deny: 返回错误消息
     |       |-- ask: 弹出用户确认
     |
     +----> 4g. 实际调用 tool.call()
     |       |-- 传入已处理的输入
     |       |-- 捕获进度事件
     |
     +----> 4h. 结果映射 (mapToolResultToToolResultBlockParam)
     |
     +----> 4i. 结果大小检查 (超过 maxResultSizeChars 持久化到磁盘)
     |
     +----> 4j. PostToolUse 钩子执行
     |
     v
 5. yield 结果消息
```

### 7.3 进度报告机制

工具执行支持通过 `Stream` 类将进度事件和最终结果合并到单一异步可迭代:

```typescript
// toolExecution.ts:503-570
function streamedCheckPermissionsAndCallTool(...): AsyncIterable<MessageUpdateLazy> {
  const stream = new Stream<MessageUpdateLazy>()
  checkPermissionsAndCallTool(
    ...args,
    progress => {
      stream.enqueue({
        message: createProgressMessage({
          toolUseID: progress.toolUseID,
          data: progress.data,
        }),
      })
    },
  )
    .then(results => { for (const r of results) stream.enqueue(r) })
    .catch(error => { stream.error(error) })
    .finally(() => { stream.done() })
  return stream
}
```

### 7.4 错误分类

```typescript
// toolExecution.ts:150-171
export function classifyToolError(error: unknown): string {
  if (error instanceof TelemetrySafeError) {
    return error.telemetryMessage.slice(0, 200)
  }
  if (error instanceof Error) {
    const errnoCode = getErrnoCode(error)
    if (typeof errnoCode === 'string') {
      return `Error:${errnoCode}`
    }
    if (error.name && error.name !== 'Error' && error.name.length > 3) {
      return error.name.slice(0, 60)
    }
    return 'Error'
  }
  return 'UnknownError'
}
```

由于生产构建中构造函数名称被缩小, 不能依赖 `error.constructor.name`,
因此此函数使用结构化的方式提取有意义的错误信息。

---

## 8. 权限检查流程

### 8.1 权限模式

```typescript
// types/permissions.ts (引用)
export type PermissionMode = 'default' | 'auto' | 'plan'
```

- **default**: 默认模式, 危险操作需要用户确认
- **auto**: 自动模式, 使用分类器判断是否允许
- **plan**: 计划模式, 只允许只读操作

### 8.2 权限决定来源

```typescript
// toolExecution.ts:207-250
function decisionReasonToOTelSource(
  reason: PermissionDecisionReason | undefined,
  behavior: 'allow' | 'deny',
): string {
  switch (reason.type) {
    case 'permissionPromptTool': // SDK 宿主决定
    case 'rule':                 // 规则匹配
    case 'hook':                 // 钩子决定
    case 'mode':                 // 权限模式
    case 'classifier':           // 分类器
    case 'subcommandResults':    // 子命令结果
    case 'asyncAgent':           // 异步代理
    case 'sandboxOverride':      // 沙箱覆盖
    case 'workingDir':           // 工作目录限制
    case 'safetyCheck':          // 安全检查
    case 'other':                // 其他
  }
}
```

### 8.3 推测性分类器

对于 Bash 工具, 系统会提前启动一个推测性分类器检查, 与 PreToolUse 钩子并行运行:

```typescript
// toolExecution.ts:740-752
if (tool.name === BASH_TOOL_NAME && parsedInput.data && 'command' in parsedInput.data) {
  const appState = toolUseContext.getAppState()
  startSpeculativeClassifierCheck(
    (parsedInput.data as BashToolInput).command,
    appState.toolPermissionContext,
    toolUseContext.abortController.signal,
    toolUseContext.options.isNonInteractiveSession,
  )
}
```

这样当权限检查返回 `ask` 时, 分类器结果可能已经就绪, 减少用户等待时间。

---

## 9. Task 抽象与任务系统

**文件**: `Task.ts`, `tasks.ts`

### 9.1 任务类型

```typescript
// Task.ts:6-13
export type TaskType =
  | 'local_bash'
  | 'local_agent'
  | 'remote_agent'
  | 'in_process_teammate'
  | 'local_workflow'
  | 'monitor_mcp'
  | 'dream'
```

### 9.2 任务状态机

```typescript
// Task.ts:15-20
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'killed'
```

```
  pending ---> running ---> completed
                  |
                  +-------> failed
                  |
                  +-------> killed
```

### 9.3 终态检查

```typescript
// Task.ts:27-29
export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'killed'
}
```

此函数用于: 防止向已死的 teammate 注入消息、从 AppState 驱逐已完成的任务、
清理孤儿任务。

### 9.4 任务 ID 生成

```typescript
// Task.ts:79-106
const TASK_ID_PREFIXES: Record<string, string> = {
  local_bash: 'b',
  local_agent: 'a',
  remote_agent: 'r',
  in_process_teammate: 't',
  local_workflow: 'w',
  monitor_mcp: 'm',
  dream: 'd',
}

export function generateTaskId(type: TaskType): string {
  const prefix = getTaskIdPrefix(type)
  const bytes = randomBytes(8)
  // 36^8 约 2.8 万亿种组合, 足以抵抗暴力符号链接攻击
  let id = prefix
  for (let i = 0; i < 8; i++) {
    id += TASK_ID_ALPHABET[bytes[i]! % TASK_ID_ALPHABET.length]
  }
  return id
}
```

### 9.5 任务注册表

```typescript
// tasks.ts:22-32
export function getAllTasks(): Task[] {
  const tasks: Task[] = [
    LocalShellTask,
    LocalAgentTask,
    RemoteAgentTask,
    DreamTask,
  ]
  if (LocalWorkflowTask) tasks.push(LocalWorkflowTask)
  if (MonitorMcpTask) tasks.push(MonitorMcpTask)
  return tasks
}
```

---

## 10. Coordinator 模式 -- 多智能体协调

**文件**: `coordinator/coordinatorMode.ts`

Coordinator 模式是上游工具的多智能体协调系统。启用后,
主线程变成一个 "协调器", 只使用 `AgentTool`、`TaskStopTool`、
`SendMessageTool` 来管理工作者。

### 10.1 模式检测

```typescript
// coordinatorMode.ts:36-41
export function isCoordinatorMode(): boolean {
  if (feature('COORDINATOR_MODE')) {
    return isEnvTruthy(process.env.CLAUDE_CODE_COORDINATOR_MODE)
  }
  return false
}
```

### 10.2 协调器允许的工具

```typescript
// constants/tools.ts:107-112
export const COORDINATOR_MODE_ALLOWED_TOOLS = new Set([
  AGENT_TOOL_NAME,
  TASK_STOP_TOOL_NAME,
  SEND_MESSAGE_TOOL_NAME,
  SYNTHETIC_OUTPUT_TOOL_NAME,
])
```

### 10.3 Worker 工具上下文

```typescript
// coordinatorMode.ts:80-109
export function getCoordinatorUserContext(
  mcpClients: ReadonlyArray<{ name: string }>,
  scratchpadDir?: string,
): { [k: string]: string } {
  // 构建一个描述 worker 可用工具的上下文
  // 告诉协调器: worker 有哪些工具、哪些 MCP 服务器、Scratchpad 路径等
}
```

### 10.4 协调器的系统提示

```typescript
// coordinatorMode.ts:111-368
export function getCoordinatorSystemPrompt(): string {
  // 一个非常详细的协调器角色定义, 包含:
  // 1. 角色: 你是协调器, 不是执行者
  // 2. 工具: AgentTool, SendMessageTool, TaskStopTool
  // 3. Worker 管理: 并发、故障处理、停止策略
  // 4. 工作流: Research -> Synthesis -> Implementation -> Verification
  // 5. Worker 提示撰写指南
  // 6. 完整示例会话
}
```

### 10.5 Coordinator 架构图

```
                         +-----------------+
                         |   用户 (User)    |
                         +--------+--------+
                                  |
                                  v
                         +-----------------+
                         |  Coordinator    |
                         |  (主线程)        |
                         |  工具: Agent,   |
                         |  SendMessage,   |
                         |  TaskStop       |
                         +--------+--------+
                                  |
                 +----------------+----------------+
                 |                |                |
                 v                v                v
          +-----------+   +-----------+   +-----------+
          | Worker A  |   | Worker B  |   | Worker C  |
          | (研究)     |   | (实现)     |   | (验证)    |
          | Bash,Edit |   | Bash,Edit |   | Bash,Read |
          | Read,Grep |   | Read,Grep |   | Grep,Test |
          +-----------+   +-----------+   +-----------+
```

---

## 11. 错误处理与安全默认值

### 11.1 Fail-Closed 哲学

上游工具的工具系统采用 "失败时关闭" (fail-closed) 的安全策略:

```typescript
// Tool.ts:757-769
const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: (_input?: unknown) => false,      // 假设不安全
  isReadOnly: (_input?: unknown) => false,               // 假设写操作
  isDestructive: (_input?: unknown) => false,
  checkPermissions: (...) => Promise.resolve({
    behavior: 'allow', updatedInput: input               // 委托给通用权限系统
  }),
  toAutoClassifierInput: (_input?: unknown) => '',       // 跳过分类器
  userFacingName: (_input?: unknown) => '',
}
```

关键决策:
- `isConcurrencySafe` 默认 `false` — 不确定时假设不安全, 串行执行
- `isReadOnly` 默认 `false` — 不确定时假设有写操作, 需要权限检查
- `checkPermissions` 默认 `allow` — 委托给通用权限系统, 而非工具自行判断

### 11.2 子命令安全上限

```typescript
// bashPermissions.ts:103
export const MAX_SUBCOMMANDS_FOR_SECURITY_CHECK = 50
```

对于复杂的复合命令, `splitCommand` 可能产生大量子命令。超过 50 个时直接回退到
`ask` (提示用户确认), 因为无法证明安全性。

### 11.3 中止级联控制

```typescript
// StreamingToolExecutor.ts:46-48
// 子级控制器, Bash 错误时触发。
// 中止子级不会中止父级 -- query.ts 不会结束当前轮次。
private siblingAbortController: AbortController
```

```
toolUseContext.abortController (父级)
        |
        +-- siblingAbortController (兄弟级)
                |
                +-- toolAbortController (每工具)
                +-- toolAbortController (每工具)
                +-- toolAbortController (每工具)
```

### 11.4 Streaming Fallback

当 API 流式传输失败并触发 fallback 时:

```typescript
// query.ts:713-740
if (streamingFallbackOccured) {
  // 为孤儿消息生成墓碑 (tombstone)
  for (const msg of assistantMessages) {
    yield { type: 'tombstone' as const, message: msg }
  }
  // 清空所有状态
  assistantMessages.length = 0
  toolResults.length = 0
  toolUseBlocks.length = 0
  needsFollowUp = false
  // 丢弃待处理的工具结果, 创建新执行器
  if (streamingToolExecutor) {
    streamingToolExecutor.discard()
    streamingToolExecutor = new StreamingToolExecutor(...)
  }
}
```

---

## 12. 上下文管理与自动压缩

### 12.1 压缩管线

查询循环在每次迭代中按顺序应用多种上下文管理策略:

```
原始消息
    |
    v
applyToolResultBudget()  -- 大工具结果持久化到磁盘
    |
    v
snipCompactIfNeeded()    -- Snip 压缩 (如果启用)
    |
    v
microcompact()           -- 微压缩 (移除低价值内容)
    |
    v
contextCollapse()        -- 上下文折叠 (如果启用)
    |
    v
autocompact()            -- 自动压缩 (完整历史摘要)
    |
    v
发送给 API
```

### 12.2 Token 预算

```typescript
// query.ts:280
const budgetTracker = feature('TOKEN_BUDGET') ? createBudgetTracker() : null
```

当用户指定 token 预算 (如 "+500k") 时, 系统会自动继续模型输出直到达到预算。

### 12.3 Task Budget

```typescript
// query.ts:193-197
taskBudget?: { total: number }
```

`task_budget` 是 API 级别的预算, 跨越压缩边界追踪。每次压缩后重新计算剩余预算:

```typescript
// query.ts:508-515
if (params.taskBudget) {
  const preCompactContext = finalContextTokensFromLastResponse(messagesForQuery)
  taskBudgetRemaining = Math.max(
    0,
    (taskBudgetRemaining ?? params.taskBudget.total) - preCompactContext,
  )
}
```

---

## 13. 亮点发现

### 发现 1: 流式工具执行与 API 流并行

上游工具不会等到模型完成输出才开始执行工具。当模型流式输出 `tool_use` 块时,
`StreamingToolExecutor` 会立即开始执行该工具。这意味着模型还在生成第二个工具调用时,
第一个工具可能已经完成执行。这大幅降低了多工具调用的端到端延迟。

**代码位置**: `query.ts:840-862`, `StreamingToolExecutor.ts:76-124`

### 发现 2: 只有 Bash 错误会级联取消

在并行工具执行中, 只有 Bash 工具的错误会触发兄弟工具取消。这是因为 Bash 命令
经常有隐式依赖链 (如 `mkdir` 失败后续命令无意义), 而 Read/Grep/WebFetch 等
工具是独立的, 一个失败不应影响其他工具。

**代码位置**: `StreamingToolExecutor.ts:354-363`

### 发现 3: isConcurrencySafe 的 Fail-Closed 设计

当无法解析工具输入 (Zod 验证失败) 或 `isConcurrencySafe` 抛出异常时,
系统假设工具不安全, 回退到串行执行。这是经典的 fail-closed 安全模式:

```typescript
// StreamingToolExecutor.ts:105-113
const isConcurrencySafe = parsedInput?.success
  ? (() => {
      try {
        return Boolean(toolDefinition.isConcurrencySafe(parsedInput.data))
      } catch {
        return false  // 异常时假设不安全
      }
    })()
  : false  // 解析失败时假设不安全
```

### 发现 4: 推测性 Bash 分类器

对于 Bash 命令, 系统在 PreToolUse 钩子执行之前就启动了分类器检查
(`startSpeculativeClassifierCheck`), 让它与钩子和权限检查并行运行。
如果最终需要用户确认, 分类器结果通常已经就绪, 避免了串行等待。

**代码位置**: `toolExecution.ts:734-752`

### 发现 5: 输入回填的只读保证

`backfillObservableInput` 在一个浅克隆上操作, 确保钩子/权限系统看到的是
增强后的输入, 而 `tool.call()` 收到的是模型原始输入。如果钩子/权限返回了
新的输入, 系统会智能地检测 file_path 是否被修改, 以保持转录/VCR 哈希稳定。

**代码位置**: `toolExecution.ts:783-793`, `toolExecution.ts:1189-1205`

### 发现 6: Coordinator 模式的精心设计的系统提示

Coordinator 模式的系统提示 (`getCoordinatorSystemPrompt`) 是一份长达 370 行的
详尽指南, 涵盖了协调器角色定义、工作流管理、Worker 提示撰写规范、故障处理策略、
以及完整的示例会话。特别值得注意的是它强调 "永远不要lazy delegation" -- 协调器
必须自己理解研究发现, 然后才能指导 worker。

**代码位置**: `coordinator/coordinatorMode.ts:111-368`

### 发现 7: 任务 ID 的安全设计

任务 ID 使用 `randomBytes(8)` 生成, 产生约 2.8 万亿种组合。注释明确说明
这是为了 "抵抗暴力符号链接攻击", 因为任务 ID 会用于文件路径 (输出文件)。
这是安全设计渗透到基础设施层的好例子。

**代码位置**: `Task.ts:95-106`

### 发现 8: 多层上下文压缩管线

上游工具不是只有一种压缩策略, 而是有一个完整的管线: 工具结果预算 ->
Snip 压缩 -> 微压缩 -> 上下文折叠 -> 自动压缩。每层处理不同粒度的问题,
且它们可以同时生效 (不互斥)。这使得系统能在保持信息质量的同时,
有效管理超长会话的上下文窗口。

**代码位置**: `query.ts:369-447`
