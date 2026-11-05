# 上游工具Todo/Task 系统深度解析

## 1. 概述

上游工具实现了两代任务管理系统，同时运行着两个不同层次的"任务"概念：

1. **Todo/Task 用户层** -- LLM 用来跟踪工作进度的待办事项列表
   - V1: TodoWriteTool (内存存储，全量替换)
   - V2: TaskCreate/Update/List/Get (磁盘存储，单项操作)

2. **Background Task 运行时层** -- 后台执行的进程/子任务
   - LocalShellTask (后台 Shell 命令)
   - LocalAgentTask (后台子智能体)
   - InProcessTeammateTask (进程内队友)
   - RemoteAgentTask (远程智能体)
   - DreamTask (内存整理)
   - LocalWorkflowTask / MonitorMcpTask (工作流/监控)

```
源码关键文件:
  Task.ts               -- 运行时任务基础类型定义
  tasks.ts              -- 所有运行时任务注册表
  utils/tasks.ts        -- V2 任务持久化层 (~860 行)
  utils/todo/types.ts   -- V1 Todo 类型定义
  tools/TodoWriteTool/  -- V1 TodoWrite 工具
  tools/TaskCreateTool/ -- V2 TaskCreate 工具
  tools/TaskUpdateTool/ -- V2 TaskUpdate 工具
  tools/TaskListTool/   -- V2 TaskList 工具
  tools/TaskGetTool/    -- V2 TaskGet 工具
  tasks/                -- 运行时任务实现 (~12 文件)
```

## 2. 双系统架构

```
+================================================================+
|                     用户层: Todo/Task                           |
|                                                                |
|  +-- V1 TodoWriteTool --+   +-- V2 Task Tools -------+        |
|  |                      |   |                         |        |
|  | 内存存储             |   | 磁盘存储                |        |
|  | AppState.todos[key]  |   | ~/.claude/tasks/{id}/   |        |
|  | 全量替换             |   | 单项 CRUD               |        |
|  | 非交互模式           |   | 交互模式                |        |
|  +----------------------+   +-------------------------+        |
|                                                                |
+================================================================+
|                     运行时层: Background Tasks                  |
|                                                                |
|  +------------------+ +------------------+ +----------------+  |
|  | LocalShellTask   | | LocalAgentTask   | | DreamTask      |  |
|  | (后台 bash)      | | (后台子智能体)   | | (内存整理)     |  |
|  +------------------+ +------------------+ +----------------+  |
|  +------------------+ +------------------+ +----------------+  |
|  | InProcessTeam-   | | RemoteAgentTask  | | MonitorMcp-    |  |
|  |  mateTask        | | (云端会话)       | |  Task          |  |
|  +------------------+ +------------------+ +----------------+  |
|                                                                |
|  统一管理: AppState.tasks[taskId] -> TaskStateBase              |
+================================================================+
```

## 3. V1 Todo 系统 (TodoWriteTool)

### 3.1 数据模型

**文件**: `src/utils/todo/types.ts`

```typescript
const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed'])

export const TodoItemSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  status: TodoStatusSchema(),
  activeForm: z.string().min(1, 'Active form cannot be empty'),
})

export const TodoListSchema = z.array(TodoItemSchema())
```

### 3.2 存储方式

V1 的 Todo 完全存储在 **AppState.todos** 内存中：

```typescript
// TodoWriteTool.ts:65-94
async call({ todos }, context) {
  const todoKey = context.agentId ?? getSessionId()
  const oldTodos = appState.todos[todoKey] ?? []
  const allDone = todos.every(_ => _.status === 'completed')
  const newTodos = allDone ? [] : todos

  context.setAppState(prev => ({
    ...prev,
    todos: {
      ...prev.todos,
      [todoKey]: newTodos,
    },
  }))
}
```

特点：
- 使用 `agentId` 或 `sessionId` 作为 key，每个智能体有独立的 todo 列表
- **全量替换**: 每次调用替换整个列表，不支持单项操作
- **完成即清空**: 当所有项目都标记为 completed 时，列表被清空
- 无磁盘持久化，会话结束后丢失

### 3.3 V1 vs V2 切换逻辑

