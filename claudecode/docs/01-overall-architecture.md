# 上游 CLI 整体架构设计文档

> 基于随附源码快照进行分析
> 源码路径: `sourcecode/src/`
> 构建产物: `打包运行目录/cli.js`

---

## 一、项目概览

该源码对应一款基于 Anthropic 模型的命令行 AI 编程助手。它允许用户在终端中直接与模型对话，
该模型能够理解代码库、编辑文件、执行终端命令并管理完整工作流。

项目的技术栈核心：
- **运行时**: Node.js >= 18 (生产环境通过 Bun 打包为单文件可执行程序)
- **语言**: TypeScript (TSX 用于终端 UI 组件)
- **终端 UI**: 自研 Ink 框架 (React 的终端渲染器)
- **命令解析**: Commander.js (`@commander-js/extra-typings`)
- **API 通信**: `@anthropic-ai/sdk` (Anthropic 官方 SDK)
- **MCP 协议**: `@modelcontextprotocol/sdk`
- **Schema 验证**: Zod v4

从代码规模来看:
- 源码文件约 **1884 个** TypeScript/TSX 文件
- `main.tsx` 单文件 **4683 行** (核心入口 + Commander 配置)
- 打包后 `cli.js` 为 **16667 行** 的单一 ESM 文件
- 包含 **70+ 个斜杠命令 (slash commands)**
- 内置 **30+ 个工具 (Tools)**

---

## 二、入口与启动流程

### 2.1 启动链路总览

```
cli.tsx (真正入口)
  |
  +--> --version / --dump-system-prompt / --daemon-worker  (快速路径, 零模块加载)
  |
  +--> main.tsx::main()                                    (主路径)
         |
         +--> Commander 解析 argv
         |
         +--> preAction hook:
         |      +--> ensureMdmSettingsLoaded()
         |      +--> ensureKeychainPrefetchCompleted()
         |      +--> init()                                (entrypoints/init.ts)
         |      +--> initSinks()
         |      +--> runMigrations()
         |      +--> loadRemoteManagedSettings()
         |
         +--> [交互模式] setup() -> launchRepl() -> REPL.tsx
         |
         +--> [非交互模式 -p] runHeadless() -> QueryEngine
```

### 2.2 cli.tsx -- Bootstrap 入口

文件: `src/entrypoints/cli.tsx`

这是 Node.js 进程的真正入口。设计思路是**极简启动, 按需加载**。

```typescript
// src/entrypoints/cli.tsx:33
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 快速路径: --version 零模块加载
  if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) {
    console.log(`${MACRO.VERSION} (coding-agent)`);
    return;
  }
  // ...其他快速路径: --dump-system-prompt, --daemon-worker, bridge 等
}
```

关键设计决策:
- `MACRO.VERSION` 在构建时内联, `--version` 不需要加载任何模块
- `feature('XXX')` 通过 `bun:bundle` 实现编译时条件编译 (dead code elimination)
- Bridge 模式 (`remote-control`)、MCP 服务器等特殊模式在此分流, 避免加载完整 CLI

### 2.3 main.tsx -- 核心入口 (4683 行)

文件: `src/main.tsx`

这是整个应用最庞大的文件。前 200 行是精心排序的导入语句, 有三个"副作用导入"必须在最前面执行:

```typescript
// src/main.tsx:1-20
// 1. profileCheckpoint -- 标记入口时间
import { profileCheckpoint } from './utils/startupProfiler.js';
profileCheckpoint('main_tsx_entry');

// 2. startMdmRawRead -- 并行启动 MDM 子进程 (plutil/reg query)
import { startMdmRawRead } from './utils/settings/mdm/rawRead.js';
startMdmRawRead();

// 3. startKeychainPrefetch -- 并行启动 macOS 钥匙串读取
import { startKeychainPrefetch } from './utils/secureStorage/keychainPrefetch.js';
startKeychainPrefetch();
```

这体现了极致的启动性能优化: 利用模块求值的串行特性, 在导入阶段就并行启动耗时 I/O 操作。

### 2.4 init.ts -- 基础设施初始化

文件: `src/entrypoints/init.ts`

通过 `memoize` 确保只执行一次, 负责:
- 启用配置系统 (`enableConfigs`)
- 应用安全的环境变量 (`applySafeConfigEnvironmentVariables`)
- 设置优雅退出处理 (`setupGracefulShutdown`)
- 初始化 1P 事件日志 (OpenTelemetry)
- 填充 OAuth 账户信息
- 初始化远程管理设置
- 配置全局 mTLS / 代理
- 创建临时目录 (Scratchpad)

### 2.5 setup.ts -- 会话初始化

文件: `src/setup.ts`

在 `init()` 完成后调用, 针对当前会话进行设置:
- Node.js 版本检查 (>= 18)
- UDS 消息服务器启动 (`startUdsMessaging`)
- 终端备份恢复 (iTerm2 / Terminal.app)
- 设置 `cwd`
- 捕获 hooks 配置快照
- 初始化文件变更监视器
- 处理 worktree 创建

```typescript
// src/setup.ts:56
export async function setup(
  cwd: string,
  permissionMode: PermissionMode,
  allowDangerouslySkipPermissions: boolean,
  worktreeEnabled: boolean,
  // ...
): Promise<void>
```

### 2.6 bootstrap/state.ts -- 全局状态 (进程级)

文件: `src/bootstrap/state.ts`

这是一个关键的架构边界。注释明确写道:

```
// DO NOT ADD MORE STATE HERE - BE JUDICIOUS WITH GLOBAL STATE
```

它管理 **进程级** 的单例状态, 包括:
- `sessionId` -- 当前会话 ID
- `cwd` / `originalCwd` / `projectRoot` -- 路径状态
- `modelUsage` -- 模型使用统计
- `totalCostUSD` -- 总费用
- 遥测计数器 (session, LOC, PR, commit, cost, token)
- OpenTelemetry 提供者 (meter, logger, tracer)
- Agent 颜色映射
- 注册的 hooks
- SDK betas
- 各类会话标志

---

## 三、代码目录结构

### 3.1 完整目录映射

