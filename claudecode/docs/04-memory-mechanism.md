# 上游工具记忆机制 (Memory Mechanism)

## 1. 概述

上游工具的记忆系统是一个多层级、多来源的持久化知识框架。它让 AI 助手能跨会话
保持用户偏好、项目知识和工作上下文。这不是一个单一的"记忆"功能，而是由至少六种
不同类型的记忆来源组成的精密体系，每种有不同的作用域、加载时机和优先级。

```
                   该命令行工具记忆体系总览
  ================================================================

  ┌──────────────────────────────────────────────────────────────┐
  │                     系统提示词层                              │
  │  Managed CLAUDE.md (/etc/coding-agent/CLAUDE.md)             │
  │  User CLAUDE.md (~/.claude/CLAUDE.md)                       │
  │  Project CLAUDE.md (仓库根/CLAUDE.md)                       │
  │  .claude/rules/*.md (条件规则)                               │
  │  Local CLAUDE.local.md (私有本地指令)                        │
  ├──────────────────────────────────────────────────────────────┤
  │                     自动记忆层                                │
  │  MEMORY.md (索引入口)                                        │
  │  memory/*.md (主题记忆文件)                                   │
  │  memory/team/*.md (团队共享记忆)                              │
  ├──────────────────────────────────────────────────────────────┤
  │                     会话记忆层                                │
  │  Session Memory (.claude/session-memory/<hash>.md)           │
  │  Extract Memories (后台提取到 auto-memory)                    │
  ├──────────────────────────────────────────────────────────────┤
  │                     动态上下文层                              │
  │  @include 指令引入的外部文件                                  │
  │  Relevant Memories (Sonnet 选择的相关记忆)                    │
  │  Git 状态 / 日期信息                                          │
  └──────────────────────────────────────────────────────────────┘
```

## 2. 核心源码文件

| 文件 | 职责 |
|------|------|
| `utils/claudemd.ts` | CLAUDE.md 文件发现、加载、@include 处理，~1100行 |
| `context.ts` | 系统/用户上下文构建，memoized |
| `memdir/memdir.ts` | 自动记忆系统提示词构建、MEMORY.md 处理 |
| `memdir/paths.ts` | 记忆目录路径解析与安全校验 |
| `memdir/memoryTypes.ts` | 记忆类型分类法（user/feedback/project/reference） |
| `memdir/memoryScan.ts` | 记忆文件扫描与 frontmatter 解析 |
| `memdir/findRelevantMemories.ts` | 基于 Sonnet 的相关记忆选择 |
| `memdir/memoryAge.ts` | 记忆新鲜度计算与过时警告 |
| `services/SessionMemory/sessionMemory.ts` | 会话记忆提取主逻辑 |
| `services/SessionMemory/sessionMemoryUtils.ts` | 会话记忆工具函数与状态追踪 |
| `services/SessionMemory/prompts.ts` | 会话记忆模板和更新提示词 |
| `services/extractMemories/extractMemories.ts` | 持久记忆后台提取 |
| `utils/memory/types.ts` | 内部记忆类型定义 |

## 3. CLAUDE.md 记忆体系

### 3.1 文件发现与加载顺序

```
源文件: utils/claudemd.ts:1-26
```

CLAUDE.md 文件按四层优先级加载，**后加载的优先级更高**：

```
加载顺序 (从低到高):
  ============================================================
  1. Managed Memory  (/etc/coding-agent/CLAUDE.md)
     └── 组织级全局策略指令
     └── /etc/coding-agent/.claude/rules/*.md

  2. User Memory     (~/.claude/CLAUDE.md)
     └── 用户个人全局指令
     └── ~/.claude/rules/*.md

  3. Project Memory   (从根目录向下遍历到 CWD)
     └── CLAUDE.md            (仓库级)
     └── .claude/CLAUDE.md     (仓库级)
     └── .claude/rules/*.md    (条件规则)
     *** 越接近 CWD 优先级越高 ***

  4. Local Memory    (各目录下)
     └── CLAUDE.local.md      (私有本地指令, gitignored)
  ============================================================
```

### 3.2 内部类型系统

```
源文件: utils/memory/types.ts
```

```typescript
export const MEMORY_TYPE_VALUES = [
  'User',       // ~/.claude/CLAUDE.md
  'Project',    // CLAUDE.md, .claude/CLAUDE.md, .claude/rules/*.md
  'Local',      // CLAUDE.local.md
  'Managed',    // /etc/coding-agent/CLAUDE.md
  'AutoMem',    // ~/.claude/projects/<path>/memory/MEMORY.md
  'TeamMem',    // (feature flag) 团队共享记忆
] as const
```