**文件**: `src/utils/tasks.ts:133-139`

```typescript
export function isTodoV2Enabled(): boolean {
  // 环境变量强制启用
  if (isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TASKS)) {
    return true
  }
  // 非交互模式使用 V1，交互模式使用 V2
  return !getIsNonInteractiveSession()
}
```

- TodoWriteTool: `isEnabled() { return !isTodoV2Enabled() }` (V2 禁用时启用)
- TaskCreate/Update/List: `isEnabled() { return isTodoV2Enabled() }` (V2 启用时启用)

### 3.4 验证提醒机制

当 LLM 关闭 3+ 个待办项且没有验证步骤时，系统会附加提醒（`TodoWriteTool.ts:76-86`）：

```typescript
if (allDone && todos.length >= 3 &&
    !todos.some(t => /verif/i.test(t.content))) {
  verificationNudgeNeeded = true
}
```

## 4. V2 Task 系统

### 4.1 数据模型

**文件**: `src/utils/tasks.ts:76-88`

```typescript
export const TaskSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  activeForm: z.string().optional(),  // spinner 显示的进行时文本
  owner: z.string().optional(),       // 负责人 agent 名
  status: TaskStatusSchema(),         // 'pending' | 'in_progress' | 'completed'
  blocks: z.array(z.string()),        // 此任务阻塞的任务 ID 列表
  blockedBy: z.array(z.string()),     // 阻塞此任务的任务 ID 列表
  metadata: z.record(z.string(), z.unknown()).optional(),
})
```

### 4.2 存储结构

```
~/.claude/tasks/{taskListId}/
  ├── .lock               -- 任务列表级文件锁
  ├── .highwatermark      -- 最高 ID 水位标记
  ├── 1.json              -- Task #1
  ├── 2.json              -- Task #2
  ├── 3.json              -- Task #3
  └── ...
```

每个 task 存储为独立的 JSON 文件，文件名就是 task ID。

### 4.3 任务列表 ID 解析

**文件**: `src/utils/tasks.ts:199-210`

```typescript
export function getTaskListId(): string {
  // 优先级 1: 显式设置的环境变量
  if (process.env.CLAUDE_CODE_TASK_LIST_ID) {
    return process.env.CLAUDE_CODE_TASK_LIST_ID
  }
  // 优先级 2: 进程内队友使用 leader 的 team name
  const teammateCtx = getTeammateContext()
  if (teammateCtx) {
    return teammateCtx.teamName
  }
  // 优先级 3: tmux 队友的 CLAUDE_CODE_TEAM_NAME
  // 优先级 4: leader 创建团队时设置的 leaderTeamName
  // 优先级 5: 会话 ID (独立会话)
  return getTeamName() || leaderTeamName || getSessionId()
}
```

这个设计确保：
- **独立会话**: 任务存在 `~/.claude/tasks/{sessionId}/` 下
- **团队模式**: 所有成员共享 `~/.claude/tasks/{teamName}/` 下的任务

### 4.4 文件锁机制

V2 系统使用两级锁确保并发安全：

#### 任务级锁

**文件**: `src/utils/tasks.ts:370-391`

```typescript
export async function updateTask(
  taskListId: string, taskId: string,
  updates: Partial<Omit<Task, 'id'>>,
): Promise<Task | null> {
  const path = getTaskPath(taskListId, taskId)
  const taskBeforeLock = await getTask(taskListId, taskId)
  if (!taskBeforeLock) return null

  let release
  try {
    release = await lockfile.lock(path, LOCK_OPTIONS)
    return await updateTaskUnsafe(taskListId, taskId, updates)
  } finally {
    await release?.()
  }
}
```

#### 列表级锁

用于需要原子性操作整个列表的场景（如 createTask, claimTask with busy check）：

```typescript
// tasks.ts:284-308
export async function createTask(taskListId, taskData): Promise<string> {
  const lockPath = await ensureTaskListLockFile(taskListId)
  let release
  try {
    release = await lockfile.lock(lockPath, LOCK_OPTIONS)

    // 在持锁状态下读取最高 ID
    const highestId = await findHighestTaskId(taskListId)
    const id = String(highestId + 1)
    const task: Task = { id, ...taskData }
    await writeFile(path, jsonStringify(task, null, 2))
    notifyTasksUpdated()
    return id
  } finally {
    if (release) await release()
  }
}
```