```
src/
|
+-- entrypoints/          # 入口点
|   +-- cli.tsx            # Node.js 进程入口
|   +-- init.ts            # 基础设施初始化
|   +-- mcp.ts             # MCP 服务器入口
|   +-- agentSdkTypes.ts   # Agent SDK 类型定义
|   +-- sdk/               # SDK 公共类型
|       +-- coreSchemas.ts
|       +-- coreTypes.ts
|       +-- controlSchemas.ts
|
+-- bootstrap/
|   +-- state.ts           # 进程级全局状态
|
+-- main.tsx               # CLI 主逻辑 (Commander 配置 + 启动流程)
+-- setup.ts               # 会话初始化
+-- Tool.ts                # Tool 类型定义 (核心抽象)
+-- Task.ts                # Task 类型定义 (后台任务抽象)
+-- context.ts             # 系统/用户上下文构造
+-- query.ts               # 查询循环 (核心: 模型交互 + 工具调用)
+-- QueryEngine.ts         # 查询引擎 (无头/SDK 路径)
+-- commands.ts            # 命令注册中心
+-- tools.ts               # 工具注册中心
+-- cost-tracker.ts        # 费用追踪
+-- history.ts             # 会话历史
+-- ink.ts                 # Ink 渲染层封装
+-- replLauncher.tsx       # REPL 启动器
|
+-- commands/              # 70+ 斜杠命令实现
|   +-- clear/             # /clear
|   +-- compact/           # /compact
|   +-- config/            # /config
|   +-- cost/              # /cost
|   +-- diff/              # /diff
|   +-- doctor/            # /doctor
|   +-- help/              # /help
|   +-- login/             # /login
|   +-- mcp/               # /mcp
|   +-- memory/            # /memory
|   +-- model/             # /model
|   +-- review/            # /review (代码审查)
|   +-- resume/            # /resume
|   +-- share/             # /share
|   +-- skills/            # /skills
|   +-- tasks/             # /tasks
|   +-- theme/             # /theme
|   +-- vim/               # /vim
|   +-- voice/             # /voice
|   +-- ...                # 更多命令
|
+-- tools/                 # 30+ 内置工具实现
|   +-- AgentTool/         # 子代理工具
|   +-- AskUserQuestionTool/  # 询问用户
|   +-- BashTool/          # Shell 命令执行
|   +-- FileEditTool/      # 文件编辑
|   +-- FileReadTool/      # 文件读取
|   +-- FileWriteTool/     # 文件写入
|   +-- GlobTool/          # 文件模式搜索
|   +-- GrepTool/          # 内容搜索
|   +-- MCPTool/           # MCP 工具代理
|   +-- NotebookEditTool/  # Jupyter 编辑
|   +-- SkillTool/         # 技能调用
|   +-- TaskCreateTool/    # 后台任务创建
|   +-- WebFetchTool/      # 网页抓取
|   +-- WebSearchTool/     # 网页搜索
|   +-- TodoWriteTool/     # TODO 管理
|   +-- EnterPlanModeTool/ # 计划模式
|   +-- EnterWorktreeTool/ # Worktree 管理
|   +-- ...                # 更多工具
|
+-- tasks/                 # 后台任务类型实现
|   +-- DreamTask/         # 梦境任务 (后台思考)
|   +-- InProcessTeammateTask/  # 进程内队友
|   +-- LocalAgentTask/    # 本地代理任务
|   +-- LocalShellTask/    # 本地 Shell 任务
|   +-- RemoteAgentTask/   # 远程代理任务
|   +-- types.ts           # 任务状态类型
|
+-- components/            # React (Ink) UI 组件
|   +-- App.tsx            # 顶层应用组件
|   +-- agents/            # 代理相关 UI
|   +-- design-system/     # 设计系统 (ThemedBox, ThemedText, ThemeProvider)
|   +-- diff/              # Diff 显示组件
|   +-- messages/          # 消息渲染组件
|   +-- permissions/       # 权限请求对话框
|   +-- mcp/               # MCP 管理 UI
|   +-- PromptInput/       # 输入框组件
|   +-- Settings/          # 设置 UI
|   +-- Spinner/           # 加载动画
|   +-- ...
|
+-- screens/               # 顶层屏幕
|   +-- REPL.tsx           # 交互式 REPL 主屏幕
|   +-- Doctor.tsx         # 诊断屏幕
|   +-- ResumeConversation.tsx  # 恢复会话屏幕
|
+-- state/                 # 应用状态管理
|   +-- store.ts           # 极简响应式 Store 实现
|   +-- AppStateStore.ts   # AppState 定义 + 默认值
|   +-- AppState.ts        # AppState Provider (React Context)
|   +-- onChangeAppState.ts  # 状态变更回调
|
+-- services/              # 业务服务层
|   +-- api/               # API 通信层
|   |   +-- claude.ts      # Anthropic API 调用 (核心)
|   |   +-- bootstrap.ts   # 启动数据获取
|   |   +-- errors.ts      # API 错误处理
|   |   +-- filesApi.ts    # 文件上传/下载
|   |   +-- grove.ts       # Grove 服务
|   |   +-- logging.ts     # API 日志
|   +-- analytics/         # 分析/遥测
|   |   +-- growthbook.ts  # GrowthBook 特性开关
|   |   +-- index.ts       # logEvent
|   +-- compact/           # 上下文压缩
|   |   +-- autoCompact.ts # 自动压缩
|   |   +-- compact.ts     # 压缩核心逻辑
|   |   +-- microCompact.ts  # 微压缩
|   +-- mcp/               # MCP (Model Context Protocol) 服务
|   |   +-- client.ts      # MCP 客户端
|   |   +-- config.ts      # MCP 配置
|   |   +-- types.ts       # MCP 类型
|   +-- lsp/               # LSP 集成
|   +-- oauth/             # OAuth 认证
|   +-- plugins/           # 插件管理服务
|   +-- policyLimits/      # 企业策略限制
|   +-- remoteManagedSettings/  # 远程管理设置
|   +-- tools/             # 工具执行服务
|   |   +-- toolOrchestration.ts  # 工具编排 (并行/串行)
|   |   +-- toolExecution.ts      # 单个工具执行
|   |   +-- StreamingToolExecutor.ts  # 流式工具执行器
|   +-- tips/              # 提示建议
|   +-- SessionMemory/     # 会话记忆
|   +-- extractMemories/   # 记忆提取
|   +-- PromptSuggestion/  # 提示建议
|   +-- ...
|
+-- hooks/                 # React Hooks (UI 状态管理)
|   +-- useCanUseTool.tsx  # 工具权限检查
|   +-- useCancelRequest.ts  # 请求取消
|   +-- useTextInput.ts    # 文本输入
|   +-- useVimInput.ts     # Vim 模式输入
|   +-- useSettings.ts     # 设置管理
|   +-- toolPermission/    # 工具权限处理
|   +-- ...70+ 个 hooks
|
+-- context/               # React Context 定义
+-- constants/             # 常量定义
|   +-- prompts.ts         # 系统提示词构造
|   +-- tools.ts           # 工具名常量
|   +-- system.ts          # 系统常量
|   +-- xml.ts             # XML 标签常量
|
+-- types/                 # TypeScript 类型定义
|   +-- message.ts         # 消息类型
|   +-- permissions.ts     # 权限类型
|   +-- hooks.ts           # Hook 类型
|   +-- ids.ts             # ID 类型 (SessionId, AgentId)
|   +-- generated/         # 自动生成的类型
|
+-- query/                 # 查询子模块
|   +-- config.ts          # 查询配置
|   +-- deps.ts            # 依赖注入 (测试友好)
|   +-- stopHooks.ts       # 停止 hook 处理
|   +-- tokenBudget.ts     # Token 预算追踪
|
+-- coordinator/           # 协调器模式 (多代理)
+-- assistant/             # 助手模式 (Kairos)
+-- bridge/                # 远程控制桥接
+-- buddy/                 # 伙伴系统
+-- remote/                # 远程会话管理
+-- server/                # HTTP/WebSocket 服务器
+-- cli/                   # CLI 子模块 (传输层)
+-- voice/                 # 语音输入
+-- vim/                   # Vim 模式
+-- keybindings/           # 键盘绑定
+-- plugins/               # 插件系统
+-- skills/                # 技能系统
+-- memdir/                # 记忆目录
+-- migrations/            # 数据迁移
+-- schemas/               # JSON Schema
+-- outputStyles/          # 输出样式
+-- ink/                   # 自研 Ink 框架
|   +-- root.ts            # 渲染根
|   +-- components/        # 基础组件 (Box, Text, Button, Link)
|   +-- hooks/             # 基础 hooks (useInput, useApp)
|   +-- events/            # 事件系统
|   +-- layout/            # 布局引擎
|   +-- termio/            # 终端 I/O
|
+-- utils/                 # 工具函数 (最大的目录)
    +-- permissions/       # 权限系统
    +-- settings/          # 设置系统
    +-- model/             # 模型管理
    +-- git/               # Git 操作
    +-- github/            # GitHub 集成
    +-- bash/              # Bash 命令处理
    +-- hooks/             # Hook 工具函数
    +-- mcp/               # MCP 工具函数
    +-- plugins/           # 插件工具函数
    +-- sandbox/           # 沙箱
    +-- swarm/             # 多代理协作
    +-- task/              # 任务工具函数
    +-- telemetry/         # 遥测
    +-- ...
```