### 3.3 getMemoryFiles —— 记忆文件发现引擎

```
源文件: utils/claudemd.ts:790-1039
```

`getMemoryFiles` 是整个记忆系统的文件发现核心，使用 `memoize` 确保每会话只执行一次：

```
getMemoryFiles 执行流程:
  ============================================================
  1. 处理 Managed 文件 (/etc/coding-agent/)
     └── CLAUDE.md + .claude/rules/*.md

  2. 处理 User 文件 (如果 userSettings 启用)
     └── ~/.claude/CLAUDE.md + ~/.claude/rules/*.md
     └── 始终允许外部 @include

  3. 从根目录向 CWD 方向遍历
     └── 每个目录检查:
         ├── CLAUDE.md          (Project)
         ├── .claude/CLAUDE.md  (Project)
         ├── .claude/rules/*.md (Project)
         └── CLAUDE.local.md   (Local)
     └── Git worktree 去重处理

  4. 附加目录处理 (--add-dir 指定的目录)

  5. AutoMem 入口文件 (MEMORY.md)

  6. TeamMem 入口文件 (如果启用)
  ============================================================
```

**Git Worktree 去重**（`claudemd.ts:867-876`）：

```typescript
// 当从嵌套的 git worktree 运行时 (如 .claude/worktrees/<name>/)，
// 向上遍历会同时经过 worktree 根和主仓库根。两者都包含
// CLAUDE.md 和 .claude/rules/*.md，导致同一内容加载两次。
// 跳过 worktree 以上但在主仓库以内的 Project 文件。
const isNestedWorktree =
  gitRoot !== null &&
  canonicalRoot !== null &&
  normalizePathForComparison(gitRoot) !==
    normalizePathForComparison(canonicalRoot) &&
  pathInWorkingPath(gitRoot, canonicalRoot)
```

### 3.4 @include 指令机制

```
源文件: utils/claudemd.ts:17-25, 439-535
```

@include 允许 CLAUDE.md 文件引入其他文件的内容。

**语法支持**：
- `@path` 或 `@./relative/path` — 相对路径
- `@~/home/path` — 从 home 目录开始
- `@/absolute/path` — 绝对路径
- `@path#section` — 支持 fragment 标识符（会被剥离）
- `@path\ with\ spaces` — 支持转义空格

**解析流程**（`claudemd.ts:451-535`）：

```
@include 解析:
  ============================================================
  1. 使用 marked Lexer 解析 markdown (gfm: false, 避免 ~/ 被解析为删除线)
  2. 递归遍历 token 树
  3. 跳过 'code' 和 'codespan' 类型 (代码块中的 @ 不处理)
  4. 跳过 'html' 类型中的注释部分 (<!-- --> 中的 @ 不处理)
  5. 在 'text' 类型中用正则提取 @path
  6. 验证路径有效性 (排除 @#%^&*() 等特殊字符开头)
  7. 用 expandPath 解析为绝对路径
  ============================================================
```

**安全限制**：
- 最大嵌套深度: `MAX_INCLUDE_DEPTH = 5`（`claudemd.ts:537`）
- 循环引用检测: 通过 `processedPaths` Set 追踪已处理文件
- 只加载文本文件: `TEXT_FILE_EXTENSIONS` 白名单涵盖 100+ 种扩展名
- 外部文件控制: 项目配置 `hasClaudeMdExternalIncludesApproved` 控制是否允许
  引入 CWD 以外的文件

**递归处理**（`claudemd.ts:618-685`）：

```typescript
export async function processMemoryFile(
  filePath, type, processedPaths, includeExternal, depth = 0, parent
) {
  // 1. 检查循环引用和最大深度
  // 2. 检查 claudeMdExcludes 排除列表
  // 3. 解析 symlink
  // 4. 读取并解析文件内容 (同时提取 @include 路径)
  // 5. 递归处理所有 @include 引用的文件
  // 6. 返回: [当前文件, ...所有引入的文件]
}
```

### 3.5 Frontmatter 和条件规则

```
源文件: utils/claudemd.ts:254-279
```