#### 锁配置

```typescript
// tasks.ts:94-108
const LOCK_OPTIONS = {
  retries: {
    retries: 30,      // 最多重试 30 次
    minTimeout: 5,     // 最短等待 5ms
    maxTimeout: 100,   // 最长等待 100ms
  },
}
// 预算: ~10+ 并发 swarm agent，每个临界区 ~50-100ms
// 最后一个等待者需要 ~900ms，30 次重试给出 ~2.6s 总等待
```

### 4.5 高水位标记 (High Water Mark)

**问题**: 当任务被删除或重置后，新创建的任务可能复用已删除的 ID，导致混乱。

**解决方案**: `src/utils/tasks.ts:92-131`

```typescript
const HIGH_WATER_MARK_FILE = '.highwatermark'

async function readHighWaterMark(taskListId: string): Promise<number> {
  const path = getHighWaterMarkPath(taskListId)
  try {
    const content = (await readFile(path, 'utf-8')).trim()
    const value = parseInt(content, 10)
    return isNaN(value) ? 0 : value
  } catch { return 0 }
}

async function findHighestTaskId(taskListId: string): Promise<number> {
  const [fromFiles, fromMark] = await Promise.all([
    findHighestTaskIdFromFiles(taskListId),
    readHighWaterMark(taskListId),
  ])
  return Math.max(fromFiles, fromMark)
}
```

在删除和重置时更新水位：

```typescript
// deleteTask 中
const numericId = parseInt(taskId, 10)
if (!isNaN(numericId)) {
  const currentMark = await readHighWaterMark(taskListId)
  if (numericId > currentMark) {
    await writeHighWaterMark(taskListId, numericId)
  }
}

// resetTaskList 中
const currentHighest = await findHighestTaskIdFromFiles(taskListId)
if (currentHighest > existingMark) {
  await writeHighWaterMark(taskListId, currentHighest)
}
```

### 4.6 任务依赖系统

**文件**: `src/utils/tasks.ts:458-486`

```
Task #1 (pending)  ----blocks---->  Task #3 (pending)
Task #2 (pending)  ----blocks---->  Task #3 (pending)

当 #1 和 #2 都 completed 后，#3 才能被认领
```

```typescript
export async function blockTask(
  taskListId: string, fromTaskId: string, toTaskId: string
): Promise<boolean> {
  // A blocks B: 更新 A.blocks 添加 B
  if (!fromTask.blocks.includes(toTaskId)) {
    await updateTask(taskListId, fromTaskId, {
      blocks: [...fromTask.blocks, toTaskId],
    })
  }
  // B blockedBy A: 更新 B.blockedBy 添加 A
  if (!toTask.blockedBy.includes(fromTaskId)) {
    await updateTask(taskListId, toTaskId, {
      blockedBy: [...toTask.blockedBy, fromTaskId],
    })
  }
  return true
}
```

删除任务时自动清理依赖引用：

```typescript
// deleteTask 中 (tasks.ts:420-435)
const allTasks = await listTasks(taskListId)
for (const task of allTasks) {
  const newBlocks = task.blocks.filter(id => id !== taskId)
  const newBlockedBy = task.blockedBy.filter(id => id !== taskId)
  if (newBlocks.length !== task.blocks.length ||
      newBlockedBy.length !== task.blockedBy.length) {
    await updateTask(taskListId, task.id, {
      blocks: newBlocks, blockedBy: newBlockedBy,
    })
  }
}
```

### 4.7 任务认领机制

**文件**: `src/utils/tasks.ts:541-692`