---

## 四、核心抽象与类型系统

### 4.1 Tool -- 工具抽象

文件: `src/Tool.ts`

Tool 是整个系统最核心的抽象之一。每个工具（BashTool、FileEditTool 等）都实现此接口。

```typescript
// src/Tool.ts:362-460 (简化)
export type Tool<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  P extends ToolProgressData = ToolProgressData,
> = {
  readonly name: string
  aliases?: string[]
  searchHint?: string

  // 核心方法
  call(
    args: z.infer<Input>,
    context: ToolUseContext,
    canUseTool: CanUseToolFn,
    parentMessage: AssistantMessage,
    onProgress?: ToolCallProgress<P>,
  ): Promise<ToolResult<Output>>

  description(input, options): Promise<string>

  // Schema
  readonly inputSchema: Input       // Zod schema
  readonly inputJSONSchema?: ToolInputJSONSchema  // MCP 工具用 JSON Schema
  outputSchema?: z.ZodType<unknown>

  // 能力声明
  isConcurrencySafe(input): boolean  // 是否可并行执行
  isEnabled(): boolean               // 是否启用
  isReadOnly(input): boolean         // 是否只读
  isDestructive?(input): boolean     // 是否破坏性操作
  interruptBehavior?(): 'cancel' | 'block'  // 中断行为

  // 工具搜索支持
  readonly shouldDefer?: boolean     // 是否延迟加载
  readonly alwaysLoad?: boolean      // 是否始终加载

  // MCP 信息
  isMcp?: boolean
  mcpInfo?: { serverName: string; toolName: string }
}
```

关键设计要点:
- **Schema 驱动**: 输入通过 Zod schema 进行验证
- **并发安全声明**: `isConcurrencySafe` 允许系统并行执行多个只读工具调用
- **延迟加载**: `shouldDefer` 配合 `ToolSearchTool` 实现工具发现, 减少初始 prompt 大小
- **中断行为**: 用户提交新消息时, 工具可选择取消或阻塞

### 4.2 ToolUseContext -- 工具执行上下文

文件: `src/Tool.ts:158-300`

这是传递给每个工具 `call` 方法的上下文对象, 包含了工具执行所需的一切:

```typescript
// src/Tool.ts:158 (简化)
export type ToolUseContext = {
  options: {
    commands: Command[]
    debug: boolean
    mainLoopModel: string
    tools: Tools
    thinkingConfig: ThinkingConfig
    mcpClients: MCPServerConnection[]
    mcpResources: Record<string, ServerResource[]>
    isNonInteractiveSession: boolean
    agentDefinitions: AgentDefinitionsResult
    maxBudgetUsd?: number
    customSystemPrompt?: string
    appendSystemPrompt?: string
  }
  abortController: AbortController
  readFileState: FileStateCache       // 文件状态缓存
  getAppState(): AppState
  setAppState(f: (prev: AppState) => AppState): void
  setInProgressToolUseIDs: (f) => void
  setResponseLength: (f) => void
  updateFileHistoryState: (updater) => void
  updateAttributionState: (updater) => void
  messages: Message[]                 // 当前对话消息
  agentId?: AgentId                   // 子代理 ID
  contentReplacementState?: ContentReplacementState
}
```

### 4.3 Task -- 后台任务抽象

文件: `src/Task.ts`

Task 代表一个可以在后台运行的异步操作:

