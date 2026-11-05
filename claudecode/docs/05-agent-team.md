# 上游工具Agent Team (Swarm) 系统深度解析

## 1. 概述

上游工具的 Agent Team 系统是一个多智能体协作框架，允许一个"领导者"（Team Lead）协调多个"队友"（Teammates）并行工作。该系统支持三种执行后端：**tmux 终端面板**、**iTerm2 原生分屏**和**进程内运行**，通过基于文件的邮箱系统实现消息传递，通过 JSON 配置文件管理团队状态。

```
源码根目录: src/
关键目录:
  utils/swarm/          -- Swarm 核心逻辑 (~16 个文件)
  utils/swarm/backends/ -- 执行后端 (tmux/iTerm2/in-process)
  utils/teammate*.ts    -- 队友身份/邮箱/上下文
  tasks/InProcessTeammateTask/ -- 进程内队友任务管理
  tools/TeamCreateTool/        -- 创建团队工具
  tools/TeamDeleteTool/        -- 删除团队工具
  tools/SendMessageTool/       -- 发送消息工具
  coordinator/                 -- 协调器模式
```

## 2. 架构总览

```
+--------------------------------------------------------------+
|                        USER SESSION                          |
|                                                              |
|  +--------------------+    +-----------------------------+   |
|  |    Team Lead       |    |      AppState               |   |
|  |  (主会话)          |--->|  teamContext: {              |   |
|  |                    |    |    teamName, leadAgentId,    |   |
|  |  tools:            |    |    teammates: {...}          |   |
|  |  - TeamCreate      |    |  }                          |   |
|  |  - TeamDelete      |    |  tasks: {                   |   |
|  |  - SendMessage     |    |    [taskId]: TaskState       |   |
|  |  - TaskCreate/     |    |  }                          |   |
|  |    Update/List     |    +-----------------------------+   |
|  +--------+-----------+                                      |
|           |                                                  |
+--------------------------------------------------------------+
            |
            | spawn / message
            v
+--------------------------------------------------------------+
|              EXECUTION BACKENDS (互斥选择)                    |
|                                                              |
|  +--------------+ +---------------+ +--------------------+   |
|  | TmuxBackend  | | ITermBackend  | | InProcessBackend   |   |
|  |              | |               | |                    |   |
|  | split-window | | it2 split     | | AsyncLocalStorage  |   |
|  | send-keys    | | native panes  | | runWithTeammate-   |   |
|  | kill-pane    | | it2 CLI       | |   Context()        |   |
|  +--------------+ +---------------+ +--------------------+   |
+--------------------------------------------------------------+
            |
            | file-based mailbox
            v
+--------------------------------------------------------------+
|              TEAMMATE INSTANCES                              |
|                                                              |
|  +------------------+  +------------------+                  |
|  | Teammate A       |  | Teammate B       |                  |
|  | name: researcher |  | name: tester     |                  |
|  | agentId:         |  | agentId:         |                  |
|  |  researcher@team |  |  tester@team     |                  |
|  | inbox: A.json    |  | inbox: B.json    |                  |
|  +------------------+  +------------------+                  |
+--------------------------------------------------------------+
```

## 3. 团队配置文件 (TeamFile)

团队的核心状态存储在 `~/.claude/teams/{team-name}/config.json` 中。

**文件位置**: `src/utils/swarm/teamHelpers.ts:115-124`

```typescript
// teamHelpers.ts:64-90
export type TeamFile = {
  name: string
  description?: string
  createdAt: number
  leadAgentId: string
  leadSessionId?: string // Leader 的真实 session UUID（用于发现）
  hiddenPaneIds?: string[]
  teamAllowedPaths?: TeamAllowedPath[] // 所有队友可以编辑的路径
  members: Array<{
    agentId: string           // 格式: "name@teamName"
    name: string
    agentType?: string
    model?: string
    prompt?: string
    color?: string
    planModeRequired?: boolean
    joinedAt: number
    tmuxPaneId: string
    cwd: string
    worktreePath?: string
    sessionId?: string
    subscriptions: string[]
    backendType?: BackendType // 'tmux' | 'iterm2' | 'in-process'
    isActive?: boolean        // false = idle, undefined/true = active
    mode?: PermissionMode
  }>
}
```