```typescript
export async function claimTask(
  taskListId, taskId, claimantAgentId, options
): Promise<ClaimTaskResult> {
  // 可选的 busy check: 是否允许一个 agent 同时拥有多个任务
  if (options.checkAgentBusy) {
    return claimTaskWithBusyCheck(taskListId, taskId, claimantAgentId)
  }

  release = await lockfile.lock(taskPath, LOCK_OPTIONS)

  // 检查已被其他 agent 认领
  if (task.owner && task.owner !== claimantAgentId) {
    return { success: false, reason: 'already_claimed', task }
  }

  // 检查已完成
  if (task.status === 'completed') {
    return { success: false, reason: 'already_resolved', task }
  }

  // 检查未解决的阻塞
  const blockedByTasks = task.blockedBy.filter(id =>
    unresolvedTaskIds.has(id))
  if (blockedByTasks.length > 0) {
    return { success: false, reason: 'blocked', task, blockedByTasks }
  }

  // 认领成功
  await updateTaskUnsafe(taskListId, taskId, { owner: claimantAgentId })
  return { success: true, task: updated }
}
```

带有 busy check 的认领使用**列表级锁**防止 TOCTOU 竞争：

```typescript
async function claimTaskWithBusyCheck(
  taskListId, taskId, claimantAgentId
): Promise<ClaimTaskResult> {
  const lockPath = await ensureTaskListLockFile(taskListId)
  release = await lockfile.lock(lockPath, LOCK_OPTIONS)

  const allTasks = await listTasks(taskListId)

  // 原子检查: agent 是否已有其他未完成任务
  const agentOpenTasks = allTasks.filter(
    t => t.status !== 'completed' &&
         t.owner === claimantAgentId &&
         t.id !== taskId
  )
  if (agentOpenTasks.length > 0) {
    return { success: false, reason: 'agent_busy', busyWithTasks: ... }
  }

  // ... 其他检查和认领
}
```

### 4.8 Agent 状态查询

```typescript
// tasks.ts:763-798
export async function getAgentStatuses(teamName): Promise<AgentStatus[]> {
  const teamData = await readTeamMembers(teamName)
  const allTasks = await listTasks(sanitizeName(teamName))

  // 按 owner 分组未解决的任务
  const unresolvedTasksByOwner = new Map<string, string[]>()
  for (const task of allTasks) {
    if (task.status !== 'completed' && task.owner) {
      existing.push(task.id)
      unresolvedTasksByOwner.set(task.owner, existing)
    }
  }

  return teamData.members.map(member => ({
    agentId: member.agentId,
    name: member.name,
    status: currentTasks.length === 0 ? 'idle' : 'busy',
    currentTasks,
  }))
}
```

### 4.9 队友退出时的任务释放

**文件**: `src/utils/tasks.ts:818-860`

```typescript
export async function unassignTeammateTasks(
  teamName, teammateId, teammateName, reason
): Promise<UnassignTasksResult> {
  const tasks = await listTasks(teamName)
  const unresolvedAssignedTasks = tasks.filter(
    t => t.status !== 'completed' &&
         (t.owner === teammateId || t.owner === teammateName)
  )

  // 释放每个任务，重置为 pending
  for (const task of unresolvedAssignedTasks) {
    await updateTask(teamName, task.id, {
      owner: undefined,
      status: 'pending',
    })
  }

  // 构建通知消息
  return {
    unassignedTasks: ...,
    notificationMessage: `${teammateName} ${actionVerb}. ${n} task(s) were unassigned...`
  }
}
```

## 5. V2 任务工具详解

### 5.1 TaskCreateTool

**文件**: `src/tools/TaskCreateTool/TaskCreateTool.ts`

```typescript
async call({ subject, description, activeForm, metadata }, context) {
  const taskId = await createTask(getTaskListId(), {
    subject,
    description,
    activeForm,
    status: 'pending',
    owner: undefined,
    blocks: [],
    blockedBy: [],
    metadata,
  })

  // 执行 TaskCreated hooks
  const generator = executeTaskCreatedHooks(
    taskId, subject, description, getAgentName(), getTeamName(), ...)
  for await (const result of generator) {
    if (result.blockingError) {
      blockingErrors.push(getTaskCreatedHookMessage(result.blockingError))
    }
  }

  // hook 失败则回滚
  if (blockingErrors.length > 0) {
    await deleteTask(getTaskListId(), taskId)
    throw new Error(blockingErrors.join('\n'))
  }

  // 自动展开任务列表视图
  context.setAppState(prev => ({
    ...prev, expandedView: 'tasks' as const
  }))
}
```