```typescript
// src/Task.ts:1-76
export type TaskType =
  | 'local_bash'          // 本地 Shell 任务
  | 'local_agent'         // 本地代理任务
  | 'remote_agent'        // 远程代理任务
  | 'in_process_teammate' // 进程内队友
  | 'local_workflow'      // 本地工作流
  | 'monitor_mcp'         // MCP 监控
  | 'dream'               // 梦境任务

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

export type Task = {
  name: string
  type: TaskType
  kill(taskId: string, setAppState: SetAppState): Promise<void>
}
```

Task ID 带有类型前缀: `b` (bash), `a` (agent), `r` (remote), `t` (teammate), `w` (workflow), `m` (monitor), `d` (dream)。

### 4.4 AppState -- 应用状态

文件: `src/state/AppStateStore.ts`

使用 `DeepImmutable<>` 包裹, 确保状态不可变:

```typescript
// src/state/AppStateStore.ts:89
export type AppState = DeepImmutable<{
  settings: SettingsJson
  verbose: boolean
  mainLoopModel: ModelSetting
  statusLineText: string | undefined
  isBriefOnly: boolean
  // ... 大量状态字段
}>
```

### 4.5 Store -- 极简响应式存储

文件: `src/state/store.ts`

仅 34 行代码, 实现了一个精简的发布-订阅存储:

```typescript
// src/state/store.ts:1-34
export type Store<T> = {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: (listener: Listener) => () => void
}

export function createStore<T>(initialState: T, onChange?: OnChange<T>): Store<T> {
  let state = initialState
  const listeners = new Set<Listener>()
  return {
    getState: () => state,
    setState: (updater) => {
      const prev = state
      const next = updater(prev)
      if (Object.is(next, prev)) return  // 引用相等则跳过
      state = next
      onChange?.({ newState: next, oldState: prev })
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
```

这是一个非常精巧的设计 -- 没有依赖任何外部状态管理库, 而是用最少的代码实现了核心需求。
`Object.is` 检查保证了状态没有变化时不会触发无谓的重渲染。

---

## 五、查询循环 -- 系统心脏

### 5.1 query.ts -- 主循环

文件: `src/query.ts`

`query()` 函数是整个系统的核心循环。它驱动: API 调用 -> 流式响应 -> 工具执行 -> 再次 API 调用, 直到模型发出终止信号。

```typescript
// src/query.ts:181-199 (简化)
export type QueryParams = {
  messages: Message[]
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  canUseTool: CanUseToolFn
  toolUseContext: ToolUseContext
  fallbackModel?: string
  querySource: QuerySource
  maxTurns?: number
  taskBudget?: { total: number }
  deps?: QueryDeps                    // 依赖注入
}
```

查询循环的核心流程:

```
                    +-------------------+
                    |   用户消息/指令    |
                    +--------+----------+
                             |
                    +--------v----------+
                    | prependUserContext |  <-- 注入 CLAUDE.md, 日期等
                    | appendSystemContext|  <-- 注入 git 状态等
                    +--------+----------+
                             |
               +-------------v--------------+
               |                            |
               |   queryModelWithStreaming   |  <-- 调用 Anthropic API
               |   (services/api/claude.ts) |
               |                            |
               +-------------+--------------+
                             |
                     +-------v-------+
                     | 流式响应处理   |
                     | - text blocks  |
                     | - thinking     |
                     | - tool_use     |
                     +-------+-------+
                             |
                  +----------v-----------+
              YES |  有 tool_use blocks?  | NO
                  +----------+-----------+-------> 返回最终响应
                             |
                    +--------v---------+
                    |   runTools()     |  <-- 工具编排
                    | (并行 or 串行)   |
                    +--------+---------+
                             |
                    +--------v---------+
                    | autoCompactIfNeeded |  <-- 上下文压缩
                    +--------+---------+
                             |
                    +--------v---------+
                    |  stopHooks 检查   |  <-- 是否继续?
                    +--------+---------+
                             |
                       回到 API 调用
```

### 5.2 QueryEngine -- 无头/SDK 路径

文件: `src/QueryEngine.ts`

QueryEngine 是 `query()` 的封装, 为 SDK 和 headless 模式提供会话管理能力:

```typescript
// src/QueryEngine.ts:184
export class QueryEngine {
  private config: QueryEngineConfig
  private mutableMessages: Message[]
  private abortController: AbortController
  private permissionDenials: SDKPermissionDenial[]
  private totalUsage: NonNullableUsage
  private readFileState: FileStateCache
  private discoveredSkillNames = new Set<string>()

  constructor(config: QueryEngineConfig) { ... }
  // submitMessage() 启动一个新的对话轮次
}
```

### 5.3 工具编排 -- toolOrchestration.ts

文件: `src/services/tools/toolOrchestration.ts`

这是工具执行的调度中心, 核心算法:

```typescript
// src/services/tools/toolOrchestration.ts:19-82
export async function* runTools(
  toolUseMessages: ToolUseBlock[],
  assistantMessages: AssistantMessage[],
  canUseTool: CanUseToolFn,
  toolUseContext: ToolUseContext,
): AsyncGenerator<MessageUpdate, void> {
  // 将工具调用分区为批次:
  // - 连续的并发安全工具 -> 一个并行批次
  // - 非并发安全工具 -> 单独的串行批次
  for (const { isConcurrencySafe, blocks } of partitionToolCalls(...)) {
    if (isConcurrencySafe) {
      // 并行执行只读工具
      for await (const update of runToolsConcurrently(blocks, ...)) { ... }
    } else {
      // 串行执行写入工具
      for await (const update of runToolsSerially(blocks, ...)) { ... }
    }
  }
}
```

最大并发数可通过 `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` 配置, 默认为 10。

### 5.4 StreamingToolExecutor -- 流式工具执行

文件: `src/services/tools/StreamingToolExecutor.ts`

在工具定义还在从 API 流式传入时就开始执行:

```typescript
// src/services/tools/StreamingToolExecutor.ts:40
export class StreamingToolExecutor {
  private tools: TrackedTool[] = []
  private hasErrored = false
  // 子 AbortController: Bash 工具报错时立即终止兄弟子进程
  private siblingAbortController: AbortController
}
```

### 5.5 查询依赖注入 -- query/deps.ts

文件: `src/query/deps.ts`

精巧的测试友好设计:

```typescript
// src/query/deps.ts:21-40
export type QueryDeps = {
  callModel: typeof queryModelWithStreaming
  microcompact: typeof microcompactMessages
  autocompact: typeof autoCompactIfNeeded
  uuid: () => string
}

export function productionDeps(): QueryDeps {
  return {
    callModel: queryModelWithStreaming,
    microcompact: microcompactMessages,
    autocompact: autoCompactIfNeeded,
    uuid: randomUUID,
  }
}
```