CLAUDE.md 和 .claude/rules/*.md 文件支持 frontmatter 中的 `paths` 字段：

```yaml
---
paths:
  - src/components/**
  - tests/**
---
这些规则只在处理指定路径下的文件时生效。
```

`parseFrontmatterPaths` 处理 paths 字段：
- 移除 `/**` 后缀（ignore 库自动匹配子路径）
- 全部为 `**` 时视为无条件（适用所有路径）

### 3.6 HTML 注释剥离

```
源文件: utils/claudemd.ts:292-334
```

CLAUDE.md 中的 block-level HTML 注释会被自动剥离：

```typescript
export function stripHtmlComments(content: string) {
  // 只处理 block-level 的注释 (非 inline)
  // 未闭合的注释 <!-- 保留 (避免错误地吞掉文件剩余内容)
  // 注释后的同行内容保留 (如 <!-- note --> Use bun)
}
```

### 3.7 用户上下文构建

```
源文件: context.ts:155-189
```

```typescript
export const getUserContext = memoize(async () => {
  const shouldDisableClaudeMd =
    isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) ||
    (isBareMode() && getAdditionalDirectoriesForClaudeMd().length === 0)

  const claudeMd = shouldDisableClaudeMd
    ? null
    : getClaudeMds(filterInjectedMemoryFiles(await getMemoryFiles()))

  setCachedClaudeMdContent(claudeMd || null)

  return {
    ...(claudeMd && { claudeMd }),
    currentDate: `Today's date is ${getLocalISODate()}.`,
  }
})
```

关键设计：
- **memoize**：整个会话期间只计算一次（除非显式清除缓存）
- **--bare 模式**：跳过自动发现，但仍加载 `--add-dir` 指定的目录
- **缓存副本**：`setCachedClaudeMdContent` 为 yoloClassifier（自动模式分类器）
  提供缓存读取通道，避免循环依赖

### 3.8 系统上下文构建

```
源文件: context.ts:116-150
```

```typescript
export const getSystemContext = memoize(async () => {
  const gitStatus = isEnvTruthy(process.env.CLAUDE_CODE_REMOTE) ||
    !shouldIncludeGitInstructions()
    ? null
    : await getGitStatus()

  return {
    ...(gitStatus && { gitStatus }),
    ...(injection ? { cacheBreaker: `[CACHE_BREAKER: ${injection}]` } : {}),
  }
})
```

Git 状态包含：当前分支、主分支、最近5条 commit、工作区状态（截断到2000字符）。

## 4. 自动记忆系统 (Auto Memory / Memdir)

### 4.1 目录结构

```
源文件: memdir/paths.ts
```

自动记忆目录路径解析有三级优先级：

```
路径解析优先级:
  ============================================================
  1. CLAUDE_COWORK_MEMORY_PATH_OVERRIDE 环境变量 (Cowork 使用)
  2. settings.json 中的 autoMemoryDirectory (trusted sources only)
  3. <memoryBase>/projects/<sanitized-git-root>/memory/
     其中 memoryBase = CLAUDE_CODE_REMOTE_MEMORY_DIR || ~/.claude
  ============================================================
```

**安全校验**（`paths.ts:109-150`）：

```typescript
function validateMemoryPath(raw, expandTilde) {
  // 拒绝: 相对路径 (!isAbsolute)
  // 拒绝: 根或近根路径 (length < 3)
  // 拒绝: Windows 驱动器根 (C:)
  // 拒绝: UNC 路径 (\\server\share)
  // 拒绝: 空字节 (null byte, 可绕过 syscall)
  // 支持: ~/ 展开 (仅 settings.json)
  // 不支持: 裸 ~ (会匹配整个 $HOME)
}
```

**projectSettings 排除**（`paths.ts:177-186`）：

```
SECURITY: projectSettings (.claude/settings.json 提交到仓库) 被排除在外。
恶意仓库可能设置 autoMemoryDirectory: "~/.ssh"，
然后通过 filesystem.ts 的 write carve-out 获得对敏感目录的静默写入权限。
```

**Git Worktree 共享**（`paths.ts:203-205`）：

```typescript
function getAutoMemBase(): string {
  // 使用 findCanonicalGitRoot 确保同一仓库的所有 worktree
  // 共享同一个自动记忆目录
  return findCanonicalGitRoot(getProjectRoot()) ?? getProjectRoot()
}
```

### 4.2 记忆类型分类法

```
源文件: memdir/memoryTypes.ts
```

自动记忆系统将记忆约束为四种类型：

```
记忆类型:
  ============================================================

  1. user (用户记忆)
     ├── 用户的角色、目标、职责、知识
     ├── 始终私有
     └── 例: "用户是数据科学家, 关注可观测性/日志"

  2. feedback (反馈记忆)
     ├── 用户对工作方式的指导 (纠正 + 确认)
     ├── 默认私有, 项目级约定可设为团队
     ├── 结构: 规则 + Why + How to apply
     └── 例: "集成测试必须使用真实数据库, 不能 mock"

  3. project (项目记忆)
     ├── 进行中的工作、目标、倡议、bug、事件
     ├── 偏向团队共享
     ├── 结构: 事实/决定 + Why + How to apply
     └── 例: "代码冻结从2026-03-05开始 (移动端发布)"

  4. reference (引用记忆)
     ├── 外部系统中信息的指针
     ├── 通常团队共享
     └── 例: "Pipeline bugs 在 Linear 的 INGEST 项目追踪"

  ============================================================

  明确排除的内容:
  - 代码模式、架构、文件路径 (可从项目推导)
  - Git 历史 (git log/blame 是权威来源)
  - 调试方案 (修复在代码中, 上下文在 commit 消息中)
  - CLAUDE.md 中已有的内容
  - 临时任务细节
```

### 4.3 MEMORY.md 入口文件

```
源文件: memdir/memdir.ts:34-103
```

MEMORY.md 是索引入口，有严格的大小限制：

```typescript
export const MAX_ENTRYPOINT_LINES = 200
export const MAX_ENTRYPOINT_BYTES = 25_000
```

`truncateEntrypointContent` 执行双重截断：
1. 先按行截断（200行上限）
2. 再按字节截断（25KB上限，在最后一个换行处截断避免断行）

超限时追加警告信息，告知用户保持索引条目简短（每行~200字符以内）。

### 4.4 记忆系统提示词

```
源文件: memdir/memdir.ts:199-266
```

`buildMemoryLines` 构建注入到系统提示词中的记忆行为指令：

```
记忆提示词结构:
  ============================================================
  # auto memory

  You have a persistent, file-based memory system at `<path>`.

  ## Types of memory (四种类型详述)
  ## What NOT to save in memory (排除列表)
  ## How to save memories (两步骤: 写文件 + 更新索引)
  ## When to access memories (何时查阅)
  ## Before recommending from memory (使用前验证)
  ## Memory and other forms of persistence (与 Plan/Tasks 的区分)
  ## Searching past context (如何搜索过去的上下文)
  ## MEMORY.md (索引内容或空提示)
  ============================================================
```

**"使用前验证"部分**（`memoryTypes.ts:240-256`）是关键的安全机制：

```
A memory that names a specific function, file, or flag is a claim
that it existed *when the memory was written*. It may have been
renamed, removed, or never merged. Before recommending it:
- If the memory names a file path: check the file exists.
- If the memory names a function or flag: grep for it.
```

### 4.5 记忆新鲜度系统

```
源文件: memdir/memoryAge.ts
```

```typescript
export function memoryAge(mtimeMs: number): string {
  const d = memoryAgeDays(mtimeMs)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

export function memoryFreshnessText(mtimeMs: number): string {
  const d = memoryAgeDays(mtimeMs)
  if (d <= 1) return ''
  return (
    `This memory is ${d} days old. ` +
    `Memories are point-in-time observations, not live state — ` +
    `claims about code behavior or file:line citations may be outdated. ` +
    `Verify against current code before asserting as fact.`
  )
}
```

**设计动机**：用户报告过时的代码状态记忆（带 file:line 引用的）被当作事实断言。
引用让过时的声明看起来更权威而非更不可靠。人类可读的时间差（"47天前"比 ISO
时间戳更能触发模型的"过时"推理。

### 4.6 相关记忆选择 (Relevant Memory Recall)

```
源文件: memdir/findRelevantMemories.ts
```

这是一个**使用 Sonnet 的辅助查询**来选择与当前对话相关的记忆文件：

```
相关记忆选择流程:
  ============================================================
  1. scanMemoryFiles: 扫描记忆目录，读取所有 .md 文件的 frontmatter
     └── 排除 MEMORY.md (已在系统提示中)
     └── 最多 200 个文件
     └── 按修改时间倒序排列

  2. 过滤已展示过的文件 (alreadySurfaced)

  3. formatMemoryManifest: 格式化为文本清单
     └── "- [type] filename (ISO timestamp): description"

  4. sideQuery (Sonnet):
     └── 系统提示: "You are selecting memories..."
     └── 输入: query + available memories + recently used tools
     └── 输出: JSON { selected_memories: string[] }
     └── 最多选择 5 个

  5. 返回: { path, mtimeMs }[]
  ============================================================
```

**关键设计细节**：

```typescript
// findRelevantMemories.ts:18-24
const SELECT_MEMORIES_SYSTEM_PROMPT = `...
- If a list of recently-used tools is provided, do not select memories
  that are usage reference or API documentation for those tools
  (该命令行工具is already exercising them).
  DO still select memories containing warnings, gotchas, or known issues
  about those tools — active use is exactly when those matter.`
```

如果模型正在使用某个工具（如 `mcp__X__spawn`），不要选择该工具的使用参考文档
（因为对话中已经有工作示例），**但要选择**关于该工具的警告和已知问题。

### 4.7 记忆文件扫描

```
源文件: memdir/memoryScan.ts
```

```typescript
const MAX_MEMORY_FILES = 200
const FRONTMATTER_MAX_LINES = 30

export async function scanMemoryFiles(memoryDir, signal) {
  // 1. readdir(memoryDir, { recursive: true })
  // 2. 过滤: *.md 且非 MEMORY.md
  // 3. 并行读取每个文件的前 30 行 (readFileInRange)
  // 4. 解析 frontmatter (name, description, type)
  // 5. 按 mtime 倒序排列
  // 6. 截取前 200 个
}
```

**单遍优化**：`readFileInRange` 内部执行 stat 并返回 mtimeMs，
所以读取-排序是一遍完成，避免了先 stat 再 sort 再 read 的两遍 syscall。

### 4.8 Assistant 模式的日志记忆

```
源文件: memdir/memdir.ts:327-370
```

在 Kairos (assistant mode) 下，记忆模式从"维护索引"切换为"追加日志"：

```
普通模式 vs Assistant 模式:
  ============================================================
  普通模式:
  - MEMORY.md 作为索引
  - 每个记忆一个独立文件
  - 用户手动或模型自动维护索引

  Assistant 模式 (KAIROS):
  - 日志文件: memory/logs/YYYY/MM/YYYY-MM-DD.md
  - 追加-only (不重写/重组)
  - 每个条目是时间戳 bullet
  - 独立的 /dream skill 在夜间蒸馏日志 -> MEMORY.md + 主题文件
  - MEMORY.md 仍然加载到上下文中
  ============================================================
```

## 5. 会话记忆 (Session Memory)

### 5.1 核心概念

```
源文件: services/SessionMemory/sessionMemory.ts:1-5
```

Session Memory 是**当前对话的结构化笔记**，由后台 subagent 自动维护。
它与自动记忆（跨会话持久化）的区别在于：Session Memory 只关注当前会话的
工作上下文。

### 5.2 模板结构

```
源文件: services/SessionMemory/prompts.ts:11-41
```

```markdown
# Session Title
_A short and distinctive 5-10 word descriptive title..._

# Current State
_What is actively being worked on right now?..._

# Task specification
_What did the user ask to build?..._

# Files and Functions
_What are the important files?..._

# Workflow
_What bash commands are usually run?..._

# Errors & Corrections
_Errors encountered and how they were fixed..._

# Codebase and System Documentation
_What are the important system components?..._

# Learnings
_What has worked well? What has not?..._

# Key results
_If the user asked a specific output..._

# Worklog
_Step by step, what was attempted, done?..._
```

用户可以自定义模板：`~/.claude/session-memory/config/template.md`

### 5.3 提取触发条件

```
源文件: services/SessionMemory/sessionMemory.ts:134-181
```

```typescript
export function shouldExtractMemory(messages: Message[]): boolean {
  // 阈值检查流程:
  // 1. 初始化阈值: tokenCount >= minimumMessageTokensToInit (10K)
  //    └── 只触发一次, 之后不再检查
  // 2. 更新阈值 (两者都需要满足):
  //    a. Token 增长阈值: tokensSinceLastExtraction >= 5K
  //    b. 触发条件 (满足任一):
  //       - 工具调用阈值 (toolCallsSinceLastUpdate >= 3) 且 token 增长满足
  //       - 最后一轮没有工具调用 (自然对话断点) 且 token 增长满足
}
```

**配置默认值**（`sessionMemoryUtils.ts:32-36`）：

```typescript
export const DEFAULT_SESSION_MEMORY_CONFIG: SessionMemoryConfig = {
  minimumMessageTokensToInit: 10000,   // 初始化阈值: 10K tokens
  minimumTokensBetweenUpdate: 5000,    // 更新间隔: 5K tokens 增长
  toolCallsBetweenUpdates: 3,          // 工具调用间隔: 3次
}
```

### 5.4 提取执行流程

```
源文件: services/SessionMemory/sessionMemory.ts:272-350
```

```
Session Memory 提取流程:
  ============================================================
  1. 检查: querySource === 'repl_main_thread' (只在主线程运行)
  2. 检查: isSessionMemoryGateEnabled() (GrowthBook feature flag)
  3. 初始化远程配置 (lazy, 一次性)
  4. shouldExtractMemory(messages) 检查
  5. markExtractionStarted() (记录开始时间)
  6. 创建隔离的 setupContext (避免污染父上下文缓存)
  7. setupSessionMemoryFile:
     a. 创建 session-memory 目录 (权限 0o700)
     b. 创建记忆文件 (权限 0o600, wx 模式避免覆盖)
     c. 如果新建: 写入模板
     d. 通过 FileReadTool 读取当前内容
  8. buildSessionMemoryUpdatePrompt:
     a. 加载自定义提示词或默认提示词
     b. 分析各 section 大小
     c. 生成超限 section 的提醒
     d. 变量替换 ({{currentNotes}}, {{notesPath}})
  9. runForkedAgent (复用主对话 prompt cache):
     a. 只允许 FileEditTool 且只能编辑 memoryPath
     b. querySource: 'session_memory'
  10. 记录遥测
  11. 更新 lastSummarizedMessageId
  12. markExtractionCompleted()
  ============================================================
```

### 5.5 Section 大小控制

```
源文件: services/SessionMemory/prompts.ts:8-9, 134-196
```

```typescript
const MAX_SECTION_LENGTH = 2000           // 每个 section 最多 ~2000 tokens
const MAX_TOTAL_SESSION_MEMORY_TOKENS = 12000  // 总文件最多 ~12K tokens
```

当 section 超限时，提示词中会添加强制要求：

```
CRITICAL: The session memory file is currently ~15000 tokens,
which exceeds the maximum of 12000 tokens.
You MUST condense the file to fit within this budget.
```

### 5.6 等待机制

```
源文件: services/SessionMemory/sessionMemoryUtils.ts:88-105
```

```typescript
const EXTRACTION_WAIT_TIMEOUT_MS = 15000       // 等待超时 15秒
const EXTRACTION_STALE_THRESHOLD_MS = 60000    // 过时阈值 1分钟

export async function waitForSessionMemoryExtraction() {
  while (extractionStartedAt) {
    if (Date.now() - extractionStartedAt > EXTRACTION_STALE_THRESHOLD_MS) {
      return  // 提取超过1分钟, 视为过时, 不再等待
    }
    if (Date.now() - startTime > EXTRACTION_WAIT_TIMEOUT_MS) {
      return  // 等了15秒, 超时退出
    }
    await sleep(1000)
  }
}
```

这个等待机制在 Session Memory Compaction 路径中使用（`sessionMemoryCompact.ts:527`），
确保压缩时使用最新的 session memory 内容。

### 5.7 工具权限控制

```
源文件: services/SessionMemory/sessionMemory.ts:460-482
```

```typescript
export function createMemoryFileCanUseTool(memoryPath: string): CanUseToolFn {
  return async (tool, input) => {
    // 只允许 FileEditTool
    // 且只允许编辑精确匹配 memoryPath 的文件
    // 所有其他工具/路径: deny
  }
}
```

这是一个极其严格的权限模型——session memory subagent 只能编辑它自己的笔记文件。

## 6. 持久记忆提取 (Extract Memories)

### 6.1 与 Session Memory 的区别

```
源文件: services/extractMemories/extractMemories.ts:1-13
```

```
Session Memory vs Extract Memories:
  ============================================================
  Session Memory:
  - 提取 session notes (当前会话的结构化笔记)
  - 存储在 .claude/session-memory/<hash>.md
  - 用于 compaction (替代 LLM 摘要)
  - 只保留当前会话的上下文

  Extract Memories:
  - 提取 durable memories (跨会话持久记忆)
  - 写入 ~/.claude/projects/<path>/memory/
  - 用于未来会话的上下文
  - 在完整 query loop 结束时运行 (无 tool calls)
  - 使用 forked agent 共享 prompt cache
  ============================================================
```

### 6.2 触发时机

Extract Memories 在每次完整 query loop 结束时（模型产生了不含 tool calls 的最终响应）
通过 `handleStopHooks` 在 stopHooks.ts 中触发。

## 7. Forked Agent 与记忆继承

### 7.1 CacheSafeParams

```
源文件: utils/forkedAgent.ts:60-70
```

```typescript
export type CacheSafeParams = {
  systemPrompt: SystemPromptType
  userContext: Record<string, string>
  systemContext: Record<string, string>
  toolUseContext: ToolUseContext
  forkContextMessages: Message[]       // Fork 继承的消息上下文
}
```

Forked agents（compact、session_memory、extract_memories）通过 `CacheSafeParams`
继承主对话的：
- 系统提示词（包含 CLAUDE.md 内容）
- 用户上下文（包含 CLAUDE.md 和日期）
- 系统上下文（包含 Git 状态）
- 完整消息历史

### 7.2 记忆上下文的隔离

每个 forked agent 创建**隔离的 subagent context**（`sessionMemory.ts:303-304`）：

```typescript
const setupContext = createSubagentContext(toolUseContext)
```

这避免了 subagent 的 readFileState 变更污染主线程。

## 8. 记忆在压缩中的恢复

### 8.1 压缩后重加载

```
源文件: services/compact/postCompactCleanup.ts:51-61
```

压缩后的清理会重置记忆相关缓存：

```typescript
if (isMainThreadCompact) {
  getUserContext.cache.clear?.()        // 清除用户上下文缓存 (含 CLAUDE.md)
  resetGetMemoryFilesCache('compact')   // 重置记忆文件缓存
}
```

这确保压缩后的第一个 turn 会重新加载所有 CLAUDE.md 和记忆文件，
获取最新内容（因为在压缩期间这些文件可能已被修改）。

### 8.2 SessionStart Hooks

压缩后会执行 `processSessionStartHooks('compact')`（`compact.ts:592-594`），
这些 hooks 负责恢复 CLAUDE.md 等上下文到新的消息流中。

### 8.3 Session Memory 在压缩中的角色

Session Memory 压缩路径（`sessionMemoryCompact.ts`）直接将 session memory
内容作为摘要，替代 LLM 生成的摘要。这意味着：

```
传统压缩: messages -> LLM -> summary -> new_messages
SM 压缩:  messages -> session_memory_file -> summary -> new_messages
           (session memory 已在后台由 subagent 持续更新)
```

## 9. 记忆加载时序

```
完整的记忆加载时序:
  ============================================================
  会话启动
    │
    ├── getMemoryFiles() [memoized, 一次性]
    │   ├── Managed CLAUDE.md
    │   ├── User CLAUDE.md
    │   ├── Project CLAUDE.md (目录遍历)
    │   ├── .claude/rules/*.md
    │   ├── CLAUDE.local.md
    │   ├── AutoMem MEMORY.md
    │   └── TeamMem MEMORY.md
    │
    ├── getUserContext() [memoized]
    │   ├── getClaudeMds(filterInjectedMemoryFiles(memoryFiles))
    │   └── currentDate
    │
    ├── getSystemContext() [memoized]
    │   └── getGitStatus()
    │
    ├── loadMemoryPrompt() [系统提示词中的记忆行为指令]
    │   ├── auto memory instructions
    │   ├── MEMORY.md content
    │   └── team memory (if enabled)
    │
    ├── initSessionMemory() [注册 post-sampling hook]
    │
    ╔══════════════════════════════════════╗
    ║           对话进行中                  ║
    ╠══════════════════════════════════════╣
    ║                                      ║
    ║  每个 turn 后:                       ║
    ║    ├── shouldExtractMemory()         ║
    ║    │   └── extractSessionMemory()   ║
    ║    │       (后台 forked agent)       ║
    ║    │                                 ║
    ║    └── extractMemories()            ║
    ║        (query loop 结束时)           ║
    ║                                      ║
    ║  findRelevantMemories()             ║
    ║    (Sonnet 选择相关记忆文件)         ║
    ║                                      ║
    ╠══════════════════════════════════════╣
    ║                                      ║
    ║  压缩发生时:                         ║
    ║    ├── trySessionMemoryCompaction() ║
    ║    │   └── 用 SM 替代 LLM 摘要     ║
    ║    │                                 ║
    ║    └── postCompactCleanup()         ║
    ║        ├── 清除 getUserContext 缓存 ║
    ║        └── 重置 getMemoryFiles 缓存║
    ║        --> 下一 turn 重新加载所有记忆║
    ║                                      ║
    ╚══════════════════════════════════════╝
  ============================================================
```

## 10. 亮点发现

### 发现1：记忆是"注入"而非"检索"的双重模式

CLAUDE.md 类记忆在会话开始时**全量注入**到系统提示词，这确保了基础规则始终生效。
但自动记忆（memory/*.md 文件）采用**检索**模式——由 Sonnet 根据当前查询选择
最多5个相关文件。这种混合架构平衡了"关键规则必须始终可见"和"大量记忆文件
不可能全部注入"两个矛盾需求。

### 发现2：Session Memory 的"双重身份"

Session Memory 的核心设计巧妙之处在于它身兼二职：
1. **工作笔记**：为用户提供当前会话的结构化摘要（`/summary` 命令）
2. **压缩替代品**：在 compaction 时替代昂贵的 LLM 调用

第二个身份是后来加入的"实验"（`sessionMemoryCompact.ts:1` 注释），但它实现了
一个优雅的闭环：后台 subagent 持续维护的笔记，在需要压缩时恰好可以直接用作摘要。
这让自动压缩的成本从"一次 200K 输入的 LLM 调用"降为"零额外 LLM 调用"。

### 发现3：@include 的"代码安全"设计

@include 机制使用 marked Lexer 解析 markdown，确保**代码块中的 @path 不会被
展开**。这是一个看似简单但很重要的安全设计——如果用户在 CLAUDE.md 中写了
`@./config.json` 作为代码示例，它不应该真的被展开引入。

此外，`gfm: false` 标志避免了 `~/path` 被 GitHub Flavored Markdown 解析器
误认为删除线（~~text~~）。

### 发现4：记忆"过时"警告的心理学设计

`memoryAge.ts` 故意使用人类可读时间差（"47 days ago"）而非 ISO 时间戳。
注释解释了原因：模型在日期算术上表现不佳——原始 ISO 时间戳不会触发"过时"推理，
而"47天前"会。这是一个考虑了 LLM 认知特点的设计决策。

### 发现5：路径安全的多层防御

自动记忆路径验证（`paths.ts:109-150`）是一个教科书级的安全设计：
- **拒绝相对路径**：防止 `../` 遍历
- **拒绝根路径**：防止 `"/"` 或 `"C:\"` 被设为记忆目录
- **拒绝 UNC 路径**：防止网络路径
- **拒绝 null byte**：防止 C 层 syscall 截断
- **projectSettings 排除**：防止恶意仓库通过 `.claude/settings.json` 控制路径

配合 `hasAutoMemPathOverride()` 检查，write carve-out 只对用户自主设置的路径
生效，不对 SDK/Cowork 注入的路径生效。

### 发现6：Extract Memories 的"不争"设计

`extractMemories.ts:60-68` 描述了一个精妙的协作机制：主 agent 的提示词始终
包含完整的记忆保存指令。当主 agent 自己写了记忆时，后台的 extract memories
agent 会检测到并跳过那个范围（`hasMemoryWritesSince`）。当主 agent 没写时，
后台 agent 补上遗漏。这是一种"不争"的协作——两个 agent 共享同一目标，
但从不冲突。

### 发现7：团队记忆的作用域意识

记忆类型分类法中，`feedback` 类型有一个微妙的规则（`memoryTypes.ts:59`）：

```
default to private. Save as team only when the guidance is clearly
a project-wide convention that every contributor should follow
(e.g., a testing policy, a build invariant), not a personal style preference.
```

并且，在保存私有 feedback 之前，要检查是否与团队 feedback 矛盾。
这反映了真实团队协作中"个人偏好 vs 团队规范"的张力。

### 发现8：压缩后记忆缓存清除的连锁反应

`postCompactCleanup.ts:51-61` 中清除 `getUserContext.cache` 和
`resetGetMemoryFilesCache` 不仅仅是"清缓存"——它触发了一个精心设计的连锁反应：

```
清除缓存 -> 下一轮 getUserContext() 重新执行
         -> getMemoryFiles() 重新扫描磁盘
         -> CLAUDE.md 内容重新读取 (可能已变)
         -> InstructionsLoaded hook 重新触发
         -> 新的记忆文件内容注入上下文
```

如果只清除内层的 `getMemoryFiles` 缓存而不清除外层的 `getUserContext` 缓存，
外层 memoize 会命中，永远不会到达内层——这个 bug 在注释中被明确提到
（`postCompactCleanup.ts:53-58`）。