特性：
- `isConcurrencySafe() { return true }` - 标记为并发安全
- 支持 `metadata` 任意键值对
- Hook 系统可以在创建时验证并阻止

### 5.2 TaskUpdateTool

**文件**: `src/tools/TaskUpdateTool/TaskUpdateTool.ts`

支持的更新操作：

```typescript
z.strictObject({
  taskId: z.string(),
  subject: z.string().optional(),
  description: z.string().optional(),
  activeForm: z.string().optional(),
  status: TaskUpdateStatusSchema.optional(), // 含 'deleted'
  addBlocks: z.array(z.string()).optional(),
  addBlockedBy: z.array(z.string()).optional(),
  owner: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
```

关键逻辑：

1. **自动设置 owner**: 当 swarm 模式下队友标记任务为 in_progress 且未指定 owner 时，自动设置：

```typescript
if (isAgentSwarmsEnabled() && status === 'in_progress' &&
    owner === undefined && !existingTask.owner) {
  const agentName = getAgentName()
  if (agentName) updates.owner = agentName
}
```

2. **Metadata 合并**: 支持设置 key 为 null 来删除：

```typescript
const merged = { ...(existingTask.metadata ?? {}) }
for (const [key, value] of Object.entries(metadata)) {
  if (value === null) delete merged[key]
  else merged[key] = value
}
```

3. **任务完成通知**: 队友完成任务后通过邮箱通知新 owner：

```typescript
if (updates.owner && isAgentSwarmsEnabled()) {
  const assignmentMessage = JSON.stringify({
    type: 'task_assignment',
    taskId, subject, description, assignedBy, timestamp,
  })
  await writeToMailbox(updates.owner, {
    from: senderName, text: assignmentMessage, ...
  }, taskListId)
}
```

4. **完成时 Hook 执行**: 标记为 completed 时执行 TaskCompleted hooks

5. **删除操作**: `status: 'deleted'` 作为特殊状态触发文件删除

### 5.3 TaskListTool

**文件**: `src/tools/TaskListTool/TaskListTool.ts`

```typescript
async call() {
  const allTasks = (await listTasks(taskListId))
    .filter(t => !t.metadata?._internal) // 过滤内部任务

  // 过滤已完成任务的 blocker
  const resolvedTaskIds = new Set(
    allTasks.filter(t => t.status === 'completed').map(t => t.id)
  )

  return {
    tasks: allTasks.map(task => ({
      id: task.id,
      subject: task.subject,
      status: task.status,
      owner: task.owner,
      blockedBy: task.blockedBy.filter(id => !resolvedTaskIds.has(id)),
    }))
  }
}
```

输出格式：
```
#1 [completed] Set up authentication module (researcher)
#2 [in_progress] Implement user API (tester)
#3 [pending] Write integration tests [blocked by #2]
```

## 6. 运行时任务系统 (Background Tasks)

### 6.1 任务类型定义

**文件**: `src/Task.ts`

```typescript
export type TaskType =
  | 'local_bash'           // 本地 Shell 命令
  | 'local_agent'          // 本地子智能体
  | 'remote_agent'         // 远程云端智能体
  | 'in_process_teammate'  // 进程内队友
  | 'local_workflow'       // 本地工作流
  | 'monitor_mcp'          // MCP 监控
  | 'dream'                // 内存整理

export type TaskStatus =
  | 'pending'    // 等待启动
  | 'running'    // 正在运行
  | 'completed'  // 完成
  | 'failed'     // 失败
  | 'killed'     // 被终止

export type TaskStateBase = {
  id: string
  type: TaskType
  status: TaskStatus
  description: string
  toolUseId?: string
  startTime: number
  endTime?: number
  totalPausedMs?: number
  outputFile: string       // 输出文件路径
  outputOffset: number
  notified: boolean        // 是否已通知
}
```

### 6.2 任务 ID 生成

**文件**: `src/Task.ts:78-106`