### 关键常量

**文件**: `src/utils/swarm/constants.ts`

```typescript
export const TEAM_LEAD_NAME = 'team-lead'
export const SWARM_SESSION_NAME = 'claude-swarm'
export const SWARM_VIEW_WINDOW_NAME = 'swarm-view'
export const TMUX_COMMAND = 'tmux'
export const HIDDEN_SESSION_NAME = 'claude-hidden'
```

## 4. 团队生命周期

### 4.1 团队创建 (TeamCreateTool)

**文件**: `src/tools/TeamCreateTool/TeamCreateTool.ts`

创建流程：

```
用户指令 -> TeamCreateTool.call()
  |
  +-> 1. 检查是否已有团队 (一个 leader 只能管理一个团队)
  +-> 2. 生成唯一团队名 (generateUniqueTeamName)
  +-> 3. 生成 leader 的 agentId: "team-lead@{teamName}"
  +-> 4. 创建 TeamFile 并写入 config.json
  +-> 5. 注册会话清理 (registerTeamForSessionCleanup)
  +-> 6. 重置并创建任务目录 (resetTaskList / ensureTasksDir)
  +-> 7. 设置 leaderTeamName (用于 getTaskListId)
  +-> 8. 更新 AppState.teamContext
  +-> 9. 发送分析事件 'internal_team_created'
```

核心代码（TeamCreateTool.ts:128-212）：

```typescript
async call(input, context) {
  const finalTeamName = generateUniqueTeamName(team_name)
  const leadAgentId = formatAgentId(TEAM_LEAD_NAME, finalTeamName)

  const teamFile: TeamFile = {
    name: finalTeamName,
    description: _description,
    createdAt: Date.now(),
    leadAgentId,
    leadSessionId: getSessionId(),
    members: [{
      agentId: leadAgentId,
      name: TEAM_LEAD_NAME,
      ...
    }],
  }

  await writeTeamFileAsync(finalTeamName, teamFile)
  registerTeamForSessionCleanup(finalTeamName)

  // 任务列表归属于团队
  const taskListId = sanitizeName(finalTeamName)
  await resetTaskList(taskListId)
  setLeaderTeamName(sanitizeName(finalTeamName))

  // 更新 AppState
  setAppState(prev => ({
    ...prev,
    teamContext: {
      teamName: finalTeamName,
      teamFilePath,
      leadAgentId,
      teammates: { ... },
    },
  }))
}
```

### 4.2 队友生成 (Spawning)

#### 后端选择流程

**文件**: `src/utils/swarm/backends/registry.ts:136-254`

```
detectAndGetBackend()
  |
  +-> Priority 1: 在 tmux 内部? -> TmuxBackend (isNative: true)
  +-> Priority 2: 在 iTerm2 内部?
  |     +-> it2 可用? -> ITermBackend (isNative: true)
  |     +-> tmux 可用? -> TmuxBackend (needsIt2Setup: true)
  |     +-> 都不可用? -> 抛错
  +-> Priority 3: tmux 可用? -> TmuxBackend (isNative: false, 外部会话)
  +-> Priority 4: 都不可用? -> 抛错 (提示安装 tmux)
```

进程内模式的判断逻辑 (`registry.ts:351-389`)：

```typescript
export function isInProcessEnabled(): boolean {
  // 非交互模式(-p)强制使用进程内
  if (getIsNonInteractiveSession()) return true

  const mode = getTeammateModeFromSnapshot()
  if (mode === 'in-process') return true
  if (mode === 'tmux') return false

  // 'auto' 模式: 无 tmux 也无 iTerm2 时使用进程内
  if (inProcessFallbackActive) return true
  return !isInsideTmuxSync() && !isInITerm2()
}
```

#### 三种执行后端对比

| 特性 | TmuxBackend | ITermBackend | InProcessBackend |
|------|-------------|--------------|------------------|
| 类型 | 终端面板 | 终端面板 | 进程内 |
| 进程隔离 | 独立进程 | 独立进程 | 共享进程 |
| 上下文隔离 | 环境变量 | 环境变量 | AsyncLocalStorage |
| 通信方式 | 文件邮箱 | 文件邮箱 | 文件邮箱 |
| 终止方式 | kill-pane | kill-pane | AbortController |
| 可见性 | 可见终端面板 | 可见终端面板 | 仅 UI 指示器 |
| 资源共享 | 无 | 无 | API 客户端, MCP |