使用 `typeof fn` 保持类型同步, 测试可以注入假实现, 无需 spyOn。

---

## 六、上下文系统

### 6.1 context.ts -- 系统/用户上下文

文件: `src/context.ts`

```typescript
// src/context.ts:116-149
export const getSystemContext = memoize(async (): Promise<{ [k: string]: string }> => {
  const gitStatus = await getGitStatus();  // 包含分支、状态、最近提交
  return {
    ...(gitStatus && { gitStatus }),
    // 缓存断路注入 (ant-only)
  };
});

// src/context.ts:155-189
export const getUserContext = memoize(async (): Promise<{ [k: string]: string }> => {
  const claudeMd = getClaudeMds(await getMemoryFiles());  // 加载 CLAUDE.md 文件
  return {
    ...(claudeMd && { claudeMd }),
    currentDate: `Today's date is ${getLocalISODate()}.`,
  };
});
```

上下文通过 `memoize` 缓存, 在整个会话期间只计算一次:
- **系统上下文**: Git 状态快照 (分支、状态、最近5个提交、用户名)
- **用户上下文**: CLAUDE.md 内容 + 当前日期

Git 状态限制为 2000 字符, 超出会截断并提示用户通过 BashTool 获取完整信息。

### 6.2 系统提示词 -- constants/prompts.ts

文件: `src/constants/prompts.ts`

系统提示词的构建是分段式的, 使用 `systemPromptSection` 进行结构化:

```typescript
// src/constants/prompts.ts (多处引用)
import {
  systemPromptSection,
  DANGEROUS_uncachedSystemPromptSection,
  resolveSystemPromptSections,
} from './systemPromptSections.js'
```

提示词包含:
- 基本身份和角色
- 操作系统和环境信息
- 工具描述
- 输出风格配置
- 记忆文件 (CLAUDE.md)
- Git 相关指令 (可通过设置禁用)
- 代理/技能定义

---

## 七、构建系统与产物

### 7.1 package.json

文件: `打包运行目录/package.json`

```json
{
  "name": "coding-agent",
  "bin": { "coding-agent": "cli.js" },
  "engines": { "node": ">=18.0.0" },
  "type": "module",
  "dependencies": {},
  "optionalDependencies": {
    "@img/sharp-darwin-arm64": "^0.34.2",
    // ... 平台特定的 sharp 二进制
  }
}
```

关键观察:
- **零运行时依赖** (`dependencies: {}`) -- 所有代码打包进单一文件
- `optionalDependencies` 只包含图片处理库 Sharp 的平台二进制
- ESM 模块 (`"type": "module"`)

### 7.2 打包产物 -- cli.js

文件: `打包运行目录/cli.js`

```javascript
#!/usr/bin/env node
// (c) Anthropic PBC. All rights reserved.
// Want to see the unminified source? We're hiring!
// https://job-boards.greenhouse.io/anthropic/jobs/4816199008
import{createRequire as _K5}from"node:module";
// ... 16667 行压缩代码
```

打包特征:
- 通过 Bun bundler 编译
- 单一 ESM 文件, `#!/usr/bin/env node` shebang
- 使用 `createRequire` 兼容 CJS 模块
- `MACRO.VERSION` 等宏在构建时内联
- `feature('XXX')` 条件编译 -- 外部构建中 ant-only 代码被消除

### 7.3 feature() 条件编译机制

通过 `bun:bundle` 的 `feature()` 函数实现编译时 dead code elimination:

```typescript
// 源码中的写法
import { feature } from 'bun:bundle'

const coordinatorModeModule = feature('COORDINATOR_MODE')
  ? require('./coordinator/coordinatorMode.js')
  : null;

const assistantModule = feature('KAIROS')
  ? require('./assistant/index.js')
  : null;
```

已知的 feature flags:
- `COORDINATOR_MODE` -- 多代理协调器
- `KAIROS` -- 助手模式
- `BRIDGE_MODE` -- 远程控制桥接
- `PROACTIVE` -- 主动模式
- `VOICE_MODE` -- 语音输入
- `DAEMON` -- 后台守护进程
- `HISTORY_SNIP` -- 历史剪裁
- `UDS_INBOX` -- Unix Domain Socket 收件箱
- `SSH_REMOTE` -- SSH 远程
- `DIRECT_CONNECT` -- 直接连接
- `CONTEXT_COLLAPSE` -- 上下文折叠
- `REACTIVE_COMPACT` -- 响应式压缩
- `BG_SESSIONS` -- 后台会话
- `EXTRACT_MEMORIES` -- 记忆提取
- `EXPERIMENTAL_SKILL_SEARCH` -- 实验性技能搜索
- `AGENT_TRIGGERS` -- 代理触发器
- `WORKFLOW_SCRIPTS` -- 工作流脚本
- `ABLATION_BASELINE` -- 消融基线 (实验)
- `BREAK_CACHE_COMMAND` -- 缓存断路 (ant-only)

---

## 八、分层架构

### 8.1 层次依赖图

```
  +================================================================+
  |                    入口层 (Entrypoints)                         |
  |  cli.tsx -> main.tsx -> setup.ts -> replLauncher.tsx            |
  +================================================================+
       |              |              |
       v              v              v
  +============+  +==========+  +============+
  | 命令层     |  | 屏幕层    |  | SDK 层     |
  | commands/  |  | screens/  |  | agentSdk   |
  +============+  +==========+  +============+
       |              |              |
       v              v              v
  +================================================================+
  |                    业务逻辑层                                    |
  |  QueryEngine.ts -> query.ts -> Tool.ts -> Task.ts              |
  +================================================================+
       |              |              |
       v              v              v
  +============+  +==========+  +============+
  | 工具实现层  |  | 服务层    |  | 组件层     |
  | tools/     |  | services/ |  | components/|
  +============+  +==========+  +============+
       |              |              |
       v              v              v
  +================================================================+
  |                    基础设施层                                    |
  |  bootstrap/state.ts | state/store.ts | ink/ | utils/            |
  +================================================================+
       |              |              |
       v              v              v
  +================================================================+
  |                    外部依赖                                     |
  |  @anthropic-ai/sdk | @modelcontextprotocol/sdk | zod | React   |
  +================================================================+
```