```typescript
const TASK_ID_PREFIXES: Record<string, string> = {
  local_bash: 'b',              // b + 8字符
  local_agent: 'a',             // a + 8字符
  remote_agent: 'r',            // r + 8字符
  in_process_teammate: 't',     // t + 8字符
  local_workflow: 'w',          // w + 8字符
  monitor_mcp: 'm',             // m + 8字符
  dream: 'd',                   // d + 8字符
}

const TASK_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
// 36^8 ≈ 2.8 万亿组合，足以抵抗暴力破解符号链接攻击

export function generateTaskId(type: TaskType): string {
  const prefix = getTaskIdPrefix(type)
  const bytes = randomBytes(8)
  let id = prefix
  for (let i = 0; i < 8; i++) {
    id += TASK_ID_ALPHABET[bytes[i]! % TASK_ID_ALPHABET.length]
  }
  return id
}
```

### 6.3 任务注册表

**文件**: `src/tasks.ts`

```typescript
export function getAllTasks(): Task[] {
  const tasks: Task[] = [
    LocalShellTask,
    LocalAgentTask,
    RemoteAgentTask,
    DreamTask,
  ]
  // 条件编译的可选任务
  if (LocalWorkflowTask) tasks.push(LocalWorkflowTask)
  if (MonitorMcpTask) tasks.push(MonitorMcpTask)
  return tasks
}

export function getTaskByType(type: TaskType): Task | undefined {
  return getAllTasks().find(t => t.type === type)
}
```

### 6.4 任务接口

每个任务类型只需实现一个精简的接口：

```typescript
// Task.ts:72-76
export type Task = {
  name: string
  type: TaskType
  kill(taskId: string, setAppState: SetAppState): Promise<void>
}
```