### 4.3 Tmux 后端详解

**文件**: `src/utils/swarm/backends/TmuxBackend.ts`

TmuxBackend 有两种运行模式：

**模式 A: Leader 在 tmux 内 (isRunningInside = true)**

```
+-------+-------------------+
| Leader| Teammate A        |
| (30%) |                   |
|       +-------------------+
|       | Teammate B        |
|       |                   |
+-------+-------------------+
  main-vertical layout
```

- 第一个队友：从 leader 面板水平分割，占 70%
- 后续队友：从已有队友面板交替分割（水平/垂直）
- 使用 `main-vertical` 布局，leader 固定 30%

**模式 B: Leader 不在 tmux (外部会话)**

```
+-------------------+-------------------+
| Teammate A        | Teammate B        |
|                   |                   |
+-------------------+-------------------+
| Teammate C        | Teammate D        |
|                   |                   |
+-------------------+-------------------+
  tiled layout (均匀分布)
```

- 使用独立 tmux socket: `claude-swarm-{PID}`
- 创建 `claude-swarm` 会话和 `swarm-view` 窗口
- 所有面板均匀分布（tiled 布局）

关键实现（TmuxBackend.ts:129-146）:

```typescript
async createTeammatePaneInSwarmView(
  name: string, color: AgentColorName
): Promise<CreatePaneResult> {
  const releaseLock = await acquirePaneCreationLock()
  try {
    const insideTmux = await this.isRunningInside()
    if (insideTmux) {
      return await this.createTeammatePaneWithLeader(name, color)
    }
    return await this.createTeammatePaneExternal(name, color)
  } finally {
    releaseLock()
  }
}
```

**并发保护**: 使用 Promise 链实现面板创建锁（`acquirePaneCreationLock`），防止并行生成队友时的竞争条件。

### 4.4 进程内后端详解

**文件**: `src/utils/swarm/backends/InProcessBackend.ts`

进程内队友运行在同一 Node.js 进程中，使用 AsyncLocalStorage 进行上下文隔离。

```
InProcessBackend.spawn()
  |
  +-> 1. spawnInProcessTeammate() [spawnInProcess.ts]
  |     +-> 创建独立 AbortController (不链接到 leader)
  |     +-> 创建 TeammateContext (agentId, agentName, teamName, ...)
  |     +-> 注册 InProcessTeammateTaskState 到 AppState
  |
  +-> 2. startInProcessTeammate() [inProcessRunner.ts]
  |     +-> runWithTeammateContext(context, fn)
  |     +-> 调用 runAgent() 开始执行循环
  |     +-> 监听邮箱消息
  |     +-> 空闲时通知 leader
```

**文件**: `src/utils/teammateContext.ts`

```typescript
// AsyncLocalStorage 提供每个队友的隔离上下文
const teammateContextStorage = new AsyncLocalStorage<TeammateContext>()

export function runWithTeammateContext<T>(
  context: TeammateContext,
  fn: () => T,
): T {
  return teammateContextStorage.run(context, fn)
}
```

### 4.5 身份识别优先级

**文件**: `src/utils/teammate.ts:88-131`

队友身份通过三层机制识别，按优先级排列：

```
1. AsyncLocalStorage (进程内队友)
   -> getTeammateContext()

2. dynamicTeamContext (tmux 队友, 通过 CLI 参数)
   -> dynamicTeamContext?.agentId

3. 环境变量
   -> process.env.CLAUDE_CODE_AGENT_ID
```

Agent ID 格式: `{agentName}@{teamName}`，例如 `researcher@my-project`

```typescript
export function isTeammate(): boolean {
  const inProcessCtx = getTeammateContext()
  if (inProcessCtx) return true
  return !!(dynamicTeamContext?.agentId && dynamicTeamContext?.teamName)
}

export function isTeamLead(teamContext): boolean {
  if (!teamContext?.leadAgentId) return false
  const myAgentId = getAgentId()
  if (myAgentId === teamContext.leadAgentId) return true
  if (!myAgentId) return true // 向后兼容
  return false
}
```