### 8.2 模块依赖原则

从代码中可以观察到几个明确的架构原则:

**1. bootstrap 必须是叶子模块**

```typescript
// src/bootstrap/state.ts 注释
// bootstrap-isolation: bootstrap/state.ts must remain a leaf module
```

`bootstrap/state.ts` 不能导入应用代码, 只能导入 `node:crypto` 等纯外部模块。
这确保了全局状态在模块求值顺序的最早期就可用。

**2. 循环依赖通过 lazy require 打断**

```typescript
// src/main.tsx:69-73
// Lazy require to avoid circular dependency
const getTeammateUtils = () =>
  require('./utils/teammate.js') as typeof import('./utils/teammate.js');
```

**3. 类型导入用于打断导入环**

```typescript
// src/Tool.ts:42-47
// Import permission types from centralized location to break import cycles
import type { PermissionResult } from './types/permissions.js'
// Import tool progress types from centralized location to break import cycles
import type { ToolProgressData } from './types/tools.js'
```

**4. Feature-gated 模块通过条件 require 加载**

```typescript
// 编译时 dead code elimination
const module = feature('FLAG')
  ? require('./heavy/module.js')
  : null;
```

---

## 九、交互模式 vs 非交互模式

### 9.1 交互模式 (REPL)

```
main.tsx
  |
  +--> setup() -> 初始化 cwd, hooks, worktree
  |
  +--> createRoot() -> Ink 渲染根
  |
  +--> showSetupScreens() -> Trust Dialog, Onboarding
  |
  +--> launchRepl() -> App + REPL 组件
       |
       +--> REPL.tsx
            |
            +--> useTextInput / useVimInput   (输入处理)
            +--> useCanUseTool                (权限检查)
            +--> useMergedTools              (工具合并: 内置 + MCP + 插件)
            +--> useMergedCommands           (命令合并)
            +--> useQueueProcessor           (消息队列处理)
            +--> useSettings                 (设置管理)
            +--> QueryEngine.submitMessage() (查询执行)
```

### 9.2 非交互模式 (--print / -p)

```
main.tsx
  |
  +--> setup() -> 初始化
  |
  +--> QueryEngine 直接创建
  |
  +--> submitMessage() 执行一次查询
  |
  +--> 输出结果到 stdout
  |
  +--> 退出
```

### 9.3 MCP 服务器模式 (mcp serve)

```
entrypoints/mcp.ts
  |
  +--> startMCPServer()
  |
  +--> Server (MCP SDK)
  |
  +--> ListToolsRequestSchema -> 暴露内置工具
  +--> CallToolRequestSchema -> 执行工具调用
```

---

## 十、工具系统详解

### 10.1 工具注册

文件: `src/tools.ts`

工具通过 `getTools()` 函数统一注册:

```typescript
// src/tools.ts (简化)
import { BashTool } from './tools/BashTool/BashTool.js'
import { FileEditTool } from './tools/FileEditTool/FileEditTool.js'
import { FileReadTool } from './tools/FileReadTool/FileReadTool.js'
// ... 更多工具导入

export function getTools(toolPermissionContext: ToolPermissionContext): Tools {
  const tools = [
    BashTool,
    FileEditTool,
    FileReadTool,
    FileWriteTool,
    GlobTool,
    GrepTool,
    AgentTool,
    SkillTool,
    // ... 根据条件加入更多工具
  ];

  // 根据权限规则过滤
  return tools.filter(tool => {
    if (!tool.isEnabled()) return false;
    const denyRule = getDenyRuleForTool(tool.name, toolPermissionContext);
    if (denyRule) return false;
    return true;
  });
}
```

### 10.2 工具分类

| 类别 | 工具 | 说明 |
|------|------|------|
| **文件操作** | FileRead, FileEdit, FileWrite, GlobTool, GrepTool, NotebookEdit | 文件系统操作 |
| **命令执行** | BashTool, PowerShellTool | Shell 命令 |
| **代理协作** | AgentTool, TeamCreate, TeamDelete, SendMessage | 多代理系统 |
| **任务管理** | TaskCreate, TaskGet, TaskList, TaskOutput, TaskStop, TaskUpdate | 后台任务 |
| **计划模式** | EnterPlanMode, ExitPlanMode | 思考/实施分离 |
| **工作空间** | EnterWorktree, ExitWorktree | Git Worktree |
| **信息获取** | WebFetch, WebSearch, ToolSearch, LSP | 外部信息 |
| **用户交互** | AskUserQuestion | 主动询问 |
| **其他** | SkillTool, TodoWrite, Config, Sleep, Brief | 特殊用途 |

### 10.3 工具并发模型

工具根据 `isConcurrencySafe` 属性分为两类:
- **并发安全** (只读): FileRead, Glob, Grep, WebFetch 等 -- 可并行执行
- **非并发安全** (写入): FileEdit, FileWrite, BashTool 等 -- 必须串行执行

工具编排器 (`toolOrchestration.ts`) 将连续的并发安全工具合并为一批并行执行,
遇到非并发安全工具则单独串行执行。

---

## 十一、命令系统

### 11.1 命令注册

文件: `src/commands.ts`

```typescript
// src/commands.ts (简化)
import clear from './commands/clear/index.js'
import compact from './commands/compact/index.js'
import config from './commands/config/index.js'
// ... 70+ 命令导入

export function getCommands(): Command[] {
  return [
    clear, compact, config, cost, diff, doctor,
    help, login, logout, memory, mcp, model,
    review, resume, session, share, skills,
    tasks, theme, vim, voice,
    // ... 条件加入 feature-gated 命令
  ];
}
```

### 11.2 命令类型

```typescript
// src/types/command.ts 或 commands.ts
export type Command = {
  name: string
  description: string
  aliases?: string[]
  isEnabled?: () => boolean
  action: (args, context) => Promise<void> | void
}
```

---

## 十二、权限系统

权限系统是上游工具安全性的核心:

### 12.1 权限模式

```typescript
// src/utils/permissions/PermissionMode.ts
export const PERMISSION_MODES = ['default', 'plan', 'auto', 'bypassPermissions']
```

- **default**: 标准模式, 每个操作都需要用户确认
- **plan**: 计划模式, 只允许只读操作
- **auto**: 自动模式, 使用分类器自动决定 (需要特性门控)
- **bypassPermissions**: 跳过所有权限检查 (仅限沙箱环境)

