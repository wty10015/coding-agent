# 09 - 系统提示与工具系统

> 源码路径: `src/` (基于 `sourcecode/src/`)

---

## 目录

1. [架构总览](#1-架构总览)
2. [Tool 接口定义 — 工具的形状](#2-tool-接口定义--工具的形状)
3. [工具注册表 — tools.ts](#3-工具注册表--toolsts)
4. [完整工具目录](#4-完整工具目录)
5. [工具构建器 — buildTool()](#5-工具构建器--buildtool)
6. [系统提示构建 — prompts.ts](#6-系统提示构建--promptsts)
7. [系统提示分段机制](#7-系统提示分段机制)
8. [工具描述与 API Schema 传递](#8-工具描述与-api-schema-传递)
9. [延迟加载与 ToolSearch](#9-延迟加载与-toolsearch)
10. [工具权限系统](#10-工具权限系统)
11. [Bash 工具安全系统](#11-bash-工具安全系统)
12. [MCP 工具集成](#12-mcp-工具集成)
13. [工具服务层](#13-工具服务层)
14. [亮点发现](#14-亮点发现)

---

## 1. 架构总览

上游工具的工具系统是一个分层架构, 从底层的工具定义到顶层的系统提示构建,
形成完整的 "让模型知道有哪些工具、如何使用工具" 的闭环。

```
+------------------------------------------------------------------+
|                      系统提示 (System Prompt)                     |
|  +------------------------------------------------------------+  |
|  | 静态部分 (可缓存)           | 动态部分 (每轮重算)            |  |
|  | - 角色定义                  | - 环境信息                    |  |
|  | - 行为规范                  | - MCP 指令                    |  |
|  | - 工具使用指导              | - 内存文件                    |  |
|  | - 安全规则                  | - 语言/样式偏好               |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                      API Schema 构建                              |
|  tools[] -> toolToAPISchema() -> BetaToolUnion[]                 |
|  - 名称、描述 (prompt())、inputSchema                             |
|  - 延迟加载: defer_loading: true                                  |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                      工具注册表 (tools.ts)                        |
|  getAllBaseTools() -> getTools() -> assembleToolPool()            |
|  + MCP 工具 + 权限过滤 + 特性门控                                |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                      Tool 接口 (Tool.ts)                         |
|  call(), checkPermissions(), description(), prompt()             |
|  inputSchema, isReadOnly(), isConcurrencySafe()                  |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                 各工具实现 (tools/XxxTool/)                       |
|  BashTool, FileEditTool, GrepTool, AgentTool ...                 |
+------------------------------------------------------------------+
```

---

## 2. Tool 接口定义 -- 工具的形状

**文件**: `Tool.ts`

### 2.1 核心 Tool 类型

这不是一个类, 而是一个 TypeScript 类型。每个工具是一个满足 `Tool` 类型的普通对象:

```typescript
// Tool.ts:362-695
export type Tool<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  P extends ToolProgressData = ToolProgressData,
> = {
  readonly name: string
  aliases?: string[]
  searchHint?: string

  // === 核心方法 ===
  call(args, context, canUseTool, parentMessage, onProgress?): Promise<ToolResult<Output>>
  description(input, options): Promise<string>
  prompt(options): Promise<string>

  // === Schema ===
  readonly inputSchema: Input                    // Zod schema
  readonly inputJSONSchema?: ToolInputJSONSchema  // MCP 工具的原生 JSON Schema

  // === 行为标记 ===
  isConcurrencySafe(input): boolean
  isEnabled(): boolean
  isReadOnly(input): boolean
  isDestructive?(input): boolean
  interruptBehavior?(): 'cancel' | 'block'
  isSearchOrReadCommand?(input): { isSearch, isRead, isList? }

  // === 权限 ===
  validateInput?(input, context): Promise<ValidationResult>
  checkPermissions(input, context): Promise<PermissionResult>
  preparePermissionMatcher?(input): Promise<(pattern: string) => boolean>

  // === 渲染 ===
  renderToolUseMessage(input, options): React.ReactNode
  renderToolResultMessage?(content, progressMessages, options): React.ReactNode
  renderToolUseProgressMessage?(progressMessages, options): React.ReactNode
  renderGroupedToolUse?(toolUses, options): React.ReactNode | null

  // === 映射与序列化 ===
  mapToolResultToToolResultBlockParam(content, toolUseID): ToolResultBlockParam
  toAutoClassifierInput(input): unknown
  userFacingName(input): string

  // === 尺寸与缓存 ===
  maxResultSizeChars: number
  readonly shouldDefer?: boolean
  readonly alwaysLoad?: boolean
  readonly strict?: boolean

  // === MCP 相关 ===
  isMcp?: boolean
  mcpInfo?: { serverName: string; toolName: string }
}
```

### 2.2 ToolUseContext — 工具执行上下文

```typescript
// Tool.ts:158-300
export type ToolUseContext = {
  options: {
    commands: Command[]
    debug: boolean
    mainLoopModel: string
    tools: Tools
    verbose: boolean
    thinkingConfig: ThinkingConfig
    mcpClients: MCPServerConnection[]
    isNonInteractiveSession: boolean
    agentDefinitions: AgentDefinitionsResult
    maxBudgetUsd?: number
    customSystemPrompt?: string
    appendSystemPrompt?: string
    refreshTools?: () => Tools
  }
  abortController: AbortController
  readFileState: FileStateCache
  getAppState(): AppState
  setAppState(f: (prev: AppState) => AppState): void
  messages: Message[]
  setInProgressToolUseIDs: (f: (prev: Set<string>) => Set<string>) => void
  setResponseLength: (f: (prev: number) => number) => void
  updateFileHistoryState: (updater) => void
  updateAttributionState: (updater) => void
  // ... 更多字段
}
```

### 2.3 ToolResult — 工具返回值

```typescript
// Tool.ts:321-336
export type ToolResult<T> = {
  data: T
  newMessages?: (UserMessage | AssistantMessage | AttachmentMessage | SystemMessage)[]
  contextModifier?: (context: ToolUseContext) => ToolUseContext
  mcpMeta?: {
    _meta?: Record<string, unknown>
    structuredContent?: Record<string, unknown>
  }
}
```

`contextModifier` 允许工具修改执行上下文 (例如更新文件状态缓存),
但此机制仅对非并发工具生效。

### 2.4 Tools 集合类型

```typescript
// Tool.ts:701
export type Tools = readonly Tool[]
```

---

## 3. 工具注册表 -- tools.ts

**文件**: `tools.ts`

### 3.1 getAllBaseTools() — 全量工具源

这是所有工具的唯一真实来源 (Source of Truth):

```typescript
// tools.ts:193-251
export function getAllBaseTools(): Tools {
  return [
    AgentTool,
    TaskOutputTool,
    BashTool,
    ...(hasEmbeddedSearchTools() ? [] : [GlobTool, GrepTool]),
    ExitPlanModeV2Tool,
    FileReadTool,
    FileEditTool,
    FileWriteTool,
    NotebookEditTool,
    WebFetchTool,
    TodoWriteTool,
    WebSearchTool,
    TaskStopTool,
    AskUserQuestionTool,
    SkillTool,
    EnterPlanModeTool,
    // ... 条件性工具 (ant-only, feature-gated)
    BriefTool,
    ListMcpResourcesTool,
    ReadMcpResourceTool,
    ...(isToolSearchEnabledOptimistic() ? [ToolSearchTool] : []),
  ]
}
```

### 3.2 getTools() — 过滤后的工具集

```typescript
// tools.ts:271-327
export const getTools = (permissionContext: ToolPermissionContext): Tools => {
  // 1. Simple 模式: 只有 Bash, Read, Edit
  if (isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE)) {
    return filterToolsByDenyRules([BashTool, FileReadTool, FileEditTool], ...)
  }

  // 2. 过滤特殊工具 (MCP Resources, SyntheticOutput)
  const tools = getAllBaseTools().filter(tool => !specialTools.has(tool.name))

  // 3. 过滤拒绝规则
  let allowedTools = filterToolsByDenyRules(tools, permissionContext)

  // 4. REPL 模式: 隐藏原始工具 (被 REPL 包装)
  if (isReplModeEnabled()) { ... }

  // 5. 过滤禁用工具 (isEnabled() 检查)
  return allowedTools.filter((_, i) => isEnabled[i])
}
```

### 3.3 assembleToolPool() — 最终工具池

```typescript
// tools.ts:345-367
export function assembleToolPool(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  const builtInTools = getTools(permissionContext)
  const allowedMcpTools = filterToolsByDenyRules(mcpTools, permissionContext)

  // 排序: 内置工具作为前缀 (缓存稳定性)
  // 去重: uniqBy('name'), 内置工具优先
  const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)
  return uniqBy(
    [...builtInTools].sort(byName).concat(allowedMcpTools.sort(byName)),
    'name',
  )
}
```

### 3.4 工具过滤管线

```
getAllBaseTools()          ~40+ 工具 (含 feature-gated)
      |
      v
getTools(permCtx)         过滤: deny规则 + isEnabled + REPL + Simple
      |
      v
assembleToolPool()        合并 MCP 工具 + 排序 + 去重
      |
      v
filterToolsByDenyRules()  最终权限过滤
      |
      v
传给 API
```

---

## 4. 完整工具目录

**目录**: `tools/`

以下是源码中发现的所有工具实现:

### 4.1 核心工具 (始终可用)

| 工具名 | 目录 | 描述 |
|--------|------|------|
| `Bash` | `tools/BashTool/` | 执行 shell 命令 |
| `Read` | `tools/FileReadTool/` | 读取文件内容 |
| `Edit` | `tools/FileEditTool/` | 精确编辑文件 (字符串替换) |
| `Write` | `tools/FileWriteTool/` | 创建或覆盖文件 |
| `Glob` | `tools/GlobTool/` | 文件模式匹配搜索 |
| `Grep` | `tools/GrepTool/` | 文件内容正则搜索 (基于 ripgrep) |
| `NotebookEdit` | `tools/NotebookEditTool/` | 编辑 Jupyter Notebook 单元格 |
| `WebFetch` | `tools/WebFetchTool/` | 获取 URL 内容 |
| `WebSearch` | `tools/WebSearchTool/` | 网络搜索 |

### 4.2 代理与任务工具

| 工具名 | 目录 | 描述 |
|--------|------|------|
| `Agent` | `tools/AgentTool/` | 创建子代理/fork |
| `TaskOutput` | `tools/TaskOutputTool/` | 读取后台任务输出 |
| `TaskStop` | `tools/TaskStopTool/` | 停止运行中的任务 |
| `SendMessage` | `tools/SendMessageTool/` | 向现有代理发送消息 |
| `AskUserQuestion` | `tools/AskUserQuestionTool/` | 向用户提问 |
| `TodoWrite` | `tools/TodoWriteTool/` | 管理任务清单 |

### 4.3 任务管理 V2 工具 (条件启用)

| 工具名 | 目录 | 描述 |
|--------|------|------|
| `TaskCreate` | `tools/TaskCreateTool/` | 创建任务 |
| `TaskGet` | `tools/TaskGetTool/` | 获取任务详情 |
| `TaskUpdate` | `tools/TaskUpdateTool/` | 更新任务状态 |
| `TaskList` | `tools/TaskListTool/` | 列出所有任务 |

### 4.4 模式与计划工具

| 工具名 | 目录 | 描述 |
|--------|------|------|
| `EnterPlanMode` | `tools/EnterPlanModeTool/` | 进入计划模式 |
| `ExitPlanModeV2` | `tools/ExitPlanModeTool/` | 退出计划模式 |
| `EnterWorktree` | `tools/EnterWorktreeTool/` | 进入 Git Worktree |
| `ExitWorktree` | `tools/ExitWorktreeTool/` | 退出 Git Worktree |

### 4.5 技能与搜索工具

| 工具名 | 目录 | 描述 |
|--------|------|------|
| `Skill` | `tools/SkillTool/` | 执行用户定义的技能 (斜杠命令) |
| `ToolSearch` | `tools/ToolSearchTool/` | 搜索和发现可用工具 |
| `Brief` | `tools/BriefTool/` | 简报工具 |

### 4.6 MCP 资源工具

| 工具名 | 目录 | 描述 |
|--------|------|------|
| `ListMcpResources` | `tools/ListMcpResourcesTool/` | 列出 MCP 服务器资源 |
| `ReadMcpResource` | `tools/ReadMcpResourceTool/` | 读取 MCP 资源 |
| `MCPTool` | `tools/MCPTool/` | MCP 工具通用实现 |
| `McpAuth` | `tools/McpAuthTool/` | MCP 认证 |

### 4.7 团队工具

| 工具名 | 目录 | 描述 |
|--------|------|------|
| `TeamCreate` | `tools/TeamCreateTool/` | 创建团队 (agent swarms) |
| `TeamDelete` | `tools/TeamDeleteTool/` | 删除团队 |
| `ListPeers` | `tools/ListPeersTool/` | 列出对等节点 (UDS Inbox) |

### 4.8 特性门控工具 (Feature-Gated)

| 工具名 | 目录 | Feature Gate | 描述 |
|--------|------|-------------|------|
| `Sleep` | `tools/SleepTool/` | PROACTIVE/KAIROS | 等待指定时间 |
| `CronCreate` | `tools/ScheduleCronTool/` | AGENT_TRIGGERS | 创建定时任务 |
| `CronDelete` | `tools/ScheduleCronTool/` | AGENT_TRIGGERS | 删除定时任务 |
| `CronList` | `tools/ScheduleCronTool/` | AGENT_TRIGGERS | 列出定时任务 |
| `RemoteTrigger` | `tools/RemoteTriggerTool/` | AGENT_TRIGGERS_REMOTE | 远程触发 |
| `Monitor` | `tools/MonitorTool/` | MONITOR_TOOL | 监控工具 |
| `SendUserFile` | `tools/SendUserFileTool/` | KAIROS | 发送文件给用户 |
| `PushNotification` | `tools/PushNotificationTool/` | KAIROS | 推送通知 |
| `SubscribePR` | `tools/SubscribePRTool/` | KAIROS_GITHUB_WEBHOOKS | 订阅 PR 活动 |
| `WebBrowser` | `tools/WebBrowserTool/` | WEB_BROWSER_TOOL | 浏览器自动化 |
| `TerminalCapture` | `tools/TerminalCaptureTool/` | TERMINAL_PANEL | 终端捕获 |
| `CtxInspect` | `tools/CtxInspectTool/` | CONTEXT_COLLAPSE | 上下文检查 |
| `Snip` | `tools/SnipTool/` | HISTORY_SNIP | 历史裁剪 |
| `Workflow` | `tools/WorkflowTool/` | WORKFLOW_SCRIPTS | 工作流脚本 |

### 4.9 内部/测试工具

| 工具名 | 目录 | 条件 | 描述 |
|--------|------|------|------|
| `Config` | `tools/ConfigTool/` | ant-only | 配置管理 |
| `Tungsten` | `tools/TungstenTool/` | ant-only | 虚拟终端 |
| `REPL` | `tools/REPLTool/` | ant-only | REPL 包装器 |
| `SuggestBackgroundPR` | `tools/SuggestBackgroundPRTool/` | ant-only | 建议后台 PR |
| `OverflowTest` | `tools/OverflowTestTool/` | OVERFLOW_TEST_TOOL | 溢出测试 |
| `TestingPermission` | `tools/testing/` | NODE_ENV=test | 测试专用 |
| `VerifyPlanExecution` | `tools/VerifyPlanExecutionTool/` | env var | 计划验证 |
| `SyntheticOutput` | `tools/SyntheticOutputTool/` | 特殊 | 结构化输出 |
| `LSP` | `tools/LSPTool/` | ENABLE_LSP_TOOL | 语言服务器协议 |
| `PowerShell` | `tools/PowerShellTool/` | Windows | PowerShell 执行 |

### 4.10 共享工具模块

| 文件 | 描述 |
|------|------|
| `tools/shared/` | 跨工具共享的 git 操作追踪等 |
| `tools/utils.ts` | 工具通用工具函数 |

---

## 5. 工具构建器 -- buildTool()

**文件**: `Tool.ts:783-792`

### 5.1 安全默认值

```typescript
// Tool.ts:757-769
const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: (_input?) => false,       // fail-closed: 假设不安全
  isReadOnly: (_input?) => false,               // fail-closed: 假设写操作
  isDestructive: (_input?) => false,
  checkPermissions: (input, _ctx?) =>
    Promise.resolve({ behavior: 'allow', updatedInput: input }),
  toAutoClassifierInput: (_input?) => '',        // 跳过分类器
  userFacingName: (_input?) => '',
}
```

### 5.2 buildTool 函数

```typescript
// Tool.ts:783-792
export function buildTool<D extends AnyToolDef>(def: D): BuiltTool<D> {
  return {
    ...TOOL_DEFAULTS,
    userFacingName: () => def.name,
    ...def,
  } as BuiltTool<D>
}
```

运行时语义: `{ ...默认值, userFacingName: () => 工具名, ...工具自身定义 }`

所有 60+ 个工具都通过 `buildTool()` 构建, 保证默认值集中管理。

### 5.3 ToolDef — 允许省略默认方法

```typescript
// Tool.ts:721-726
export type ToolDef<...> = Omit<Tool<...>, DefaultableToolKeys> &
  Partial<Pick<Tool<...>, DefaultableToolKeys>>
```

可省略的方法:
- `isEnabled`
- `isConcurrencySafe`
- `isReadOnly`
- `isDestructive`
- `checkPermissions`
- `toAutoClassifierInput`
- `userFacingName`

---

## 6. 系统提示构建 -- prompts.ts

**文件**: `constants/prompts.ts`

### 6.1 getSystemPrompt() — 主入口

```typescript
// prompts.ts:444-577
export async function getSystemPrompt(
  tools: Tools,
  model: string,
  additionalWorkingDirectories?: string[],
  mcpClients?: MCPServerConnection[],
): Promise<string[]> {
```

返回一个字符串数组, 每个元素是一个系统提示段。

### 6.2 系统提示结构

```
+--- 静态内容 (可跨用户缓存) ---+
|                                |
| 1. 简介 (getSimpleIntroSection)|
|    - 角色定义                   |
|    - 网络安全风险指令           |
|                                |
| 2. 系统规则 (getSimpleSystem)  |
|    - 输出格式 (Markdown)       |
|    - 权限模式说明               |
|    - system-reminder 标签       |
|    - 钩子说明                   |
|    - 自动压缩说明               |
|                                |
| 3. 任务执行 (getSimpleDoingTasks)|
|    - 代码风格规范               |
|    - 安全编码要求               |
|    - 不做多余的事               |
|                                |
| 4. 谨慎执行 (getActionsSection)|
|    - 可逆性评估                 |
|    - 爆炸半径评估               |
|    - 危险操作示例               |
|                                |
| 5. 工具使用 (getUsingYourTools)|
|    - 优先用专用工具而非 Bash    |
|    - 并行工具调用               |
|    - 任务管理                   |
|                                |
| 6. 语调风格 (getSimpleToneAndStyle)|
|    - 不用 emoji                 |
|    - 引用代码格式               |
|                                |
| 7. 输出效率 (getOutputEfficiency)|
|    - 简洁直接                   |
|                                |
+================================+
| SYSTEM_PROMPT_DYNAMIC_BOUNDARY |
+================================+
|                                |
+--- 动态内容 (每轮/每会话) ---+ |
|                                |
| 8. 会话特定指导                |
|    - AskUserQuestion 使用       |
|    - Agent 工具使用             |
|    - 技能发现                   |
|    - 验证代理                   |
|                                |
| 9. 内存文件 (CLAUDE.md)       |
|                                |
| 10. 环境信息                   |
|     - CWD, Git, 平台           |
|     - 模型名称, 知识截止日期    |
|                                |
| 11. 语言偏好                   |
|                                |
| 12. 输出样式                   |
|                                |
| 13. MCP 服务器指令             |
|                                |
| 14. Scratchpad 指令            |
|                                |
| 15. 函数结果清理               |
|                                |
| 16. 工具结果摘要               |
|                                |
+--------------------------------+
```

### 6.3 动态边界标记

```typescript
// prompts.ts:114-115
export const SYSTEM_PROMPT_DYNAMIC_BOUNDARY =
  '__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__'
```

此标记分隔静态内容和动态内容:
- **之前** (`scope: 'global'`): 可跨组织缓存, 所有用户看到相同内容
- **之后**: 包含用户/会话特定内容, 不可共享缓存

### 6.4 关键系统提示段落分析

#### 角色定义

```typescript
// prompts.ts:179-183
function getSimpleIntroSection(...): string {
  return `You are an interactive agent that helps users with software engineering tasks.
  ...
  IMPORTANT: You must NEVER generate or guess URLs for the user...`
}
```

#### 工具使用指导

```typescript
// prompts.ts:269-314
function getUsingYourToolsSection(enabledTools: Set<string>): string {
  // 核心指导: 用专用工具而非 Bash
  const items = [
    `Do NOT use Bash to run commands when a relevant dedicated tool is provided.`,
    // Read 代替 cat/head/tail
    // Edit 代替 sed/awk
    // Write 代替 heredoc/echo 重定向
    // Glob 代替 find/ls
    // Grep 代替 grep/rg
    `You can call multiple tools in a single response. If you intend to call
     multiple tools and there are no dependencies between them, make all
     independent tool calls in parallel.`,
  ]
}
```

#### 谨慎执行段落

```typescript
// prompts.ts:255-267
function getActionsSection(): string {
  return `# Executing actions with care
  Carefully consider the reversibility and blast radius of actions...
  Examples of risky actions:
  - Destructive operations: deleting files, dropping tables, rm -rf
  - Hard-to-reverse: force-pushing, git reset --hard
  - Actions visible to others: pushing code, creating PRs, sending messages
  ...`
}
```

---

## 7. 系统提示分段机制

**文件**: `constants/systemPromptSections.ts`

### 7.1 分段类型

```typescript
// systemPromptSections.ts:8-14
type SystemPromptSection = {
  name: string
  compute: ComputeFn
  cacheBreak: boolean
}
```

### 7.2 两种分段创建器

**缓存分段** — 计算一次, 直到 `/clear` 或 `/compact` 前复用:

```typescript
// systemPromptSections.ts:20-25
export function systemPromptSection(
  name: string,
  compute: ComputeFn,
): SystemPromptSection {
  return { name, compute, cacheBreak: false }
}
```

**非缓存分段** — 每轮重新计算 (会破坏 prompt cache):

```typescript
// systemPromptSections.ts:32-38
export function DANGEROUS_uncachedSystemPromptSection(
  name: string,
  compute: ComputeFn,
  _reason: string,  // 必须提供原因
): SystemPromptSection {
  return { name, compute, cacheBreak: true }
}
```

函数名中的 `DANGEROUS_` 前缀是有意为之的 — 它提醒开发者每次使用都会破坏缓存,
需要充分理由。

### 7.3 解析机制

```typescript
// systemPromptSections.ts:43-58
export async function resolveSystemPromptSections(
  sections: SystemPromptSection[],
): Promise<(string | null)[]> {
  const cache = getSystemPromptSectionCache()
  return Promise.all(
    sections.map(async s => {
      if (!s.cacheBreak && cache.has(s.name)) {
        return cache.get(s.name) ?? null  // 命中缓存
      }
      const value = await s.compute()
      setSystemPromptSectionCacheEntry(s.name, value)
      return value
    }),
  )
}
```

---

## 8. 工具描述与 API Schema 传递

### 8.1 工具到 API 的转换链

每个工具有两个描述性方法:

1. **`description(input, options)`** — 为 API 生成工具描述
2. **`prompt(options)`** — 更详细的使用说明, 嵌入系统提示

```
Tool 对象
   |
   +-- name: "Bash"
   +-- inputSchema: z.object({ command: z.string(), ... })
   +-- description(input): "Execute a shell command..."
   +-- prompt(): "IMPORTANT: Avoid using this tool to run find..."
   |
   v
toolToAPISchema(tool) [utils/api.ts]
   |
   v
BetaToolUnion
   {
     name: "Bash",
     description: "Execute a shell command...",
     input_schema: { type: "object", properties: { command: {...} } },
     // 或 defer_loading: true (延迟加载)
   }
```

### 8.2 Description 动态性

工具的 `description` 方法可以根据权限上下文动态调整:

```typescript
// Tool.ts:386-393
description(
  input: z.infer<Input>,
  options: {
    isNonInteractiveSession: boolean
    toolPermissionContext: ToolPermissionContext
    tools: Tools
  },
): Promise<string>
```

### 8.3 Prompt 方法

`prompt()` 返回更长的工具使用说明, 包含详细的行为指导:

```typescript
// Tool.ts:518-523
prompt(options: {
  getToolPermissionContext: () => Promise<ToolPermissionContext>
  tools: Tools
  agents: AgentDefinition[]
  allowedAgentTypes?: string[]
}): Promise<string>
```

---

## 9. 延迟加载与 ToolSearch

### 9.1 延迟工具判定

```typescript
// Tool.ts:441-449
readonly shouldDefer?: boolean    // 是否延迟加载
readonly alwaysLoad?: boolean     // 是否永不延迟
```

当工具总数超过阈值时, `isToolSearchEnabled()` 返回 true,
系统会将大部分工具标记为 `defer_loading: true`:

```
所有工具
   |
   +-- alwaysLoad = true 的工具 -> 完整 schema
   +-- shouldDefer = true 的工具 -> 仅名称 + 描述 (defer_loading: true)
   +-- ToolSearch 工具本身 -> 完整 schema
```

### 9.2 工具发现流程

```
模型需要使用一个延迟工具
       |
       v
  调用 ToolSearch({ query: "select:ToolName" })
       |
       v
  ToolSearch 返回工具信息, 记录到 discoveredToolNames
       |
       v
  下一轮 API 调用, claude.ts 检查 discoveredToolNames
       |
       v
  被发现的工具以完整 schema 发送
       |
       v
  模型现在可以正确调用该工具
```

### 9.3 Schema 未发送检测

```typescript
// toolExecution.ts:578-596
export function buildSchemaNotSentHint(tool, messages, tools): string | null {
  if (!isToolSearchEnabledOptimistic()) return null
  if (!isToolSearchToolAvailable(tools)) return null
  if (!isDeferredTool(tool)) return null
  const discovered = extractDiscoveredToolNames(messages)
  if (discovered.has(tool.name)) return null
  return `This tool's schema was not sent to the API...
    Load the tool first: call ToolSearch with query "select:${tool.name}"`
}
```

当模型尝试调用一个延迟工具但其 schema 未被发送时, Zod 验证会失败
(类型参数被当作字符串), 系统会附加一个提示, 引导模型先调用 ToolSearch。

---

## 10. 工具权限系统

### 10.1 权限上下文

```typescript
// Tool.ts:123-138
export type ToolPermissionContext = DeepImmutable<{
  mode: PermissionMode
  additionalWorkingDirectories: Map<string, AdditionalWorkingDirectory>
  alwaysAllowRules: ToolPermissionRulesBySource
  alwaysDenyRules: ToolPermissionRulesBySource
  alwaysAskRules: ToolPermissionRulesBySource
  isBypassPermissionsModeAvailable: boolean
  shouldAvoidPermissionPrompts?: boolean
  awaitAutomatedChecksBeforeDialog?: boolean
  prePlanMode?: PermissionMode
}>
```

### 10.2 权限检查流水线

```
工具调用输入
    |
    v
1. 全局拒绝规则检查 (filterToolsByDenyRules)
    |  - 在工具池组装时就过滤掉
    |  - 模型甚至不会看到被拒绝的工具
    |
    v
2. 工具自定义验证 (tool.validateInput)
    |  - 输入级别的检查
    |
    v
3. PreToolUse 钩子
    |  - 可以修改输入、阻止执行、注入权限决定
    |
    v
4. 工具自定义权限 (tool.checkPermissions)
    |  - 工具级别的特殊逻辑
    |
    v
5. 通用权限系统 (resolveHookPermissionDecision)
    |  - 规则匹配
    |  - 分类器 (auto 模式)
    |  - 沙箱检查
    |  - 工作目录限制
    |
    v
6. 用户确认 (如果 behavior === 'ask')
    |
    v
7. PostToolUse 钩子
```

### 10.3 权限结果类型

```typescript
// 简化表示
type PermissionResult =
  | { behavior: 'allow'; updatedInput: unknown }
  | { behavior: 'deny'; message: string }
  | { behavior: 'ask'; ... }
```

### 10.4 规则匹配

工具可以提供 `preparePermissionMatcher` 来支持细粒度的权限匹配:

```typescript
// Tool.ts:512-516
preparePermissionMatcher?(
  input: z.infer<Input>,
): Promise<(pattern: string) => boolean>
```

例如 BashTool 的匹配器可以匹配命令前缀: `Bash(git *)` 会匹配
所有以 `git` 开头的命令。

---

## 11. Bash 工具安全系统

**文件**: `tools/BashTool/bashPermissions.ts`, `tools/BashTool/bashSecurity.ts`

### 11.1 安全架构

Bash 工具有最复杂的安全系统, 因为 shell 命令的攻击面最大:

```
Bash 命令
    |
    v
bashPermissions.ts
    |
    +--- 命令解析 (shell-quote / tree-sitter)
    |
    +--- 子命令拆分 (splitCommand)
    |     |
    |     +--- 上限: MAX_SUBCOMMANDS_FOR_SECURITY_CHECK = 50
    |
    +--- 对每个子命令:
    |     |
    |     +--- bashSecurity.ts 验证
    |     |    |
    |     |    +--- 命令替换检测 ($(), ``)
    |     |    +--- 进程替换检测 (<(), >())
    |     |    +--- 参数替换检测 (${}):
    |     |    +--- 危险模式检测
    |     |    +--- 输入/输出重定向检测
    |     |    +--- 控制字符检测
    |     |    +--- Unicode 空白检测
    |     |    +--- Zsh 危险命令检测
    |     |    +--- Brace 扩展检测
    |     |    +--- ... 20+ 种检查
    |     |
    |     +--- 路径约束检查 (pathValidation)
    |     +--- sed 约束检查 (sedValidation)
    |     +--- 操作符权限检查 (commandHelpers)
    |     +--- 模式验证 (modeValidation)
    |
    +--- 分类器检查 (bashClassifier)
    |     |
    |     +--- allow 描述匹配
    |     +--- deny 描述匹配
    |     +--- ask 描述匹配
    |
    +--- 沙箱检查 (shouldUseSandbox)
    |
    v
 权限决定: allow / deny / ask
```

### 11.2 危险模式检测

```typescript
// bashSecurity.ts:16-41
const COMMAND_SUBSTITUTION_PATTERNS = [
  { pattern: /<\(/, message: 'process substitution <()' },
  { pattern: />\(/, message: 'process substitution >()' },
  { pattern: /=\(/, message: 'Zsh process substitution =()' },
  { pattern: /(?:^|[\s;&|])=[a-zA-Z_]/, message: 'Zsh equals expansion (=cmd)' },
  { pattern: /\$\(/, message: '$() command substitution' },
  { pattern: /\$\{/, message: '${} parameter substitution' },
  { pattern: /\$\[/, message: '$[] legacy arithmetic expansion' },
  { pattern: /~\[/, message: 'Zsh-style parameter expansion' },
  { pattern: /\(e:/, message: 'Zsh-style glob qualifiers' },
  { pattern: /\(\+/, message: 'Zsh glob qualifier with command execution' },
  { pattern: /\}\s*always\s*\{/, message: 'Zsh always block' },
  { pattern: /<#/, message: 'PowerShell comment syntax' },
]
```

### 11.3 Zsh 危险命令

```typescript
// bashSecurity.ts:43-74
const ZSH_DANGEROUS_COMMANDS = new Set([
  'zmodload',   // 加载危险模块
  'emulate',    // eval 等价
  'sysopen',    // 打开文件
  'sysread',    // 读文件描述符
  'syswrite',   // 写文件描述符
  'sysseek',    // seek 文件描述符
  'zpty',       // 伪终端执行
  'ztcp',       // TCP 连接
  'zsocket',    // Socket 创建
  'zf_rm',      // 内置 rm
  'zf_mv',      // 内置 mv
  'zf_ln',      // 内置 ln
  'zf_chmod',   // 内置 chmod
  // ... 更多
])
```

### 11.4 安全检查 ID

```typescript
// bashSecurity.ts:77-101
const BASH_SECURITY_CHECK_IDS = {
  INCOMPLETE_COMMANDS: 1,
  JQ_SYSTEM_FUNCTION: 2,
  JQ_FILE_ARGUMENTS: 3,
  OBFUSCATED_FLAGS: 4,
  SHELL_METACHARACTERS: 5,
  DANGEROUS_VARIABLES: 6,
  NEWLINES: 7,
  DANGEROUS_PATTERNS_COMMAND_SUBSTITUTION: 8,
  DANGEROUS_PATTERNS_INPUT_REDIRECTION: 9,
  DANGEROUS_PATTERNS_OUTPUT_REDIRECTION: 10,
  IFS_INJECTION: 11,
  GIT_COMMIT_SUBSTITUTION: 12,
  PROC_ENVIRON_ACCESS: 13,
  MALFORMED_TOKEN_INJECTION: 14,
  BACKSLASH_ESCAPED_WHITESPACE: 15,
  BRACE_EXPANSION: 16,
  CONTROL_CHARACTERS: 17,
  UNICODE_WHITESPACE: 18,
  MID_WORD_HASH: 19,
  ZSH_DANGEROUS_COMMANDS: 20,
  BACKSLASH_ESCAPED_OPERATORS: 21,
  COMMENT_QUOTE_DESYNC: 22,
  QUOTED_NEWLINE: 23,
}
```

### 11.5 推测性分类器

```typescript
// bashPermissions.ts (引用自 toolExecution.ts:740-752)
startSpeculativeClassifierCheck(
  command,
  toolPermissionContext,
  signal,
  isNonInteractiveSession,
)
```

分类器在权限检查之前启动, 与 PreToolUse 钩子并行运行。
它使用 3 组描述规则:

```typescript
// bashClassifier.ts (引用)
getBashPromptAllowDescriptions()  // 允许的命令描述
getBashPromptAskDescriptions()    // 需询问的命令描述
getBashPromptDenyDescriptions()   // 拒绝的命令描述
```

### 11.6 命令前缀提取

```typescript
// bashPermissions.ts:161-188
export function getSimpleCommandPrefix(command: string): string | null {
  // 'git commit -m "fix"' -> 'git commit'
  // 'NODE_ENV=prod npm run build' -> 'npm run' (NODE_ENV 是安全变量)
  // 'MY_VAR=val npm run' -> null (MY_VAR 不安全)
  // 'ls -la' -> null (flag, 不是子命令)
}
```

### 11.7 安全环境变量

系统维护一个安全环境变量白名单。只有白名单中的变量赋值才会在权限规则匹配时
被跳过。不安全的环境变量赋值会导致回退到精确匹配而非前缀匹配。

---

## 12. MCP 工具集成

### 12.1 MCP 工具识别

```typescript
// services/mcp/utils.ts (引用)
export function isMcpTool(name: string): boolean {
  return name.startsWith('mcp__')
}
```

MCP 工具名称格式: `mcp__<server_name>__<tool_name>`

### 12.2 MCP 工具合并

```typescript
// tools.ts:345-367
export function assembleToolPool(permCtx, mcpTools): Tools {
  const builtInTools = getTools(permCtx)
  const allowedMcpTools = filterToolsByDenyRules(mcpTools, permCtx)

  // 内置工具排在前面 (缓存稳定性)
  // 同名时内置工具优先 (uniqBy)
  return uniqBy(
    [...builtInTools].sort(byName).concat(allowedMcpTools.sort(byName)),
    'name',
  )
}
```

### 12.3 MCP 服务器指令注入

```typescript
// prompts.ts:579-604
function getMcpInstructions(mcpClients: MCPServerConnection[]): string | null {
  const connectedClients = mcpClients.filter(c => c.type === 'connected')
  const clientsWithInstructions = connectedClients.filter(c => c.instructions)

  if (clientsWithInstructions.length === 0) return null

  return `# MCP Server Instructions
  The following MCP servers have provided instructions:
  ${clientsWithInstructions.map(c => `## ${c.name}\n${c.instructions}`).join('\n\n')}`
}
```

MCP 指令通过 `DANGEROUS_uncachedSystemPromptSection` 注入系统提示,
因为 MCP 服务器可能在轮次之间连接/断开。

### 12.4 MCP 工具的权限控制

MCP 工具同样受到 `filterToolsByDenyRules` 的约束。支持服务器前缀级别的拒绝:
例如 `mcp__server` 规则可以禁用该服务器的所有工具。

---

## 13. 工具服务层

**目录**: `services/tools/`

### 13.1 文件组成

| 文件 | 职责 |
|------|------|
| `StreamingToolExecutor.ts` | 流式并发工具执行器 |
| `toolExecution.ts` | 单工具执行管线 (验证 -> 权限 -> 调用 -> 结果) |
| `toolOrchestration.ts` | 工具编排 (分区 -> 并行/串行) |
| `toolHooks.ts` | PreToolUse / PostToolUse 钩子执行 |

### 13.2 钩子系统

```typescript
// toolHooks.ts (引用)
runPreToolUseHooks(context, tool, input, toolUseID, messageId, ...)
runPostToolUseHooks(context, tool, input, toolUseID, result, ...)
runPostToolUseFailureHooks(context, tool, input, toolUseID, error, ...)
```

PreToolUse 钩子可以返回以下结果:
- `message` — 附加消息
- `hookPermissionResult` — 权限决定
- `hookUpdatedInput` — 修改后的输入
- `preventContinuation` — 阻止继续
- `stopReason` — 停止原因
- `stop` — 完全停止
- `additionalContext` — 额外上下文

### 13.3 工具执行遥测

工具执行过程中产生大量遥测事件:

```
internal_tool_use_cancelled      — 工具被取消
internal_tool_use_error          — 工具出错
internal_tool_use_progress       — 工具进度
internal_tool_use_can_use_tool_rejected — 权限拒绝
internal_tool_use_can_use_tool_allowed  — 权限允许
internal_tool_use_result         — 工具结果
internal_deferred_tool_schema_not_sent — 延迟工具 schema 未发送
```

### 13.4 工具结果大小管理

```typescript
// Tool.ts:458-466
maxResultSizeChars: number
// 超过此值时, 结果被持久化到磁盘
// 设为 Infinity 表示永不持久化 (如 Read 工具, 避免循环读取)
```

```typescript
// toolExecution.ts (引用, 约1290行)
const mappedToolResultBlock = tool.mapToolResultToToolResultBlockParam(
  result.data,
  toolUseID,
)
// 如果结果超过 maxResultSizeChars:
// 1. 保存到文件
// 2. 返回预览 + 文件路径
```

---

## 14. 亮点发现

### 发现 1: DANGEROUS_ 前缀作为代码审查门控

`DANGEROUS_uncachedSystemPromptSection` 函数名中的 `DANGEROUS_` 前缀不仅是命名约定,
更是一种 "代码审查门控"。任何使用此函数的代码都会在 code review 中立刻引起注意,
迫使开发者提供为什么需要破坏缓存的理由 (`_reason` 参数)。这是一种将运营关注点
编码到 API 设计中的巧妙做法。

**代码位置**: `constants/systemPromptSections.ts:32-38`

### 发现 2: 23 种 Bash 安全检查形成纵深防御

`bashSecurity.ts` 实现了 23 种独立的安全检查, 每种都有唯一的数值 ID。
这些检查覆盖了从命令替换 (`$()`) 到 Unicode 空白字符注入、从 Zsh 模块加载
(`zmodload`) 到 PowerShell 注释语法 (`<#`) 的广泛攻击面。这不是简单的黑名单,
而是对 shell 语言语义的深度理解。

**代码位置**: `tools/BashTool/bashSecurity.ts:77-101`

### 发现 3: 工具 Schema 的双轨制

工具同时支持 Zod Schema (`inputSchema`) 和原生 JSON Schema (`inputJSONSchema`)。
内置工具使用 Zod (运行时验证 + TypeScript 类型推导), MCP 工具使用 JSON Schema
(因为 MCP 协议本身就是 JSON Schema 驱动的)。系统在 API 调用时统一转换为 JSON Schema。

**代码位置**: `Tool.ts:395-398`

### 发现 4: 工具池排序的缓存稳定性设计

`assembleToolPool()` 将内置工具和 MCP 工具分别排序后拼接, 而不是做一次扁平排序。
注释解释: 服务器的缓存策略在最后一个前缀匹配的内置工具后放置断点。
如果做扁平排序, MCP 工具会穿插到内置工具之间, 每次 MCP 工具变化都会使
所有后续内置工具的缓存失效。

**代码位置**: `tools.ts:354-366`

### 发现 5: 子代理的工具限制形成安全边界

系统定义了多层工具限制集:

```typescript
ALL_AGENT_DISALLOWED_TOOLS    // 所有代理不能用的工具
CUSTOM_AGENT_DISALLOWED_TOOLS // 自定义代理的限制
ASYNC_AGENT_ALLOWED_TOOLS     // 异步代理允许的工具 (白名单)
COORDINATOR_MODE_ALLOWED_TOOLS // 协调器只能用的工具
IN_PROCESS_TEAMMATE_ALLOWED_TOOLS // 进程内队友额外工具
```

这形成了一个 "最小特权" 的安全边界: 子代理不能调用 `TaskOutput` (防止递归)、
不能调用 `AskUserQuestion` (不能直接与用户交互)、不能进入计划模式等。

**代码位置**: `constants/tools.ts:36-112`

### 发现 6: 系统提示的两阶段缓存策略

系统提示被分为 "静态" 和 "动态" 两部分, 由 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 分隔。
静态部分可以使用 `scope: 'global'` 跨用户缓存 (同一模型版本的所有用户看到相同内容)。
动态部分使用 `systemPromptSection` 机制在会话内缓存。
这两层缓存显著减少了重复计算和 API 令牌消耗。

**代码位置**: `constants/prompts.ts:114-115`, `constants/prompts.ts:560-576`

### 发现 7: buildTool 的类型安全默认值扩展

`buildTool()` 看似简单 (只是 `{ ...TOOL_DEFAULTS, ...def }`), 但其类型系统
(`BuiltTool<D>`) 非常精巧。它在类型层面精确模拟了运行时的展开行为:
如果工具定义了某个方法, 使用工具的类型; 如果没有, 使用默认值的类型。
这确保了 60+ 个工具都能通过类型检查而不需要手动断言。

**代码位置**: `Tool.ts:735-792`

### 发现 8: MCP 指令的 Delta 模式

系统支持一个 "MCP 指令增量" 模式 (`isMcpInstructionsDeltaEnabled`)。
启用时, MCP 服务器的指令不再通过系统提示传递 (避免每次服务器连接/断开时
破坏缓存), 而是通过持久化的 `mcp_instructions_delta` 附件消息传递。
这是缓存优化和功能正确性之间权衡的巧妙解决方案。

**代码位置**: `constants/prompts.ts:513-519`

### 发现 9: 工具的 searchHint 为模型搜索优化

每个工具可以定义一个 `searchHint` 属性 — 一个 3-10 词的能力短语,
用于 ToolSearch 的关键词匹配。规则是 "prefer terms not already in the tool name",
例如 NotebookEdit 的 searchHint 可能是 "jupyter", 因为 "notebook" 和 "edit"
已经在名称中了。这是一种为模型搜索能力而设计的元数据。

**代码位置**: `Tool.ts:376-378`

### 发现 10: 权限规则的多源优先级

权限规则来自多个来源 (`ToolPermissionRulesBySource`):
- `session` — 会话级临时授权
- `localSettings` — 本地设置文件
- `userSettings` — 用户全局设置
- `cliArg` — CLI 参数
- `policySettings` — 组织策略
- `projectSettings` — 项目设置
- `flagSettings` — 功能标志设置

系统在遥测中将这些映射为标准化的 OTel 源:
- `user_temporary` — 会话级允许
- `user_permanent` — 持久化允许
- `user_reject` — 用户拒绝
- `config` — 配置决定
- `hook` — 钩子决定

**代码位置**: `services/tools/toolExecution.ts:181-250`