## 5. 邮箱通信系统

### 5.1 文件结构

**文件**: `src/utils/teammateMailbox.ts`

```
~/.claude/teams/{team_name}/inboxes/
  ├── team-lead.json      -- Leader 的收件箱
  ├── researcher.json     -- researcher 的收件箱
  ├── tester.json         -- tester 的收件箱
  └── *.json.lock         -- 文件锁
```

### 5.2 消息类型

邮箱支持的结构化消息类型（`teammateMailbox.ts:1073-1095`）：

```
+-----------------------------+----------------------------------+
| 消息类型                     | 用途                              |
+-----------------------------+----------------------------------+
| idle_notification           | 队友空闲通知                      |
| permission_request          | 权限请求 (worker -> leader)       |
| permission_response         | 权限响应 (leader -> worker)       |
| sandbox_permission_request  | 沙箱权限请求                      |
| sandbox_permission_response | 沙箱权限响应                      |
| shutdown_request            | 关闭请求 (leader -> worker)       |
| shutdown_approved           | 关闭确认 (worker -> leader)       |
| shutdown_rejected           | 关闭拒绝 (worker -> leader)       |
| plan_approval_request       | 计划审批请求                      |
| plan_approval_response      | 计划审批响应                      |
| task_assignment             | 任务分配通知                      |
| team_permission_update      | 团队权限更新广播                  |
| mode_set_request            | 模式设置请求                      |
+-----------------------------+----------------------------------+
```

### 5.3 消息写入与并发控制

```typescript
// teammateMailbox.ts:134-192
export async function writeToMailbox(
  recipientName: string,
  message: Omit<TeammateMessage, 'read'>,
  teamName?: string,
): Promise<void> {
  await ensureInboxDir(teamName)
  const inboxPath = getInboxPath(recipientName, teamName)
  const lockFilePath = `${inboxPath}.lock`

  // 确保收件箱文件存在（使用 'wx' 原子创建）
  try {
    await writeFile(inboxPath, '[]', { encoding: 'utf-8', flag: 'wx' })
  } catch { /* EEXIST 正常 */ }

  // 文件锁保护读写操作
  let release = await lockfile.lock(inboxPath, {
    lockfilePath: lockFilePath,
    retries: { retries: 10, minTimeout: 5, maxTimeout: 100 },
  })

  try {
    const messages = await readMailbox(recipientName, teamName)
    messages.push({ ...message, read: false })
    await writeFile(inboxPath, jsonStringify(messages, null, 2), 'utf-8')
  } finally {
    if (release) await release()
  }
}
```

### 5.4 消息流动图

```
                  +-------------------+
                  |    Team Lead      |
                  |  inbox: team-lead |
                  +---------+---------+
                     ^   |   ^   |
     idle_notify     |   |   |   | shutdown_request
     permission_req  |   |   |   | permission_response
     shutdown_approved|   |   |   | task_assignment
                     |   |   |   |
              +------+   |   |   +------+
              |          |   |          |
              |          v   |          v
    +---------+-----+   +---------+-----+
    |  Researcher   |   |    Tester     |
    | inbox: resear |   | inbox: tester |
    +---------------+   +---------------+
```

## 6. 权限同步机制

### 6.1 权限请求流程

**文件**: `src/utils/swarm/permissionSync.ts`

Worker 队友执行工具时可能需要用户授权。权限请求通过邮箱转发给 leader：

```
Worker 遇到权限提示
  |
  +-> 1. 创建 permission_request 消息
  +-> 2. 写入 leader 的 mailbox
  +-> 3. Worker 轮询自己的 mailbox 等待响应
  |
  [Leader 侧]
  +-> 4. useInboxPoller 检测到 permission_request
  +-> 5. 弹出权限确认对话框
  +-> 6. 用户批准/拒绝
  +-> 7. 写入 permission_response 到 worker 的 mailbox
  |
  [Worker 侧]
  +-> 8. 收到 permission_response
  +-> 9. 继续或中止工具执行
```

### 6.2 Leader 权限桥接

**文件**: `src/utils/swarm/leaderPermissionBridge.ts`

进程内队友可以直接使用 leader 的权限确认对话框：