注释说明（Task.ts:69-71）：
> spawn/render were never called polymorphically (removed in #22546).
> All six kill implementations use only setAppState.

### 6.5 终端状态判断

```typescript
export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'killed'
}
```

用于防止向已终止的队友注入消息、清理已完成的任务等。

## 7. 各任务类型详解

### 7.1 DreamTask (内存整理)

**文件**: `src/tasks/DreamTask/DreamTask.ts`

```typescript
export type DreamTaskState = TaskStateBase & {
  type: 'dream'
  phase: DreamPhase        // 'starting' | 'updating'
  sessionsReviewing: number
  filesTouched: string[]   // 不完整的已修改文件列表
  turns: DreamTurn[]       // 最近 30 轮对话
  abortController?: AbortController
  priorMtime: number       // 用于 kill 时回滚锁
}
```

DreamTask 是自动内存整理的 UI 表面。它展示了梦境代理（dream agent）正在做什么：

- `starting` 阶段 -> 第一个 Edit/Write 工具调用后变为 `updating`
- `filesTouched` 是**不完整**的文件列表（只捕获 Edit/Write 工具调用）
- Kill 时回滚整理锁的 mtime，允许下次会话重试

```typescript
export const DreamTask: Task = {
  name: 'DreamTask',
  type: 'dream',
  async kill(taskId, setAppState) {
    let priorMtime: number | undefined
    updateTaskState<DreamTaskState>(taskId, setAppState, task => {
      if (task.status !== 'running') return task
      task.abortController?.abort()
      priorMtime = task.priorMtime
      return { ...task, status: 'killed', ... }
    })
    // 回滚锁，让下次会话可以重试
    if (priorMtime !== undefined) {
      await rollbackConsolidationLock(priorMtime)
    }
  },
}
```

### 7.2 InProcessTeammateTask

**文件**: `src/tasks/InProcessTeammateTask/`

详见 Agent Team 文档。关键类型：

```typescript
export type InProcessTeammateTaskState = TaskStateBase & {
  type: 'in_process_teammate'
  identity: TeammateIdentity
  prompt: string
  model?: string
  abortController?: AbortController
  currentWorkAbortController?: AbortController
  awaitingPlanApproval: boolean
  permissionMode: PermissionMode
  messages?: Message[]       // UI 镜像，上限 50 条
  inProgressToolUseIDs?: Set<string>
  pendingUserMessages: string[]
  isIdle: boolean
  shutdownRequested: boolean
  onIdleCallbacks?: Array<() => void>
  lastReportedToolCount: number
  lastReportedTokenCount: number
}
```

### 7.3 LocalMainSessionTask (后台主会话)

**文件**: `src/tasks/LocalMainSessionTask.ts`

用户按两次 Ctrl+B 可以将当前查询放到后台继续运行：

```typescript
export function registerMainSessionTask(
  description, setAppState, agentDefinition?, existingAbortController?
): { taskId: string; abortSignal: AbortSignal } {
  const taskId = generateMainSessionTaskId() // 's' 前缀

  const taskState: LocalMainSessionTaskState = {
    ...createTaskStateBase(taskId, 'local_agent', description),
    agentType: 'main-session',
    isBackgrounded: true,
    ...
  }

  registerTask(taskState, setAppState)
  return { taskId, abortSignal: abortController.signal }
}
```

完成时通过 `<task-notification>` XML 通知主线程。

### 7.4 任务类型联合

**文件**: `src/tasks/types.ts`

```typescript
export type TaskState =
  | LocalShellTaskState
  | LocalAgentTaskState
  | RemoteAgentTaskState
  | InProcessTeammateTaskState
  | LocalWorkflowTaskState
  | MonitorMcpTaskState
  | DreamTaskState

export function isBackgroundTask(task: TaskState): task is BackgroundTaskState {
  if (task.status !== 'running' && task.status !== 'pending') return false
  if ('isBackgrounded' in task && task.isBackgrounded === false) return false
  return true
}
```

## 8. 停止任务

**文件**: `src/tasks/stopTask.ts`

```typescript
export async function stopTask(taskId, context): Promise<StopTaskResult> {
  const task = appState.tasks?.[taskId]

  if (!task) throw new StopTaskError('No task found', 'not_found')
  if (task.status !== 'running') throw new StopTaskError('Not running', 'not_running')

  const taskImpl = getTaskByType(task.type)
  if (!taskImpl) throw new StopTaskError('Unsupported type', 'unsupported_type')

  await taskImpl.kill(taskId, setAppState)

  // Bash 任务: 抑制 "exit code 137" 通知 (噪音)
  // Agent 任务: 不抑制 (包含 extractPartialResult 的有用内容)
  if (isLocalShellTask(task)) {
    // ... 设置 notified: true 并直接 emit SDK 事件
  }
}
```

## 9. 任务更新通知系统

**文件**: `src/utils/tasks.ts:17-67`

V2 任务使用信号机制进行同进程内的 UI 刷新：

```typescript
const tasksUpdated = createSignal()

export const onTasksUpdated = tasksUpdated.subscribe

export function notifyTasksUpdated(): void {
  try {
    tasksUpdated.emit()
  } catch {
    // 忽略监听器错误
  }
}
```

每个修改操作（create, update, delete, block, reset）完成后都调用 `notifyTasksUpdated()`。

**Leader Team Name 变更也是"更新"事件**：

```typescript
export function setLeaderTeamName(teamName: string): void {
  if (leaderTeamName === teamName) return
  leaderTeamName = teamName
  // 切换任务列表 ID 也要通知
  notifyTasksUpdated()
}
```

## 10. Footer Pill 标签系统

**文件**: `src/tasks/pillLabel.ts`

```
+--------------------------------------------------+
|  后台任务类型           | Pill 标签                |
+--------------------------------------------------+
| local_bash             | "N shells, M monitors"  |
| in_process_teammate    | "N teams"               |
| local_agent            | "N local agents"        |
| remote_agent           | "diamond N cloud sess"  |
| local_workflow         | "N background workflows"|
| monitor_mcp            | "N monitors"            |
| dream                  | "dreaming"              |
| 混合类型               | "N background tasks"    |
+--------------------------------------------------+
```

## 11. V1 和 V2 对比总结

```
+---------------------+------------------+-------------------------+
| 特性                 | V1 (TodoWrite)   | V2 (Task Tools)         |
+---------------------+------------------+-------------------------+
| 存储位置             | AppState 内存    | 磁盘 JSON 文件          |
| 操作粒度             | 全量替换         | 单项 CRUD               |
| 并发安全             | 无（单进程）     | 文件锁 (proper-lockfile)|
| 持久化               | 无               | 自动持久化              |
| 任务 ID              | 无显式 ID        | 自增数字 ID             |
| 依赖关系             | 无               | blocks / blockedBy      |
| 所有权               | 无               | owner 字段              |
| 认领机制             | 无               | claimTask + busy check  |
| 团队共享             | 通过 agentId key | 通过 taskListId         |
| 适用场景             | SDK / headless   | 交互式 CLI              |
| 启用条件             | 非交互模式       | 交互模式                |
| 状态迁移支持         | 无               | 有 (open->pending 等)   |
+---------------------+------------------+-------------------------+
```

## 12. 亮点发现

### 12.1 高水位标记的精妙设计

V2 任务系统的 `.highwatermark` 文件（tasks.ts:92）解决了一个看似简单但极其重要的问题：当团队重置或任务被删除后，新任务的 ID 必须不与历史 ID 冲突。系统在删除和重置操作中都会原子性地更新水位，确保 `findHighestTaskId` 返回的值包含了所有曾经存在过的 ID。这比常见的"数据库自增ID"方案更健壮，因为它不依赖任何运行时状态。

### 12.2 TOCTOU 安全的任务认领

`claimTaskWithBusyCheck`（tasks.ts:618-692）使用**列表级锁**而非任务级锁来原子化地检查 agent 是否忙碌并认领任务。这防止了这样的竞争条件：两个 agent 同时认领不同的任务，各自在检查"是否已有任务"时都看到对方还没有。列表级锁确保 check-and-claim 是一个原子操作。

### 12.3 双层锁策略

系统采用两级锁策略：
- **任务级锁** (lock on task file): 用于简单的单任务更新
- **列表级锁** (lock on .lock file): 用于需要跨任务原子操作

`updateTaskUnsafe` 是**内部无锁版本**（tasks.ts:354-368），供已经持有锁的调用者使用以避免死锁。例如 `claimTask` 在持有任务文件锁后需要调用 update，此时使用 `updateTaskUnsafe` 而不是 `updateTask`。

### 12.4 V1/V2 共存的优雅切换

`isTodoV2Enabled()` 的设计允许 V1 和 V2 根据运行模式自动切换。非交互模式（SDK 用户，`-p` 参数）使用 V1 的内存 Todo，交互 CLI 使用 V2 的磁盘 Task。两者通过互斥的 `isEnabled()` 确保不会同时激活，且环境变量 `CLAUDE_CODE_ENABLE_TASKS` 提供了手动覆盖的能力。

### 12.5 任务 ID 前缀编码

运行时任务 ID 的前缀编码（Task.ts:79-87）是一个简洁而有效的设计：一个字符前缀立即告诉你任务类型（`b` = bash, `a` = agent, `t` = teammate, `d` = dream 等），后跟 8 个随机字符。36^8 约 2.8 万亿的组合空间足以抵抗符号链接攻击（代码注释中明确提到这一安全考虑）。

### 12.6 验证提醒（Verification Nudge）

TodoWriteTool 和 TaskUpdateTool 都实现了一个"验证提醒"机制：当 LLM 关闭 3+ 个任务且没有一个包含"verif"关键词时，系统会在工具结果中附加提醒，要求 LLM 先生成一个验证智能体。这是一种"软约束"——不阻止操作，但提供强烈的行为引导。代码中明确说明这只在 feature flag `VERIFICATION_AGENT` 和 growth book flag `internal_hive_evidence` 都启用时才触发。

### 12.7 队友退出时的任务重分配

`unassignTeammateTasks`（tasks.ts:818-860）在队友被终止或优雅关闭时，自动将其所有未完成任务释放回"pending"状态并清除 owner。这确保了即使队友崩溃，其任务也不会被永久"锁定"——其他队友可以通过 TaskList + TaskUpdate 重新认领。通知消息还会具体列出被释放的任务 ID 和标题，给 leader 完整的上下文信息。

### 12.8 任务分配的邮箱通知

当 TaskUpdateTool 改变任务的 owner 时（TaskUpdateTool.ts:277-298），系统会自动通过邮箱向新 owner 发送 `task_assignment` 消息。这利用了已有的队友邮箱基础设施，避免了额外的通知机制。消息包含完整的任务上下文（taskId, subject, description, assignedBy），新 owner 可以立即开始工作而无需先查询任务详情。