### 12.2 权限规则

```typescript
// src/Tool.ts:123-138
export type ToolPermissionContext = DeepImmutable<{
  mode: PermissionMode
  additionalWorkingDirectories: Map<string, AdditionalWorkingDirectory>
  alwaysAllowRules: ToolPermissionRulesBySource
  alwaysDenyRules: ToolPermissionRulesBySource
  alwaysAskRules: ToolPermissionRulesBySource
  isBypassPermissionsModeAvailable: boolean
  isAutoModeAvailable?: boolean
  shouldAvoidPermissionPrompts?: boolean
}>
```

规则来源: 用户配置、项目配置、CLI 参数、企业策略。

---

## 十三、Ink 框架 -- 终端 UI

### 13.1 自研的 Ink 实现

文件: `src/ink/`

上游工具使用了 **自研的 Ink 框架** (不是 npm 上的 ink 包), 基于 React 进行终端渲染:

```typescript
// src/ink.ts:14-16
function withTheme(node: ReactNode): ReactNode {
  return createElement(ThemeProvider, null, node)
}
```

组件体系:
- `Box` -- 布局容器 (Flexbox)
- `Text` -- 文本渲染
- `Button` -- 按钮
- `Link` -- 链接
- `Spacer` -- 间距
- `Newline` -- 换行
- `Ansi` / `RawAnsi` -- ANSI 转义序列

### 13.2 设计系统

```
src/components/design-system/
  +-- ThemeProvider.tsx    # 主题上下文
  +-- ThemedBox.tsx        # 主题化 Box
  +-- ThemedText.tsx       # 主题化 Text
  +-- color.ts             # 颜色系统
```

---

## 十四、上下文压缩

### 14.1 自动压缩

文件: `src/services/compact/autoCompact.ts`

当对话 token 数接近上下文窗口限制时自动触发压缩:

```typescript
// src/services/compact/autoCompact.ts:33
export function getEffectiveContextWindowSize(model: string): number {
  const reservedTokensForSummary = Math.min(
    getMaxOutputTokensForModel(model),
    MAX_OUTPUT_TOKENS_FOR_SUMMARY,  // 20,000
  )
  let contextWindow = getContextWindowForModel(model, getSdkBetas())
  return contextWindow - reservedTokensForSummary
}
```

压缩类型:
- **autoCompact**: 基于 token 阈值的自动压缩
- **microCompact**: 轻量级压缩 (工具结果截断)
- **snipCompact**: 历史剪裁 (feature-gated: `HISTORY_SNIP`)
- **reactiveCompact**: 响应式压缩 (feature-gated: `REACTIVE_COMPACT`)

---

## 十五、多代理系统

### 15.1 AgentTool

`AgentTool` 允许 Claude 创建子代理来完成子任务:

文件: `src/tools/AgentTool/`
- `AgentTool.tsx` -- 主工具实现
- `loadAgentsDir.ts` -- 从 `.claude/agents/` 加载代理定义
- `agentColorManager.ts` -- 代理颜色管理
- `built-in/` -- 内置代理 (exploreAgent)
- `forkSubagent.ts` -- 分叉子代理 (共享 prompt cache)

### 15.2 Swarm 系统

文件: `src/utils/swarm/`
- 多代理协作框架
- 支持 tmux 和进程内两种队友模式
- `TeamCreate` / `TeamDelete` / `SendMessage` 工具

### 15.3 Coordinator 模式

文件: `src/coordinator/coordinatorMode.ts`
- Feature-gated: `COORDINATOR_MODE`
- 一个"协调器"代理指挥多个"工作者"代理

---

## 十六、插件与技能系统

### 16.1 插件系统

```
src/plugins/
  +-- bundled/            # 内置插件
  +-- builtinPlugins.ts   # 内置插件注册

src/services/plugins/     # 插件管理服务
src/utils/plugins/        # 插件工具函数
```

### 16.2 技能系统

```
src/skills/
  +-- bundled/            # 内置技能
  +-- bundledSkills.ts    # 内置技能注册
  +-- loadSkillsDir.ts    # 从目录加载技能
  +-- mcpSkillBuilders.ts # MCP 技能构建器
```

技能 (Skills) 是预定义的工作流, 通过 `SkillTool` 调用:
- 用户通过 `/skill-name` 语法触发
- 技能定义在 `.claude/skills/` 目录或内置
- `ToolSearchTool` 支持技能发现

---

## 十七、MCP 集成

### 17.1 MCP 客户端

文件: `src/services/mcp/`

上游工具同时作为 MCP **客户端** (连接外部 MCP 服务器) 和 **服务器** (暴露自身工具):

```typescript
// src/services/mcp/client.ts -- MCP 客户端
export async function getMcpToolsCommandsAndResources(...) { ... }
export function prefetchAllMcpResources(...) { ... }

// src/entrypoints/mcp.ts -- MCP 服务器
export async function startMCPServer(cwd, debug, verbose): Promise<void> {
  const server = new Server({
    name: 'coding-agent/runtime',
    version: MACRO.VERSION,
  }, {
    capabilities: { tools: {} },
  });
}
```

### 17.2 MCP 工具代理

MCP 工具通过 `MCPTool` 代理到内部 Tool 接口:
- 名称规范化: `mcp__<server>__<tool>`
- Schema 转换: JSON Schema <-> Zod
- 支持 `defer_loading` 和 `alwaysLoad`

---

## 十八、数据迁移系统

文件: `src/migrations/`

系统维护一个迁移版本号, 每次启动时检查并执行:

```typescript
// src/main.tsx:325-352
const CURRENT_MIGRATION_VERSION = 11;
function runMigrations(): void {
  if (getGlobalConfig().migrationVersion !== CURRENT_MIGRATION_VERSION) {
    migrateAutoUpdatesToSettings();
    migrateBypassPermissionsAcceptedToSettings();
    migrateSonnet1mToSonnet45();
    migrateSonnet45ToSonnet46();
    migrateOpusToOpus1m();
    // ...
    saveGlobalConfig(prev => ({
      ...prev,
      migrationVersion: CURRENT_MIGRATION_VERSION,
    }));
  }
}
```

这些迁移主要处理:
- 模型名称变更 (如 Sonnet 1m -> Sonnet 4.5 -> Sonnet 4.6)
- 设置字段重组
- 配置格式升级

---