```typescript
// 注册 leader 的 ToolUseConfirm 队列
export function registerLeaderToolUseConfirmQueue(
  setter: SetToolUseConfirmQueueFn,
): void {
  registeredSetter = setter
}
```

### 6.3 团队级权限

**TeamAllowedPaths** 机制允许 leader 设置所有队友共享的路径权限：

```typescript
// teamHelpers.ts:57-62
export type TeamAllowedPath = {
  path: string       // 目录路径（绝对路径）
  toolName: string   // 工具名（如 "Edit", "Write"）
  addedBy: string    // 添加者
  addedAt: number    // 添加时间
}
```

在队友初始化时自动应用（`teammateInit.ts:44-79`）：

```typescript
if (teamFile.teamAllowedPaths?.length > 0) {
  for (const allowedPath of teamFile.teamAllowedPaths) {
    setAppState(prev => ({
      ...prev,
      toolPermissionContext: applyPermissionUpdate(
        prev.toolPermissionContext,
        {
          type: 'addRules',
          rules: [{ toolName: allowedPath.toolName, ruleContent }],
          behavior: 'allow',
          destination: 'session',
        },
      ),
    }))
  }
}
```

## 7. 关闭与清理流程

### 7.1 优雅关闭

```
Leader -> sendShutdownRequestToMailbox(targetName)
  |
  +-> 写入 shutdown_request 到 target 的 mailbox
  +-> Target 检测到 shutdown_request
  |     +-> 完成当前工作
  |     +-> 发送 shutdown_approved 或 shutdown_rejected
  |
  +-> [如果 approved]
  |     +-> Leader 读取 paneId/backendType
  |     +-> 关闭对应面板 (kill-pane) 或 abort controller
  |     +-> 从 TeamFile 移除成员
  |
  +-> [如果 rejected]
        +-> 队友继续工作
```

### 7.2 团队删除 (TeamDeleteTool)

**文件**: `src/tools/TeamDeleteTool/TeamDeleteTool.ts`

```typescript
async call(_input, context) {
  const teamName = appState.teamContext?.teamName

  // 检查是否有活跃成员
  const activeMembers = nonLeadMembers.filter(m => m.isActive !== false)
  if (activeMembers.length > 0) {
    return { success: false, message: 'Cannot cleanup with active members...' }
  }

  await cleanupTeamDirectories(teamName)
  unregisterTeamForSessionCleanup(teamName)
  clearTeammateColors()
  clearLeaderTeamName()

  // 清除 AppState
  setAppState(prev => ({
    ...prev,
    teamContext: undefined,
    inbox: { messages: [] },
  }))
}
```

### 7.3 会话结束自动清理

**文件**: `src/utils/swarm/teamHelpers.ts:576-590`

```typescript
export async function cleanupSessionTeams(): Promise<void> {
  const sessionCreatedTeams = getSessionCreatedTeams()
  if (sessionCreatedTeams.size === 0) return

  // 先杀掉孤立的面板进程
  await Promise.allSettled(teams.map(name => killOrphanedTeammatePanes(name)))
  // 然后清理文件
  await Promise.allSettled(teams.map(name => cleanupTeamDirectories(name)))
  sessionCreatedTeams.clear()
}
```

清理内容包括：

1. **Git Worktrees** - 先尝试 `git worktree remove --force`，失败则 `rm -rf`
2. **团队目录** - `~/.claude/teams/{team-name}/`
3. **任务目录** - `~/.claude/tasks/{taskListId}/`
4. **孤立面板** - 通过后端的 `killPane` 终止

## 8. 空闲检测与唤醒

### 8.1 Stop Hook 注册

**文件**: `src/utils/swarm/teammateInit.ts:97-129`

队友在启动时注册 Stop hook，当空闲时自动通知 leader：

```typescript
addFunctionHook(setAppState, sessionId, 'Stop', '',
  async (messages, _signal) => {
    // 标记自己为非活跃
    void setMemberActive(teamName, agentName, false)

    // 发送空闲通知
    const notification = createIdleNotification(agentName, {
      idleReason: 'available',
      summary: getLastPeerDmSummary(messages),
    })
    await writeToMailbox(leadAgentName, {
      from: agentName,
      text: jsonStringify(notification),
      timestamp: new Date().toISOString(),
      color: getTeammateColor(),
    })
  },
  'Failed to send idle notification to team leader',
  { timeout: 10000 },
)
```

