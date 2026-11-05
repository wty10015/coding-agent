# 16. Subagent 实现深度分析

## 目录

1. [概述](#概述)
2. [Subagent 整体架构](#subagent-整体架构)
3. [AgentTool 核心实现](#agenttool-核心实现)
4. [内置代理系统](#内置代理系统)
5. [代理上下文隔离 (AsyncLocalStorage)](#代理上下文隔离)
6. [创建子代理上下文 (createSubagentContext)](#创建子代理上下文)
7. [runAgent 主循环](#runagent-主循环)
8. [Fork Subagent 机制](#fork-subagent-机制)
9. [权限过滤三层系统](#权限过滤三层系统)
10. [资源共享与隔离策略](#资源共享与隔离策略)
11. [状态管理 (state/)](#状态管理)
12. [Bridge 通信机制](#bridge-通信机制)
13. [代理间通信与 Teammate 系统](#代理间通信与-teammate-系统)
14. [Prompt Cache 共享策略](#prompt-cache-共享策略)
15. [亮点发现](#亮点发现)

---

## 概述

上游工具的 Subagent 系统是整个工具最核心的多任务执行引擎。它允许主代理
(parent agent) 启动子代理 (subagent) 来执行独立任务, 实现了复杂的资源共享、
权限控制和上下文隔离。

**核心源文件清单:**

| 文件 | 路径 | 行数(约) | 职责 |
|------|------|----------|------|
| AgentTool.tsx | tools/AgentTool/ | ~800+ | 代理工具入口 |
| runAgent.ts | tools/AgentTool/ | ~600+ | 代理执行主循环 |
| forkSubagent.ts | tools/AgentTool/ | ~210 | Fork 子代理特性 |
| agentToolUtils.ts | tools/AgentTool/ | ~400+ | 工具过滤/解析 |
| builtInAgents.ts | tools/AgentTool/ | ~73 | 内置代理注册 |
| loadAgentsDir.ts | tools/AgentTool/ | ~500+ | 代理定义加载 |
| constants.ts | tools/AgentTool/ | ~13 | 常量定义 |
| prompt.ts | tools/AgentTool/ | ~200+ | 代理 Prompt 构建 |
| forkedAgent.ts | utils/ | ~690 | Fork 代理上下文 |
| agentContext.ts | utils/ | ~179 | AsyncLocalStorage 上下文 |
| AppStateStore.ts | state/ | ~300+ | 应用状态定义 |
| store.ts | state/ | ~35 | 状态存储实现 |

---

## Subagent 整体架构

```
+==================================================================+
|                    该命令行工具主进程                              |
|                                                                    |
|  +--------------------+                                           |
|  | 主代理 (Parent)     |    AgentTool.call()                     |
|  | - SystemPrompt     |--------+                                  |
|  | - ToolUseContext    |        |                                  |
|  | - Messages         |        v                                  |
|  +--------------------+  +-------------------------------------------+
|                          | createSubagentContext()                     |
|                          |   - 克隆 readFileState                     |
|                          |   - 新建 AbortController (链接到父)        |
|                          |   - shouldAvoidPermissionPrompts = true    |
|                          |   - 独立 nestedMemoryAttachmentTriggers    |
|                          |   - 独立 toolDecisions                     |
|                          +-------------------------------------------+
|                                   |
|          +------------------------+------------------------+
|          |                        |                        |
|          v                        v                        v
|  +--------------+         +--------------+         +--------------+
|  | Explore 代理  |         | Plan 代理     |         | 通用代理      |
|  | (只读工具)    |         | (只读工具)    |         | (全部工具)    |
|  | omitClaudeMd |         | omitClaudeMd |         |              |
|  +--------------+         +--------------+         +--------------+
|          |                        |                        |
|          v                        v                        v
|  +-------------------------------------------------------------+
|  |                 runAgent() 查询循环                           |
|  |  for await (message of query({...}))                         |
|  |    - 记录 sidechain transcript                                |
|  |    - 跟踪 usage                                               |
|  |    - 通过 AsyncLocalStorage 隔离                               |
|  +-------------------------------------------------------------+
|                                                                    |
+==================================================================+
```

---

## AgentTool 核心实现

### 3.1 工具定义

**文件引用:** `src/tools/AgentTool/AgentTool.tsx:82-125`

AgentTool 的输入 Schema 分为基础和完整两个层次:

```typescript
// 基础 Schema
const baseInputSchema = lazySchema(() => z.object({
  description: z.string(),       // 3-5 词任务描述
  prompt: z.string(),            // 完整任务指令
  subagent_type: z.string().optional(),  // 代理类型
  model: z.enum(['sonnet', 'opus', 'haiku']).optional(),
  run_in_background: z.boolean().optional(),
}))

// 完整 Schema (含多代理参数)
const fullInputSchema = lazySchema(() => {
  return baseInputSchema().merge(z.object({
    name: z.string().optional(),       // 可寻址名称
    team_name: z.string().optional(),  // 团队名称
    mode: permissionModeSchema().optional(), // 权限模式
  })).extend({
    isolation: z.enum(['worktree', 'remote']).optional(),
    cwd: z.string().optional(),  // 工作目录覆盖
  })
})
```

**动态 Schema 裁剪:**
- `KAIROS` feature off -> 移除 `cwd` 字段
- 后台任务禁用 或 fork 启用 -> 移除 `run_in_background` 字段

### 3.2 输出 Schema

**文件引用:** `src/tools/AgentTool/AgentTool.tsx:141-191`

```typescript
// 公开输出类型
type Output =
  | { status: 'completed', prompt: string, result: string, ... }
  | { status: 'async_launched', agentId: string, outputFile: string, ... }

// 内部输出类型 (不暴露给 Schema, 用于死代码消除)
type TeammateSpawnedOutput = { status: 'teammate_spawned', ... }
type RemoteLaunchedOutput = { status: 'remote_launched', taskId: string, ... }
```

### 3.3 工具名称

**文件引用:** `src/tools/AgentTool/constants.ts:1-12`
```typescript
export const AGENT_TOOL_NAME = 'Agent'
export const LEGACY_AGENT_TOOL_NAME = 'Task'  // 向后兼容
export const VERIFICATION_AGENT_TYPE = 'verification'

// 一次性内置代理: 跳过 agentId/SendMessage/usage 尾部
export const ONE_SHOT_BUILTIN_AGENT_TYPES: ReadonlySet<string> = new Set([
  'Explore', 'Plan',
])
```

`ONE_SHOT_BUILTIN_AGENT_TYPES` 的设计: Explore 和 Plan 代理是一次性的, 父代理
不会再通过 `SendMessage` 继续与它们交互。跳过尾部信息可节省 ~135 字符 x 3400万
Explore 运行/周。

---

## 内置代理系统

### 4.1 代理注册表

**文件引用:** `src/tools/AgentTool/builtInAgents.ts:22-72`

```typescript
export function getBuiltInAgents(): AgentDefinition[] {
  // SDK 模式可禁用所有内置代理
  if (isEnvTruthy(process.env.CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS)
      && getIsNonInteractiveSession()) {
    return []
  }

  // 协调者模式有独立的代理集
  if (feature('COORDINATOR_MODE') && isCoordinatorMode()) {
    return getCoordinatorAgents()
  }

  const agents = [
    GENERAL_PURPOSE_AGENT,      // 通用代理 (必选)
    STATUSLINE_SETUP_AGENT,     // 状态栏设置 (必选)
  ]

  if (areExplorePlanAgentsEnabled()) {
    agents.push(EXPLORE_AGENT, PLAN_AGENT)
  }

  if (isNonSdkEntrypoint) {
    agents.push(CLAUDE_CODE_GUIDE_AGENT)  // 使用指南代理
  }

  if (feature('VERIFICATION_AGENT') && gate('internal_hive_evidence')) {
    agents.push(VERIFICATION_AGENT)       // 验证代理
  }

  return agents
}
```

### 4.2 代理类型体系

```
内置代理层级:

  general-purpose (通用)
    |-- 工具: 全部工具
    |-- 模型: inherit (继承父代理)
    |-- 权限模式: default
    |-- maxTurns: 200
    |
  Explore (探索)
    |-- 工具: Read, Glob, Grep, Bash (只读), LSP
    |-- omitClaudeMd: true (节省 token)
    |-- 权限模式: default
    |
  Plan (规划)
    |-- 工具: Read, Glob, Grep, Bash (只读)
    |-- omitClaudeMd: true
    |-- 权限模式: default
    |
  verification (验证)
    |-- feature gate: VERIFICATION_AGENT
    |-- GrowthBook: internal_hive_evidence
    |
  code-guide (使用指南)
    |-- 仅非 SDK 入口
    |
  statusline-setup (状态栏)
    |-- 内部辅助

  Fork Agent (隐式)
    |-- 工具: ['*'] (与父代理完全相同)
    |-- useExactTools: true (字节相同的 API 前缀)
    |-- permissionMode: 'bubble' (权限冒泡)
    |-- model: 'inherit'
    |-- 不通过 subagent_type 选择
```

### 4.3 自定义代理

用户可以在 `.claude/agents/` 或 `~/.claude/agents/` 下创建自定义代理:

**文件引用:** `src/tools/AgentTool/loadAgentsDir.ts:58-80`

```typescript
export type AgentMcpServerSpec =
  | string                              // 引用已有 MCP 服务器
  | { [name: string]: McpServerConfig } // 内联定义

const AgentJsonSchema = lazySchema(() => z.object({
  description: z.string(),
  tools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  prompt: z.string(),
  model: z.string().optional(),    // sonnet/opus/haiku/inherit
  permissionMode: z.string().optional(),
  maxTurns: z.number().optional(),
  mcpServers: z.array(AgentMcpServerSpecSchema()).optional(),
  hooks: HooksSchema().optional(),
  // ...更多字段
}))
```

---

## 代理上下文隔离

### 5.1 AsyncLocalStorage 机制

**文件引用:** `src/utils/agentContext.ts:1-179`

```
为什么使用 AsyncLocalStorage 而非 AppState:

  问题: 当代理被后台化 (ctrl+b), 多个代理可以在同一进程中并发运行。
  AppState 是单一共享状态, 会被覆盖, 导致 Agent A 的事件错误地
  使用 Agent B 的上下文。

  解决: AsyncLocalStorage 隔离每个异步执行链, 并发代理互不干扰。

  +--------------------------------------------------+
  | 主进程                                            |
  |                                                    |
  |  AsyncLocalStorage                                 |
  |  +----------------------------------------------+  |
  |  | Agent A 执行链                                |  |
  |  | context = { agentId: "a1", agentType: "sub" } |  |
  |  |   -> API call -> tool call -> ...              |  |
  |  +----------------------------------------------+  |
  |                                                    |
  |  +----------------------------------------------+  |
  |  | Agent B 执行链                                |  |
  |  | context = { agentId: "b2", agentType: "sub" } |  |
  |  |   -> API call -> tool call -> ...              |  |
  |  +----------------------------------------------+  |
  +--------------------------------------------------+
```

### 5.2 上下文类型 (判别联合)

```typescript
// 子代理上下文
type SubagentContext = {
  agentId: string
  parentSessionId?: string
  agentType: 'subagent'
  subagentName?: string       // "Explore", "Plan", "code-reviewer"
  isBuiltIn?: boolean
  invokingRequestId?: string
  invocationKind?: 'spawn' | 'resume'
  invocationEmitted?: boolean  // 可变: 首次 API 事件后设为 true
}

// 队友上下文
type TeammateAgentContext = {
  agentId: string
  agentName: string           // "researcher"
  teamName: string
  agentColor?: string
  planModeRequired: boolean
  parentSessionId: string
  isTeamLead: boolean
  agentType: 'teammate'
  invokingRequestId?: string
  invocationKind?: 'spawn' | 'resume'
  invocationEmitted?: boolean
}

type AgentContext = SubagentContext | TeammateAgentContext
```

### 5.3 调用模式

**文件引用:** `src/utils/agentContext.ts:108-110`
```typescript
export function runWithAgentContext<T>(context: AgentContext, fn: () => T): T {
  return agentContextStorage.run(context, fn)
}
```

### 5.4 稀疏边 (Sparse Edge) 遥测

**文件引用:** `src/utils/agentContext.ts:157-178`

`consumeInvokingRequestId()` 实现"首次消费"语义: 每次 spawn/resume 后仅在
第一个 `internal_api_success/error` 事件上发出 `invokingRequestId`, 使得下游
数据系统可以识别代理调用边界。

---

## 创建子代理上下文

### 6.1 createSubagentContext 详解

**文件引用:** `src/utils/forkedAgent.ts:345-462`

这是整个 Subagent 系统中最关键的隔离函数:

```
createSubagentContext(parentContext, overrides?)

默认隔离 (Background Agent, Session Memory):
  +-------------------------------------------------------+
  | 可变状态 - 默认全部克隆                                 |
  | readFileState:          clone(parent)                  |
  | nestedMemoryAttachmentTriggers: new Set()              |
  | loadedNestedMemoryPaths:        new Set()              |
  | dynamicSkillDirTriggers:        new Set()              |
  | discoveredSkillNames:           new Set()              |
  | toolDecisions:                  undefined              |
  | contentReplacementState:        clone(parent) 或 override|
  +-------------------------------------------------------+
  | AbortController - 新建子控制器, 链接到父                |
  | createChildAbortController(parent.abortController)     |
  +-------------------------------------------------------+
  | AppState 访问 - 包装以禁止权限提示                      |
  | shouldAvoidPermissionPrompts: true                     |
  +-------------------------------------------------------+
  | 变更回调 - 默认全部 no-op                               |
  | setAppState: () => {}                                  |
  | setInProgressToolUseIDs: () => {}                      |
  | setResponseLength: () => {}                            |
  | updateFileHistoryState: () => {}                       |
  +-------------------------------------------------------+
  | UI 回调 - 全部 undefined                                |
  | addNotification: undefined                             |
  | setToolJSX: undefined                                  |
  | setStreamMode: undefined                               |
  | setSDKStatus: undefined                                |
  | openMessageSelector: undefined                         |
  +-------------------------------------------------------+
  | 始终共享                                                |
  | setAppStateForTasks: parent (任务注册/终止必须到根存储)   |
  | updateAttributionState: parent (归因是范围化的、函数式的) |
  | fileReadingLimits: parent                              |
  | userModified: parent                                    |
  +-------------------------------------------------------+
  | 新建                                                    |
  | agentId: createAgentId()                               |
  | queryTracking: { chainId: UUID, depth: parent+1 }     |
  | localDenialTracking: createDenialTrackingState()       |
  +-------------------------------------------------------+

显式共享选项 (Interactive Subagent):
  shareSetAppState: true       -> 使用 parent.setAppState
  shareSetResponseLength: true -> 使用 parent.setResponseLength
  shareAbortController: true   -> 使用 parent.abortController
                                  (此时不禁止权限提示)
```

### 6.2 contentReplacementState 的克隆语义

**文件引用:** `src/utils/forkedAgent.ts:388-403`

默认克隆而非新建, 原因:

```
Cache-sharing fork 处理父消息中包含的父 tool_use_ids:
  - 新建状态: 将父 ID 视为未见, 做出不同替换决策 -> wire 前缀不同 -> 缓存未命中
  - 克隆状态: 做出相同决策 -> wire 前缀相同 -> 缓存命中

对于非 fork 子代理, 父 UUID 永远不会匹配, 克隆是无害的 no-op。
```

---

## runAgent 主循环

### 7.1 执行流程

**文件引用:** `src/tools/AgentTool/runAgent.ts:248-329`

```
runAgent() 异步生成器:

  输入:
    agentDefinition     -- 代理定义 (工具、权限、模型)
    promptMessages      -- 初始提示消息
    toolUseContext       -- 工具使用上下文
    canUseTool          -- 权限检查函数
    isAsync             -- 是否后台运行
    forkContextMessages -- fork 上下文消息 (可选)
    availableTools      -- 预计算的工具池
    allowedTools        -- 工具权限规则
    override            -- 覆盖参数 (系统提示/上下文/AgentId)

  流程:
    1. 解析代理模型 (getAgentModel)
    2. 创建/继承 AgentId
    3. 设置 transcript 子目录 (如有)
    4. 注册 Perfetto trace
    5. 处理消息 fork (过滤不完整的 tool calls)
    6. 克隆或创建 readFileState
    7. 获取 user/system context
    8. 可选: 省略 CLAUDE.md (Explore/Plan)
       -> internal_slim_subagent_claudemd = true
    9. 构建系统提示
    10. 注册 frontmatter hooks
    11. 初始化代理专属 MCP 服务器
    12. 解析工具池 (或使用 exactTools)
    13. 构建 CacheSafeParams (回调给调用者)
    14. 进入 query() 循环
    15. 记录 sidechain transcript
    16. 清理 (MCP 服务器、hooks、file state)
```

### 7.2 代理专属 MCP 服务器

**文件引用:** `src/tools/AgentTool/runAgent.ts:95-218`

```typescript
async function initializeAgentMcpServers(
  agentDefinition: AgentDefinition,
  parentClients: MCPServerConnection[],
): Promise<{
  clients: MCPServerConnection[]  // 合并后的客户端列表
  tools: Tools                     // 新工具
  cleanup: () => Promise<void>     // 清理函数
}>
```

MCP 服务器规格支持两种形式:
- **字符串引用**: `"slack"` -> 查找已有配置, 使用 memoized connectToServer (共享)
- **内联定义**: `{ "my-server": { type: "stdio", command: "..." } }` -> 新建连接 (独占)

仅独占连接在代理完成后被清理; 共享连接保持活跃。

### 7.3 CLAUDE.md 省略优化

**文件引用:** `src/tools/AgentTool/runAgent.ts:386-398`

只读代理 (Explore, Plan) 不需要 CLAUDE.md 中的 commit/PR/lint 规则:

```typescript
const shouldOmitClaudeMd =
  agentDefinition.omitClaudeMd &&
  !override?.userContext &&
  getFeatureValue_CACHED_MAY_BE_STALE('internal_slim_subagent_claudemd', true)

const { claudeMd: _omittedClaudeMd, ...userContextNoClaudeMd } = baseUserContext
```

这一优化每周节省 ~5-15 Gtok (基于 3400万+ Explore 调用)。

---

## Fork Subagent 机制

### 8.1 Fork 概述

**文件引用:** `src/tools/AgentTool/forkSubagent.ts:18-39`

Fork 是一种特殊的子代理模式: 子代理继承父代理的完整对话上下文和系统提示, 而非
从空白状态开始。

```
Fork 机制:

  启用条件:
    feature('FORK_SUBAGENT') = true
    NOT coordinatorMode
    NOT nonInteractiveSession

  触发方式:
    AgentTool.call() 中省略 subagent_type 参数
    或使用 /fork <directive> 斜杠命令

  与普通子代理的区别:
    +--------------------+----------------+----------------+
    | 特性               | 普通子代理      | Fork 子代理    |
    +--------------------+----------------+----------------+
    | 上下文             | 空白            | 继承父对话     |
    | 系统提示           | 代理定义的      | 父代理的渲染版 |
    | 工具池             | 代理定义过滤    | 与父完全相同   |
    | Prompt Cache       | 不共享          | 共享父缓存     |
    | 运行模式           | 同步/异步       | 始终异步后台   |
    | subagent_type      | 指定            | 省略           |
    +--------------------+----------------+----------------+
```

### 8.2 Fork 消息构建

**文件引用:** `src/tools/AgentTool/forkSubagent.ts:107-169`

```
Fork 消息结构 (为 prompt cache 共享优化):

  [...history,                           // 完整父对话历史
   assistant(all_tool_uses),             // 完整助手消息 (含所有 tool_use)
   user([                                // 单一用户消息:
     tool_result(id1, placeholder),      //   占位符结果 (所有 fork 相同)
     tool_result(id2, placeholder),      //   占位符结果 (所有 fork 相同)
     tool_result(id3, placeholder),      //   占位符结果 (所有 fork 相同)
     text(<fork_boilerplate>directive)   //   仅此块不同 (per-child)
   ])]

占位符: "Fork started -- processing in background"
```

所有 fork 子代理的 API 请求前缀完全相同, 仅最后的 directive 文本块不同, 最大化
prompt cache 命中率。

### 8.3 Fork 子代理指令模板

**文件引用:** `src/tools/AgentTool/forkSubagent.ts:171-198`

```
<fork_boilerplate>
STOP. READ THIS FIRST.

You are a forked worker process. You are NOT the main agent.

RULES (non-negotiable):
1. Your system prompt says "default to forking." IGNORE IT -- that's for the parent.
   You ARE the fork. Do NOT spawn sub-agents; execute directly.
2. Do NOT converse, ask questions, or suggest next steps
3. Do NOT editorialize or add meta-commentary
4. USE your tools directly: Bash, Read, Write, etc.
5. If you modify files, commit your changes before reporting.
6. Do NOT emit text between tool calls.
7. Stay strictly within your directive's scope.
8. Keep your report under 500 words unless specified.
9. Your response MUST begin with "Scope:".
10. REPORT structured facts, then stop

Output format:
  Scope: <assigned scope>
  Result: <findings>
  Key files: <relevant paths>
  Files changed: <list with commit hash>
  Issues: <if any>
</fork_boilerplate>

<fork_directive>user's actual directive</fork_directive>
```

### 8.4 防递归保护

**文件引用:** `src/tools/AgentTool/forkSubagent.ts:78-89`
```typescript
export function isInForkChild(messages: MessageType[]): boolean {
  return messages.some(m => {
    if (m.type !== 'user') return false
    return m.message.content.some(
      block => block.type === 'text' &&
               block.text.includes(`<${FORK_BOILERPLATE_TAG}>`),
    )
  })
}
```

Fork 子代理保留 Agent 工具 (为了 cache-identical 工具定义), 但在调用时通过
检测消息历史中的 `<fork_boilerplate>` 标签来拒绝递归 fork。

### 8.5 Worktree 隔离

**文件引用:** `src/tools/AgentTool/forkSubagent.ts:205-210`
```typescript
export function buildWorktreeNotice(
  parentCwd: string,
  worktreeCwd: string,
): string {
  return `You've inherited the conversation context above from a parent agent
  working in ${parentCwd}. You are operating in an isolated git worktree at
  ${worktreeCwd} -- same repository, same relative file structure, separate
  working copy. Paths in the inherited context refer to the parent's working
  directory; translate them to your worktree root.`
}
```

---

## 权限过滤三层系统

### 9.1 三层架构

```
权限过滤三层系统:

  Layer 1: 工具过滤 (filterToolsForAgent)
  +-----------------------------------------------------------+
  | 规则:                                                      |
  | - MCP 工具 (mcp__*): 始终允许                              |
  | - ALL_AGENT_DISALLOWED_TOOLS: 所有代理禁止的工具            |
  |   (如 TodoWrite, Config 等交互式工具)                       |
  | - CUSTOM_AGENT_DISALLOWED_TOOLS: 非内置代理禁止的额外工具   |
  | - isAsync && !ASYNC_AGENT_ALLOWED_TOOLS: 异步代理限制       |
  | - Plan Mode: 允许 ExitPlanMode 工具                        |
  +-----------------------------------------------------------+

  Layer 2: 代理定义过滤 (resolveAgentTools)
  +-----------------------------------------------------------+
  | 每个 AgentDefinition 可以指定:                              |
  | - tools: ['Read', 'Grep', 'Bash']  (允许列表)              |
  | - disallowedTools: ['FileWrite']    (禁止列表)              |
  | - tools: ['*']                      (通配符)                |
  |                                                             |
  | 解析顺序:                                                   |
  | 1. tools 中的每个名称匹配可用工具                           |
  | 2. 从结果中排除 disallowedTools                             |
  | 3. 无效工具名记录到 invalidTools 供调试                     |
  +-----------------------------------------------------------+

  Layer 3: 运行时权限检查 (canUseTool / permissions.ts)
  +-----------------------------------------------------------+
  | 每次工具调用时:                                             |
  | - 检查 alwaysAllowRules (会话级)                           |
  | - 检查 settings 中的权限规则                                |
  | - 子代理默认: shouldAvoidPermissionPrompts = true          |
  |   -> 异步代理不弹出权限对话框, 而是跳过                     |
  | - 权限冒泡: permissionMode = 'bubble'                      |
  |   -> fork 子代理的权限弹到父终端                            |
  +-----------------------------------------------------------+
```

### 9.2 工具过滤实现

**文件引用:** `src/tools/AgentTool/agentToolUtils.ts:70-100`
```typescript
export function filterToolsForAgent({
  tools, isBuiltIn, isAsync = false, permissionMode,
}: { ... }): Tools {
  return tools.filter(tool => {
    if (tool.name.startsWith('mcp__')) return true           // MCP 始终允许
    if (toolMatchesName(tool, EXIT_PLAN_MODE_V2_TOOL_NAME)
        && permissionMode === 'plan') return true            // Plan Mode
    if (ALL_AGENT_DISALLOWED_TOOLS.has(tool.name)) return false
    if (!isBuiltIn && CUSTOM_AGENT_DISALLOWED_TOOLS.has(tool.name)) return false
    if (isAsync && !ASYNC_AGENT_ALLOWED_TOOLS.has(tool.name)) return false
    return true
  })
}
```

### 9.3 allowedTools 注入

**文件引用:** `src/utils/forkedAgent.ts:147-171`

```typescript
export function createGetAppStateWithAllowedTools(
  baseGetAppState: ToolUseContext['getAppState'],
  allowedTools: string[],
): ToolUseContext['getAppState'] {
  if (allowedTools.length === 0) return baseGetAppState
  return () => {
    const appState = baseGetAppState()
    return {
      ...appState,
      toolPermissionContext: {
        ...appState.toolPermissionContext,
        alwaysAllowRules: {
          ...appState.toolPermissionContext.alwaysAllowRules,
          command: [
            ...new Set([
              ...(appState.toolPermissionContext.alwaysAllowRules.command || []),
              ...allowedTools,
            ]),
          ],
        },
      },
    }
  }
}
```

当 `allowedTools` 被提供时, 替换所有允许规则, 使子代理仅拥有显式列出的工具权限。

---

## 资源共享与隔离策略

### 10.1 共享 vs 隔离矩阵

```
+---------------------------+----------+----------+----------+
| 资源                      | 默认隔离 | 可选共享 | 始终共享 |
+---------------------------+----------+----------+----------+
| readFileState             |    X     |          |          |
| nestedMemoryTriggers      |    X     |          |          |
| dynamicSkillDirTriggers   |    X     |          |          |
| discoveredSkillNames      |    X     |          |          |
| toolDecisions             |    X     |          |          |
| localDenialTracking       |    X     |    X     |          |
| abortController           |    X*    |    X     |          |
| setAppState               |   no-op  |    X     |          |
| setResponseLength         |   no-op  |    X     |          |
| pushApiMetricsEntry       |   no-op  |    X     |          |
| contentReplacementState   |  clone   |    X     |          |
| setAppStateForTasks       |          |          |    X     |
| updateAttributionState    |          |          |    X     |
| fileReadingLimits         |          |          |    X     |
| userModified              |          |          |    X     |
+---------------------------+----------+----------+----------+
* 新建子控制器, 链接到父 (父 abort 传播)

UI 回调: 全部 undefined (子代理不能控制父 UI)
```

### 10.2 关键共享: setAppStateForTasks

**文件引用:** `src/utils/forkedAgent.ts:415-417`
```typescript
setAppStateForTasks:
  parentContext.setAppStateForTasks ?? parentContext.setAppState,
```

即使 `setAppState` 是 no-op (异步子代理), 任务注册/终止也必须到达根存储, 否则
后台 bash 任务成为僵尸进程 (PPID=1)。

---

## 状态管理

### 11.1 state/ 目录结构

| 文件 | 职责 |
|------|------|
| `AppState.tsx` | React 上下文 Provider, Store 创建 |
| `AppStateStore.ts` | AppState 类型定义, 默认值 |
| `store.ts` | 通用 Store 实现 |
| `selectors.ts` | 状态选择器 |
| `onChangeAppState.ts` | 状态变更处理 |
| `teammateViewHelpers.ts` | 队友视图辅助 |

### 11.2 Store 实现

**文件引用:** `src/state/store.ts:1-35`

极简的发布-订阅存储:

```typescript
export function createStore<T>(
  initialState: T,
  onChange?: OnChange<T>,
): Store<T> {
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

使用 `Object.is` 而非 `===` 进行相等性检查, 然后通知所有监听者。

### 11.3 AppState 核心字段

**文件引用:** `src/state/AppStateStore.ts:89-120`

```typescript
type AppState = DeepImmutable<{
  settings: SettingsJson
  mainLoopModel: ModelSetting
  toolPermissionContext: ToolPermissionContext  // 权限上下文
  kairosEnabled: boolean                        // 助手模式
  remoteSessionUrl: string | undefined          // 远程会话
  // MCP 相关
  mcpClients: MCPServerConnection[]             // MCP 客户端列表
  mcpResources: Record<string, ServerResource[]>
  // 代理相关
  agent: string | undefined                     // --agent 标志
  // 推测执行
  speculationState: SpeculationState
  // ...更多字段
}>
```

---

## Bridge 通信机制

### 12.1 Bridge 目录概览

`src/bridge/` 包含 30+ 文件, 实现了 上游工具与外部系统的桥接:

| 文件 | 职责 |
|------|------|
| `bridgeMain.ts` | Bridge 主入口 |
| `bridgeMessaging.ts` | 消息传递 |
| `bridgePermissionCallbacks.ts` | 权限回调 |
| `bridgeConfig.ts` | 配置管理 |
| `bridgeApi.ts` | API 通信 |
| `replBridge.ts` | REPL 桥接 |
| `replBridgeTransport.ts` | REPL 传输层 |
| `sessionRunner.ts` | 会话运行器 |
| `createSession.ts` | 会话创建 |
| `inboundMessages.ts` | 入站消息处理 |
| `inboundAttachments.ts` | 入站附件处理 |
| `jwtUtils.ts` | JWT 工具 |
| `trustedDevice.ts` | 可信设备 |
| `remoteBridgeCore.ts` | 远程 bridge 核心 |

### 12.2 Bridge 与 Subagent 的关系

Bridge 主要服务于:
1. SDK 集成 (SDK 进程 <-> CLI 进程)
2. 远程会话管理
3. 权限中继 (类似 Channel Permission)

子代理通过 `toolUseContext` 间接使用 bridge 功能, 不直接与 bridge 交互。

---

## 代理间通信与 Teammate 系统

### 13.1 SendMessage 工具

子代理可以通过 `SendMessage` 工具向其他命名代理发送消息:

```typescript
// AgentTool 输入 Schema 中的可寻址性
name: z.string().optional().describe(
  'Name for the spawned agent. Makes it addressable via '
  + 'SendMessage({to: name}) while running.'
)
```

### 13.2 In-Process Teammate

**文件引用:** `src/utils/agentContext.ts:57-85`

Teammate 是 Swarm 系统的一部分, 与 Subagent 的区别:

```
Subagent vs Teammate:

  Subagent (Agent tool):
    - 在进程内运行
    - 快速、委托式任务
    - 由 SubagentContext 跟踪
    - 单向: 父 -> 子 -> 完成

  In-Process Teammate:
    - 在进程内运行 (共享终端)
    - 有团队协调
    - 由 TeammateAgentContext 跟踪
    - 双向: 可通过 SendMessage 通信

  Out-of-Process Teammate:
    - tmux/iTerm2 独立进程
    - 通过环境变量传递上下文:
      CLAUDE_CODE_AGENT_ID
      CLAUDE_CODE_PARENT_SESSION_ID
```

---

## Prompt Cache 共享策略

### 14.1 CacheSafeParams

**文件引用:** `src/utils/forkedAgent.ts:57-68`

```typescript
export type CacheSafeParams = {
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  toolUseContext: ToolUseContext
  forkContextMessages: Message[]
}
```

Prompt Cache 的键由以下组成:
- system prompt
- tools (工具定义)
- model
- messages (前缀)
- thinking config

### 14.2 Cache 共享工作流

```
Prompt Cache 共享流程:

  主代理完成一轮对话
       |
  handleStopHooks 保存 CacheSafeParams
  (saveCacheSafeParams)
       |
  后续 fork/skill/命令可获取:
  getLastCacheSafeParams()
       |
  创建 fork 子代理时:
  - 使用完全相同的 systemPrompt
  - 使用完全相同的 toolUseContext
  - 使用完全相同的 forkContextMessages (前缀)
  - 仅最后的 directive 不同
       |
  API 请求:
  [系统提示 | 工具 | 历史消息... | 占位符结果... | directive ]
                                                    ^^^^^
                                              仅此处不同
       |
  结果: prompt cache 命中率极高
```

### 14.3 Cache 破坏防护

- `contentReplacementState` 克隆确保相同的替换决策
- `thinkingConfig` 从继承的 `toolUseContext.options` 获取 (不修改)
- `maxOutputTokens` 会影响 `budget_tokens`, 可能破坏缓存 (有文档警告)
- `useExactTools: true` 跳过 `resolveAgentTools`, 直接使用父工具池

---

## 亮点发现

### 发现 1: readFileState 的克隆 vs 新建语义

`createSubagentContext` 中, fork 子代理使用 `cloneFileStateCache(parent)` 而非
新建。这不是出于效率, 而是为了 prompt cache 一致性: 克隆状态会对父消息中的
tool_use_id 做出与父相同的替换决策, 保证 wire 前缀字节相同。如果用新建状态,
相同的 tool_use_id 会被视为"首次遇到", 做出不同决策, 导致缓存未命中。

### 发现 2: CLAUDE.md 省略优化的量化影响

Explore/Plan 代理通过 `omitClaudeMd: true` 省略用户上下文中的 CLAUDE.md 部分。
代码注释估算: 每周 3400万+ Explore 调用, 节省 ~5-15 Gtok。开关通过 GrowthBook
`internal_slim_subagent_claudemd` 控制, 默认开启, 可一键回滚。

### 发现 3: Fork 子代理的脏话过滤器与递归保护

Fork 系统有两个巧妙的安全机制:
1. **防递归**: Fork 子代理保留 Agent 工具 (为了 cache 一致性), 但通过检测消息
   历史中的 `<fork_boilerplate>` 标签在运行时拒绝递归 fork。
2. **指令模板**: 10 条不可协商的规则明确告诉子代理"你是 fork, 不是主代理",
   并要求以"Scope:"开头的结构化输出。

### 发现 4: setAppStateForTasks 的僵尸进程防护

即使子代理的 `setAppState` 被设为 no-op (防止异步代理修改全局状态),
`setAppStateForTasks` 始终指向根存储。原因: 如果后台 bash 任务的注册/终止
不到达根存储, 这些任务在代理完成后将成为 PPID=1 的僵尸进程。

### 发现 5: AsyncLocalStorage 而非 AppState 的并发安全设计

选择 AsyncLocalStorage 而非将代理上下文放入 AppState 的决策有明确的并发原因:
当用户 ctrl+b 将代理后台化后, 多个代理在同一进程中并发运行。AppState 是单一
共享状态, Agent A 的写入会覆盖 Agent B 的上下文, 导致遥测数据归因错误。
AsyncLocalStorage 通过 Node.js 的异步上下文传播机制自然隔离每个代理的执行链。

### 发现 6: CacheSafeParams 的全局单例缓存

`lastCacheSafeParams` 是一个模块级全局变量, 由 `handleStopHooks` 在每轮对话后
更新。这允许后续的 prompt suggestion、post-turn summary、/btw 命令等"寄生"在
主代理的 prompt cache 上, 而无需每个调用者都手动传递参数。

### 发现 7: 代理工具池的 MCP 特权

`filterToolsForAgent` 中, MCP 工具 (`mcp__*` 前缀) 无条件通过所有过滤层。
这意味着 MCP 工具不受 `ALL_AGENT_DISALLOWED_TOOLS`、`CUSTOM_AGENT_DISALLOWED_TOOLS`
和 `ASYNC_AGENT_ALLOWED_TOOLS` 的约束。设计意图: MCP 工具由外部服务提供,
其可用性不应受 上游工具内部的代理类型限制影响。