## 十九、遥测与分析

### 19.1 分析系统

```
src/services/analytics/
  +-- index.ts            # logEvent 入口
  +-- growthbook.ts       # GrowthBook 特性开关
  +-- config.ts           # 分析配置
  +-- sink.ts             # 事件汇聚
  +-- firstPartyEventLogger.ts  # 第一方事件 (OpenTelemetry)
```

### 19.2 遥测指标

```
src/utils/telemetry/
  +-- betaSessionTracing.ts  # 会话追踪
  +-- pluginTelemetry.ts     # 插件遥测
  +-- skillLoadedEvent.ts    # 技能加载事件
```

通过 OpenTelemetry 收集:
- 会话计数、LOC 变更、PR 创建、Commit 数
- API 费用、Token 使用
- 工具调用统计
- 启动性能指标

---

## 二十、亮点发现

### 1. 极致的启动性能优化

在 `main.tsx` 最开头, 利用模块求值的串行特性来并行化 I/O:

```typescript
// 导入语句之间穿插副作用调用
import { profileCheckpoint } from './utils/startupProfiler.js';
profileCheckpoint('main_tsx_entry');
import { startMdmRawRead } from './utils/settings/mdm/rawRead.js';
startMdmRawRead();  // 启动子进程, 与后续 135ms 的导入并行
import { startKeychainPrefetch } from './utils/secureStorage/keychainPrefetch.js';
startKeychainPrefetch();  // 并行读取 macOS 钥匙串
```

这是一个非常规但有效的性能优化技巧。每个 `import` 语句是串行执行的,
但调用的异步操作在后台并行运行。

### 2. 34 行的状态管理方案

`src/state/store.ts` 仅用 34 行代码实现了完整的响应式状态管理,
没有使用 Redux、Zustand 等任何第三方库。`Object.is` 引用检查保证了高效的更新检测。

### 3. 编译时 Feature Flags

通过 `bun:bundle` 的 `feature()` 实现真正的编译时 dead code elimination:

```typescript
const module = feature('COORDINATOR_MODE')
  ? require('./coordinator/coordinatorMode.js')
  : null;
```

外部构建中, `feature('COORDINATOR_MODE')` 被替换为 `false`,
整个 `require` 和相关代码在构建时被移除, 不会出现在最终产物中。

### 4. 零运行时依赖的打包策略

最终产物 `package.json` 中 `dependencies: {}` 为空,
所有代码 (包括 React、Commander、Zod 等) 都被打包进单一 `cli.js` 文件。
唯一的 `optionalDependencies` 是 Sharp 的平台二进制。这意味着:
- 安装极快 (无需下载依赖)
- 无版本冲突风险
- 分发简单 (单文件 + 可选原生模块)

### 5. 巧妙的循环依赖处理

代码中大量使用了三种策略来处理循环依赖:
- **Lazy require**: `const getModule = () => require('./module.js')`
- **类型导入**: `import type { X } from './module.js'` (不产生运行时依赖)
- **集中类型文件**: `src/types/permissions.ts`, `src/types/tools.ts` 作为类型中转站

### 6. 工具并发调度的分区算法

`toolOrchestration.ts` 中的 `partitionToolCalls` 将工具调用分区:
连续的只读工具合并为并行批次, 写入工具独立串行。这使得 `Grep + Glob + FileRead`
可以并行执行, 而 `FileEdit` 必须等待前面的工具完成。最大并发数默认 10。

### 7. StreamingToolExecutor 的流式执行

工具定义从 API 流式传入时就开始执行, 不需要等待完整的 tool_use block。
子 AbortController 在某个 Bash 工具出错时立即终止兄弟进程,
但不会终止父 AbortController (query 不会结束)。

### 8. QueryDeps 依赖注入模式

`src/query/deps.ts` 使用 `typeof fn` 保持类型同步:

```typescript
export type QueryDeps = {
  callModel: typeof queryModelWithStreaming
  // ...
}
```

这比传统的接口定义更安全 -- 如果 `queryModelWithStreaming` 的签名变了,
`QueryDeps` 类型自动更新, 测试中的假实现会立即报类型错误。

### 9. 4683 行的 main.tsx "上帝文件"

这是一个值得关注的架构特征。`main.tsx` 包含了 Commander 的全部配置、
所有 CLI 选项定义、交互/非交互分支、MCP/插件/代理的初始化逻辑。
虽然体量巨大, 但通过 `feature()` 编译时消除和动态 `import()`,
实际加载的代码量远小于文件大小。
文件头部 200 行的导入列表本身就是一份微型架构图。

### 10. 内部实现标识

源码中存在用于区分功能开关、事件和服务的内部标识。为使分析内容能对应现有实现，本文保留相关 API、协议、环境变量和文件名；理解具体行为时，应以随附源码为准。

---

## 附录: 关键文件索引

| 文件 | 行数 (估) | 用途 |
|------|-----------|------|
| `src/main.tsx` | 4683 | CLI 主入口 + Commander 配置 |
| `src/query.ts` | ~800 | 查询循环核心 |
| `src/QueryEngine.ts` | ~500 | 查询引擎 (SDK/headless) |
| `src/Tool.ts` | ~460 | 工具类型定义 |
| `src/Task.ts` | 126 | 任务类型定义 |
| `src/context.ts` | 189 | 系统/用户上下文 |
| `src/setup.ts` | ~300 | 会话初始化 |
| `src/tools.ts` | ~300 | 工具注册中心 |
| `src/commands.ts` | ~200 | 命令注册中心 |
| `src/state/store.ts` | 34 | 响应式状态存储 |
| `src/state/AppStateStore.ts` | ~300 | 应用状态定义 |
| `src/bootstrap/state.ts` | ~300 | 进程级全局状态 |
| `src/entrypoints/cli.tsx` | ~200 | Bootstrap 入口 |
| `src/entrypoints/init.ts` | ~250 | 基础设施初始化 |
| `src/services/api/claude.ts` | ~500 | Anthropic API 调用 |
| `src/services/tools/toolOrchestration.ts` | ~200 | 工具并发调度 |
| `src/services/compact/autoCompact.ts` | ~200 | 自动上下文压缩 |
| `src/constants/prompts.ts` | ~300 | 系统提示词构造 |

---

*本文档基于 上游工具当前源码快照分析, 源码位于 `sourcecode/src/` 目录。*
*分析时间: 2026年4月*