### 8.2 进程内队友的空闲等待

**文件**: `src/utils/teammate.ts:238-292`

```typescript
export function waitForTeammatesToBecomeIdle(
  setAppState, appState
): Promise<void> {
  const workingTaskIds: string[] = []
  for (const [taskId, task] of Object.entries(appState.tasks)) {
    if (task.type === 'in_process_teammate' &&
        task.status === 'running' && !task.isIdle) {
      workingTaskIds.push(taskId)
    }
  }

  if (workingTaskIds.length === 0) return Promise.resolve()

  return new Promise<void>(resolve => {
    let remaining = workingTaskIds.length
    const onIdle = () => { if (--remaining === 0) resolve() }

    // 在每个工作中的队友上注册回调
    setAppState(prev => {
      // ... 注册 onIdleCallbacks
    })
  })
}
```

## 9. 协调器模式 (Coordinator Mode)

**文件**: `src/coordinator/coordinatorMode.ts`

协调器模式是 Swarm 的高级用法，将 leader 转变为纯协调角色：

```typescript
export function isCoordinatorMode(): boolean {
  if (feature('COORDINATOR_MODE')) {
    return isEnvTruthy(process.env.CLAUDE_CODE_COORDINATOR_MODE)
  }
  return false
}
```

在协调器模式下：
- Leader 只使用 `Agent`、`SendMessage`、`TaskStop` 三个工具
- Worker 获得标准工具集（Bash、Read、Edit 等）
- Leader 负责研究-综合-实现-验证的四阶段工作流
- Worker 的结果通过 `<task-notification>` XML 返回

协调器系统提示（`coordinatorMode.ts:111-369`）定义了详细的工作流：

```
| 阶段           | 执行者      | 目的                          |
|----------------|-------------|-------------------------------|
| Research       | Workers     | 调查代码库，收集信息          |
| Synthesis      | Coordinator | 阅读发现，制定实施规格        |
| Implementation | Workers     | 按照规格实施代码变更          |
| Verification   | Workers     | 测试验证变更有效              |
```

## 10. 团队发现与 UI

### 10.1 TeamDiscovery

**文件**: `src/utils/teamDiscovery.ts`

```typescript
export function getTeammateStatuses(teamName: string): TeammateStatus[] {
  const teamFile = readTeamFile(teamName)
  const hiddenPaneIds = new Set(teamFile.hiddenPaneIds ?? [])

  for (const member of teamFile.members) {
    if (member.name === 'team-lead') continue

    const isActive = member.isActive !== false
    statuses.push({
      name: member.name,
      status: isActive ? 'running' : 'idle',
      color: member.color,
      isHidden: hiddenPaneIds.has(member.tmuxPaneId),
      ...
    })
  }
  return statuses
}
```

### 10.2 Footer Pill 标签

**文件**: `src/tasks/pillLabel.ts`

后台任务在 footer 中显示压缩标签：

```typescript
case 'in_process_teammate': {
  const teamCount = new Set(
    tasks.map(t => t.type === 'in_process_teammate'
      ? t.identity.teamName : '')
  ).size
  return teamCount === 1 ? '1 team' : `${teamCount} teams`
}
```

## 11. 团队共享内存

**文件**: `src/utils/teamMemoryOps.ts`

团队成员可以读写共享内存文件：

```typescript
export function isTeamMemoryWriteOrEdit(
  toolName: string, toolInput: unknown
): boolean {
  if (toolName !== FILE_WRITE_TOOL_NAME &&
      toolName !== FILE_EDIT_TOOL_NAME) return false
  const filePath = input?.file_path ?? input?.path
  return filePath !== undefined && isTeamMemFile(filePath)
}
```

## 12. 会话重连

**文件**: `src/utils/swarm/reconnection.ts`

当恢复一个队友会话时，需要重建团队上下文：

```typescript
export function computeInitialTeamContext(): AppState['teamContext'] | undefined {
  const context = getDynamicTeamContext()
  if (!context?.teamName || !context?.agentName) return undefined

  const teamFile = readTeamFile(teamName)
  return {
    teamName,
    teamFilePath: getTeamFilePath(teamName),
    leadAgentId: teamFile.leadAgentId,
    selfAgentId: agentId,
    selfAgentName: agentName,
    isLeader: !agentId,
    teammates: {},
  }
}
```

## 13. CLI 参数传播

**文件**: `src/utils/swarm/spawnUtils.ts`

当 leader 通过 tmux 生成队友进程时，需要传播关键配置：

```typescript
export function buildInheritedCliFlags(options?): string {
  const flags: string[] = []

  // 权限模式传播（plan 模式优先）
  if (planModeRequired) { /* 不继承 bypass */ }
  else if (permissionMode === 'bypassPermissions') {
    flags.push('--dangerously-skip-permissions')
  }

  // 模型传播
  if (modelOverride) flags.push(`--model ${quote([modelOverride])}`)

  // 设置文件传播
  if (settingsPath) flags.push(`--settings ${quote([settingsPath])}`)

  // 插件传播
  for (const pluginDir of inlinePlugins) {
    flags.push(`--plugin-dir ${quote([pluginDir])}`)
  }

  // 队友模式传播
  flags.push(`--teammate-mode ${sessionMode}`)

  return flags.join(' ')
}
```

环境变量也需要显式转发（`spawnUtils.ts:96-128`）：
- API 提供商：`CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX` 等
- 代理设置：`HTTPS_PROXY`, `HTTP_PROXY` 等
- 配置目录：`CLAUDE_CONFIG_DIR`

## 14. 亮点发现

### 14.1 三层身份识别机制

系统设计了三层身份识别策略（AsyncLocalStorage > dynamicTeamContext > 环境变量），这使得同一进程中可以并发运行多个队友而不会冲突。AsyncLocalStorage 的使用是特别精妙的设计 -- 它利用了 Node.js 的异步上下文传播机制，无需显式传参就能在整个调用栈中保持队友身份的一致性。

### 14.2 面板创建的串行化锁

`TmuxBackend.ts:29` 中的 `paneCreationLock` 使用 Promise 链实现了一个优雅的串行化锁。当并行生成多个队友时，tmux 面板的创建必须串行执行以避免布局混乱。这个基于 Promise 的锁比传统互斥锁更适合 Node.js 的异步模型。

### 14.3 会话级团队清理

`registerTeamForSessionCleanup` 机制（teamHelpers.ts:560-570）解决了一个微妙的问题：如果用户在未显式调用 TeamDelete 的情况下关闭 leader 进程，团队文件和 worktree 会永远留在磁盘上。通过 `gracefulShutdown` 钩子，系统会自动清理所有"孤儿"团队目录。

### 14.4 进程内队友的内存保护

`TEAMMATE_MESSAGES_UI_CAP = 50`（InProcessTeammateTask/types.ts:101）限制了保存在 AppState 中的消息数量。BQ 分析发现一个极端案例：一个会话在 2 分钟内启动了 292 个 agent，达到 36.8GB 内存。消息的双重存储（AppState + 本地数组）是主要成本，因此 UI 镜像被限制为最近 50 条。

### 14.5 空闲通知中的 DM 摘要

`getLastPeerDmSummary`（teammateMailbox.ts:1149-1183）在队友空闲通知中附带了最后一条点对点消息的摘要。这让 leader 在收到"某队友空闲"通知时，能同时看到该队友最后发给其他队友的消息内容，大大减少了 leader 需要主动查询的次数。

### 14.6 结构化协议消息的路由

`isStructuredProtocolMessage`（teammateMailbox.ts:1073-1095）解决了一个重要的消息路由问题：某些消息（如权限请求、关闭请求）需要被特定的处理器消费，而不是作为原始文本附加到 LLM 上下文中。该函数通过检查 JSON 的 `type` 字段来区分协议消息和普通对话消息，确保每种消息到达正确的处理管道。

### 14.7 独立的 AbortController

进程内队友使用独立的 AbortController（不链接到 leader），这意味着当 leader 的查询被中断时（例如用户按 Ctrl+C），队友不会被杀死。这个设计选择使得队友可以在 leader 重新开始新对话后继续完成已分配的工作。
