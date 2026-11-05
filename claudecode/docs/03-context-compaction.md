# 上游工具上下文压缩机制 (Context Compaction)

## 1. 概述

上游工具在长对话中不可避免地会遇到上下文窗口容量极限问题。上下文压缩机制（Context Compaction）是上游工具最核心的"续命"系统 —— 它通过多层级的策略，从无需 LLM 介入的轻量级清理到需要 LLM 生成摘要的重量级压缩，确保对话能在有限的上下文窗口中持续进行。

本文基于源码深入分析整个压缩体系的架构、触发条件、执行流程和恢复机制。

```
                       上下文压缩体系总览
  ============================================================

  Token 使用量增长方向  --->

  |  正常对话  |  时间MC  |  缓存MC  |  自动压缩  |  阻塞限制  |
  |            |          |          |            |            |
  0%         ~60%       ~80%       ~93%         ~98%       100%
              |          |          |            |
              v          v          v            v
         冷缓存清理   缓存编辑    LLM摘要    用户阻止
         (无LLM)     (无LLM)    (Forked     (必须压缩
                                 Agent)     才能继续)
```

## 2. 核心源码文件

| 文件 | 职责 |
|------|------|
| `services/compact/compact.ts` | 核心压缩逻辑，~1700行，包含完整压缩和部分压缩 |
| `services/compact/autoCompact.ts` | 自动压缩触发器、阈值计算、熔断机制 |
| `services/compact/microCompact.ts` | 微压缩（无LLM），时间和缓存两个路径 |
| `services/compact/sessionMemoryCompact.ts` | 基于 Session Memory 的压缩替代路径 |
| `services/compact/grouping.ts` | 消息按 API 轮次分组 |
| `services/compact/prompt.ts` | 压缩提示词模板和格式化 |
| `services/compact/postCompactCleanup.ts` | 压缩后缓存清理 |
| `services/compact/apiMicrocompact.ts` | API 层面的上下文管理策略 |
| `services/compact/compactWarningState.ts` | 压缩警告状态管理 |
| `services/compact/timeBasedMCConfig.ts` | 基于时间的微压缩配置 |
| `utils/context.ts` | 上下文窗口尺寸计算 |

## 3. 上下文窗口管理基础

### 3.1 有效上下文窗口计算

```
源文件: services/compact/autoCompact.ts:33-49
```

有效上下文窗口大小并非模型标称的上下文窗口：

```typescript
// autoCompact.ts:30
const MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000

// autoCompact.ts:33
export function getEffectiveContextWindowSize(model: string): number {
  const reservedTokensForSummary = Math.min(
    getMaxOutputTokensForModel(model),
    MAX_OUTPUT_TOKENS_FOR_SUMMARY,
  )
  let contextWindow = getContextWindowForModel(model, getSdkBetas())

  // 环境变量覆盖
  const autoCompactWindow = process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW
  if (autoCompactWindow) {
    const parsed = parseInt(autoCompactWindow, 10)
    if (!isNaN(parsed) && parsed > 0) {
      contextWindow = Math.min(contextWindow, parsed)
    }
  }

  return contextWindow - reservedTokensForSummary
}
```

计算公式：`有效窗口 = min(模型窗口, 环境变量覆盖) - min(模型最大输出, 20000)`

### 3.2 多层阈值体系

```
源文件: services/compact/autoCompact.ts:62-66
```

```typescript
export const AUTOCOMPACT_BUFFER_TOKENS = 13_000
export const WARNING_THRESHOLD_BUFFER_TOKENS = 20_000
export const ERROR_THRESHOLD_BUFFER_TOKENS = 20_000
export const MANUAL_COMPACT_BUFFER_TOKENS = 3_000
```

这构成了一个四级预警体系：

```
  有效上下文窗口 (例: 180,000 tokens)
  ================================================================
  |                                                              |
  |  正常使用区域                                                 |
  |                                                              |
  |------- 自动压缩阈值 (180K - 13K = 167K) --------------------|
  |  缓冲区 (13K)                                                |
  |------- 警告阈值 (180K - 20K = 160K) -------------------------|
  |  错误阈值区                                                  |
  |------- 阻塞限制 (180K - 3K = 177K) -------------------------|
  |  必须手动压缩                                                 |
  ================================================================
```

### 3.3 Token 使用状态计算

```
源文件: services/compact/autoCompact.ts:93-145
```

`calculateTokenWarningState` 函数返回五个布尔状态：

```typescript
export function calculateTokenWarningState(tokenUsage, model) {
  return {
    percentLeft,                    // 剩余百分比
    isAboveWarningThreshold,       // 超过警告阈值
    isAboveErrorThreshold,         // 超过错误阈值
    isAboveAutoCompactThreshold,   // 超过自动压缩阈值
    isAtBlockingLimit,             // 到达阻塞限制
  }
}
```

## 4. 第一层：微压缩 (Microcompact) —— 无需 LLM

微压缩是最轻量的压缩手段，不调用 LLM，只是清理旧的 tool result 内容。它有三个子路径。

### 4.1 时间触发微压缩 (Time-Based MC)

```
源文件: services/compact/microCompact.ts:401-530
```

**触发条件**：上一次 assistant 消息的时间到现在超过配置的阈值（默认60分钟）。

**设计动机**：Anthropic API 的 prompt cache 有1小时 TTL。超过1小时后缓存必然冷启动，
全部前缀都要重写。既然如此，不如趁机清理旧 tool result 来缩减重写量。

```typescript
// timeBasedMCConfig.ts:30-34
const TIME_BASED_MC_CONFIG_DEFAULTS: TimeBasedMCConfig = {
  enabled: false,            // 默认关闭，由 GrowthBook 远程控制
  gapThresholdMinutes: 60,   // 60分钟间隔
  keepRecent: 5,             // 保留最近5个工具结果
}
```

**执行逻辑**：

```
时间触发微压缩流程:
  1. 计算距上次 assistant 消息的时间间隔
  2. 如果间隔 < 阈值 --> 不触发, 返回 null
  3. 收集所有可压缩的 tool_use ID (COMPACTABLE_TOOLS)
  4. 保留最近 N 个, 其余标记为清理集合
  5. 遍历消息, 将清理集合中的 tool_result 内容替换为
     '[Old tool result content cleared]'
  6. 重置缓存MC状态 (因为改变了 prompt 内容)
  7. 通知缓存断裂检测器 (避免误报)
```

可压缩的工具列表（`microCompact.ts:41-50`）：

```typescript
const COMPACTABLE_TOOLS = new Set<string>([
  FILE_READ_TOOL_NAME,    // Read
  ...SHELL_TOOL_NAMES,    // Bash, BashExec 等
  GREP_TOOL_NAME,         // Grep
  GLOB_TOOL_NAME,         // Glob
  WEB_SEARCH_TOOL_NAME,   // WebSearch
  WEB_FETCH_TOOL_NAME,    // WebFetch
  FILE_EDIT_TOOL_NAME,    // Edit
  FILE_WRITE_TOOL_NAME,   // Write
])
```

注意：**FileEdit 和 FileWrite 也在列表中** —— 这意味着编辑操作的详细结果也会被清除。

### 4.2 缓存编辑微压缩 (Cached Microcompact)

```
源文件: services/compact/microCompact.ts:305-399
```

**核心思想**：利用 API 的 `cache_edits` 功能，在不破坏 prompt cache 前缀的前提下，
删除旧的 tool result 条目。这是最"无损"的压缩方式。

```
缓存MC与时间MC的区别:
  +=================+=====================+=====================+
  |                 |  缓存MC             |  时间MC             |
  +=================+=====================+=====================+
  | 修改消息内容?   | 否 (cache_edits)    | 是 (直接替换)       |
  | 缓存影响        | 保留缓存前缀        | 缓存必然冷启动       |
  | 触发条件        | 工具数量阈值         | 时间间隔阈值         |
  | 适用场景        | 热缓存状态           | 冷缓存状态           |
  +=================+=====================+=====================+
```

**执行流程**：

1. 检查是否为主线程（防止 subagent 污染全局状态）
2. 注册当前轮的 tool_result 到全局 cachedMCState
3. 调用 `getToolResultsToDelete` 获取应删除的工具列表
4. 创建 `cache_edits` 块，排队等待 API 层插入
5. 在下次 API 请求时通过 `consumePendingCacheEdits` 取出并发送

**关键设计**：只在主线程运行（`microCompact.ts:276`）：

```typescript
// 只在主线程运行缓存MC，防止 forked agents (session_memory, prompt_suggestion 等)
// 将它们的 tool_results 注册到全局 cachedMCState，这会导致
// 主线程尝试删除不存在于其对话中的工具
if (isMainThreadSource(querySource)) {
  return await cachedMicrocompactPath(messages, querySource)
}
```

### 4.3 API 级别上下文管理

```
源文件: services/compact/apiMicrocompact.ts
```

这是更底层的上下文管理，通过 API 的原生 context management 机制实现：

```typescript
// apiMicrocompact.ts:36-56
export type ContextEditStrategy =
  | {
      type: 'clear_tool_uses_20250919'
      trigger?: { type: 'input_tokens'; value: number }
      keep?: { type: 'tool_uses'; value: number }
      clear_tool_inputs?: boolean | string[]
    }
  | {
      type: 'clear_thinking_20251015'
      keep: { type: 'thinking_turns'; value: number } | 'all'
    }
```

支持两种策略：
- **清除旧 tool use 结果**：当 input tokens 超过阈值时清除
- **清除 thinking blocks**：控制保留多少轮的 thinking（用于扩展思考模型）

## 5. 第二层：自动压缩 (Auto Compact) —— 需要 LLM

### 5.1 触发决策

```
源文件: services/compact/autoCompact.ts:160-239
```

`shouldAutoCompact` 函数是自动压缩的入口守卫，包含多层递归保护：

```
自动压缩守卫链:
  1. querySource === 'session_memory' || 'compact'  --> 跳过 (防止递归)
  2. querySource === 'marble_origami' (ctx-agent)   --> 跳过 (防止污染主线程)
  3. !isAutoCompactEnabled()                        --> 跳过
  4. REACTIVE_COMPACT 实验开启                       --> 跳过 (另一个压缩路径)
  5. CONTEXT_COLLAPSE 实验开启                       --> 跳过 (上下文折叠接管)
  6. tokenCount < threshold                         --> 跳过
  7. 全部通过 --> 触发自动压缩
```

### 5.2 熔断器 (Circuit Breaker)

```
源文件: services/compact/autoCompact.ts:67-70, 257-265
```

这是一个极其重要的工程保护机制：

```typescript
const MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3

// BQ 2026-03-10: 1,279 sessions had 50+ consecutive failures (up to 3,272)
// in a single session, wasting ~250K API calls/day globally.
```

当连续失败达到3次时，停止尝试自动压缩：

```typescript
// autoCompact.ts:260-265
if (
  tracking?.consecutiveFailures !== undefined &&
  tracking.consecutiveFailures >= MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES
) {
  return { wasCompacted: false }
}
```

失败计数在成功时重置为0，在每次失败时递增。

### 5.3 Session Memory 优先尝试

```
源文件: services/compact/autoCompact.ts:287-310
```

自动压缩**优先尝试 Session Memory 压缩**，这是一个不需要 LLM 调用的快速路径：

```typescript
// autoCompact.ts:288-310
// EXPERIMENT: Try session memory compaction first
const sessionMemoryResult = await trySessionMemoryCompaction(
  messages,
  toolUseContext.agentId,
  recompactionInfo.autoCompactThreshold,
)
if (sessionMemoryResult) {
  setLastSummarizedMessageId(undefined)
  runPostCompactCleanup(querySource)
  notifyCompaction(querySource ?? 'compact', toolUseContext.agentId)
  markPostCompaction()
  return { wasCompacted: true, compactionResult: sessionMemoryResult }
}
```

只有当 Session Memory 不可用或不足以降低 token 数量时，才会走传统 LLM 压缩。

### 5.4 Session Memory 压缩机制

```
源文件: services/compact/sessionMemoryCompact.ts
```

Session Memory 压缩的核心思想：利用后台提取的 session memory 内容作为摘要，
跳过昂贵的 LLM 调用。

```
Session Memory 压缩流程:
  ============================================================
  1. 检查 shouldUseSessionMemoryCompaction() (feature flag)
  2. 等待正在进行的 session memory 提取完成 (15秒超时)
  3. 获取 lastSummarizedMessageId 和 sessionMemory 内容
  4. 如果 session memory 为空/只有模板 --> 返回 null, 降级
  5. 计算 messagesToKeep 的起始索引:
     a. 从 lastSummarizedIndex 开始
     b. 向前扩展直到满足最小 token (10K) 和最小消息数 (5)
     c. 不超过最大 token 上限 (40K)
     d. 调整索引保证 tool_use/tool_result 对不被拆分
  6. 构建 CompactionResult:
     boundary + summary(session memory) + messagesToKeep
  7. 检查压缩后 token 是否低于阈值
  ============================================================
```

**关键配置**（`sessionMemoryCompact.ts:57-61`）：

```typescript
export const DEFAULT_SM_COMPACT_CONFIG: SessionMemoryCompactConfig = {
  minTokens: 10_000,              // 压缩后至少保留 10K tokens
  minTextBlockMessages: 5,         // 至少保留 5 条有文本的消息
  maxTokens: 40_000,              // 最多保留 40K tokens
}
```

**API 不变量保护**（`sessionMemoryCompact.ts:232-314`）：

`adjustIndexToPreserveAPIInvariants` 函数确保切分消息时不会：
- 拆分 tool_use / tool_result 对
- 拆分共享同一 message.id 的 thinking blocks

## 6. 第三层：完整 LLM 压缩 (Full Compaction)

### 6.1 入口函数

```
源文件: services/compact/compact.ts:387-763
```

`compactConversation` 是完整压缩的核心函数。

```
完整压缩流程:
  ============================================================
  1. 记录压缩前 token 计数
  2. 执行 PreCompact hooks (用户自定义压缩前操作)
  3. 构建压缩提示词 (getCompactPrompt)
  4. 进入压缩循环:
     a. 调用 streamCompactSummary 生成摘要
     b. 检查是否为 prompt_too_long 错误
     c. 如果是 --> truncateHeadForPTLRetry 截断头部, 重试
     d. 最多重试 3 次
  5. 验证摘要内容有效性
  6. 清除 readFileState 缓存
  7. 并行创建压缩后附件:
     - 最近读取的文件 (最多5个, 每个5K tokens)
     - 异步代理状态
     - Plan 附件
     - Skill 附件 (每个5K, 总预算25K)
     - 延迟工具/代理/MCP delta
  8. 执行 SessionStart hooks (恢复 CLAUDE.md 等上下文)
  9. 构建 compact boundary 标记
  10. 计算压缩后 token 并记录遥测
  11. 重置 prompt cache 基线
  12. 重新追加会话元数据
  13. 执行 PostCompact hooks
  ============================================================
```

### 6.2 摘要生成策略：缓存共享 Fork

```
源文件: services/compact/compact.ts:1136-1396
```

`streamCompactSummary` 有两个执行路径：

**路径1：缓存共享 Fork（优先）**

```typescript
// compact.ts:1188-1200
const result = await runForkedAgent({
  promptMessages: [summaryRequest],
  cacheSafeParams,
  canUseTool: createCompactCanUseTool(),  // 拒绝所有工具调用
  querySource: 'compact',
  forkLabel: 'compact',
  maxTurns: 1,
  skipCacheWrite: true,
  overrides: { abortController: context.abortController },
})
```

通过 fork 主对话的 Agent，可以复用主对话的 prompt cache（系统提示、工具列表、
消息前缀都相同）。这样压缩调用的 `cache_read_input_tokens` 会很高，大幅降低成本。

**路径2：独立流式请求（降级）**

当 fork 路径失败（空响应、异常等）时，退回到独立的 streaming API 调用。
这个路径支持重试（最多2次）。

### 6.3 压缩提示词设计

```
源文件: services/compact/prompt.ts
```

压缩提示词有三个变体：

| 变体 | 用途 | 关键区别 |
|------|------|----------|
| BASE_COMPACT_PROMPT | 完整压缩 | 总结"整个对话" |
| PARTIAL_COMPACT_PROMPT (from) | 部分压缩(从某处开始) | 只总结"最近的消息" |
| PARTIAL_COMPACT_UP_TO_PROMPT | 部分压缩(到某处为止) | 总结前缀，保留后缀 |

**关键设计 —— 双阶段输出**（`prompt.ts:19-26`）：

```typescript
const NO_TOOLS_PREAMBLE = `CRITICAL: Respond with TEXT ONLY. Do NOT call any tools.
- Do NOT use Read, Bash, Grep, Glob, Edit, Write, or ANY other tool.
- Tool calls will be REJECTED and will waste your only turn — you will fail the task.
- Your entire response must be plain text: an <analysis> block followed by a <summary> block.`
```

要求模型先输出 `<analysis>` 思考分析块，再输出 `<summary>` 正式摘要块。
`formatCompactSummary`（prompt.ts:311-335）会在后处理中**剥离 analysis 块**，
只保留 summary。

摘要结构包含9个部分（`prompt.ts:67-143`）：
1. Primary Request and Intent
2. Key Technical Concepts
3. Files and Code Sections
4. Errors and fixes
5. Problem Solving
6. All user messages
7. Pending Tasks
8. Current Work
9. Optional Next Step

### 6.4 Prompt-Too-Long 重试

```
源文件: services/compact/compact.ts:243-291
```

当压缩请求本身触发 prompt_too_long 错误时（CC-1180 场景），
采用分组截断策略：

```typescript
export function truncateHeadForPTLRetry(messages, ptlResponse) {
  // 1. 清理之前重试添加的合成标记
  // 2. 按 API 轮次分组
  // 3. 根据 tokenGap 计算需要丢弃的组数
  //    - 有明确 gap: 累加直到覆盖 gap
  //    - 无法解析 gap: 丢弃 20% 的组
  // 4. 至少保留一个组
  // 5. 如果切分后以 assistant 开头, 补充合成 user 消息
}
```

最多重试 3 次（`MAX_PTL_RETRIES = 3`）。

### 6.5 部分压缩 (Partial Compact)

```
源文件: services/compact/compact.ts:772-1106
```

`partialCompactConversation` 支持两个方向：

```
部分压缩方向:
  ============================================================

  方向 'from' (默认):  保留前缀, 压缩后缀
  +------------------+------------------+
  | 保留 (messagesToKeep) | 压缩摘要        |
  | (前面的消息)          | (后面的消息)     |
  +------------------+------------------+
  --> prompt cache 命中 (前缀不变)

  方向 'up_to':  压缩前缀, 保留后缀
  +------------------+------------------+
  |    压缩摘要        | 保留 (messagesToKeep) |
  | (前面的消息)        | (后面的消息)          |
  +------------------+------------------+
  --> prompt cache 失效 (摘要改变了前缀)

  ============================================================
```

## 7. 消息分组机制

```
源文件: services/compact/grouping.ts
```

`groupMessagesByApiRound` 按 API 轮次对消息进行分组：

```typescript
// grouping.ts:22-63
export function groupMessagesByApiRound(messages: Message[]): Message[][] {
  // 边界判定: 当遇到新的 assistant 消息（不同 message.id）时切分
  // 同一个 streaming response 的多个块共享同一个 id
  // 所以 [tu_A(id=X), result_A, tu_B(id=X)] 会在同一组
}
```

这个分组用于 prompt-too-long 重试时精确丢弃"轮次"。

## 8. 压缩后恢复机制

### 8.1 文件恢复

```
源文件: services/compact/compact.ts:1415-1464
```

```typescript
export const POST_COMPACT_MAX_FILES_TO_RESTORE = 5
export const POST_COMPACT_TOKEN_BUDGET = 50_000
export const POST_COMPACT_MAX_TOKENS_PER_FILE = 5_000
```

压缩后会自动恢复最近读取的文件（最多5个），每个文件最多5K tokens，
总预算50K tokens。

### 8.2 Skill 恢复

```
源文件: services/compact/compact.ts:1494-1534
```

```typescript
export const POST_COMPACT_MAX_TOKENS_PER_SKILL = 5_000
export const POST_COMPACT_SKILLS_TOKEN_BUDGET = 25_000
```

已调用的 Skills 内容也会恢复，按最近使用排序，每个 skill 最多5K tokens，
总预算25K tokens。超过预算的 skill 只保留头部（setup/usage 指令通常在文件开头）。

### 8.3 Plan 和 PlanMode 恢复

```
源文件: services/compact/compact.ts:1470-1560
```

如果用户当前有活跃的 Plan 文件或处于 Plan Mode，这些上下文也会恢复。

### 8.4 Delta 附件重新声明

```
源文件: services/compact/compact.ts:567-585
```

压缩吃掉了之前的 delta 附件，需要重新声明：
- Deferred tools delta
- Agent listing delta
- MCP instructions delta

### 8.5 Post-Compact 清理

```
源文件: services/compact/postCompactCleanup.ts:31-77
```

```typescript
export function runPostCompactCleanup(querySource?: QuerySource): void {
  resetMicrocompactState()          // 重置微压缩状态
  resetContextCollapse()            // 重置上下文折叠 (如果启用)
  getUserContext.cache.clear?.()    // 清除用户上下文缓存
  resetGetMemoryFilesCache()       // 重置 CLAUDE.md 文件缓存
  clearSystemPromptSections()      // 清除系统提示词缓存
  clearClassifierApprovals()       // 清除分类器审批缓存
  clearSpeculativeChecks()         // 清除推测性检查
  clearBetaTracingState()          // 清除 beta tracing
  sweepFileContentCache()          // 清理文件内容缓存
  clearSessionMessagesCache()      // 清除会话消息缓存
}
```

**注意**：`sentSkillNames` 有意不清除（compact.ts:526-529），避免压缩后重新注入
~4K tokens 的 skill listing。

### 8.6 Compact Boundary 标记

```
源文件: services/compact/compact.ts:349-367
```

每次压缩都会创建一个 `SystemCompactBoundaryMessage`，记录：

```typescript
{
  compactMetadata: {
    preCompactDiscoveredTools: [...],    // 压缩前发现的工具
    preservedSegment: {                   // 保留的消息段
      headUuid: keep[0].uuid,
      anchorUuid: anchorUuid,
      tailUuid: keep.at(-1).uuid,
    },
  }
}
```

这个 boundary 被磁盘持久化系统用来在加载时正确重建消息链。

## 9. 防护设计

### 9.1 图像剥离

```
源文件: services/compact/compact.ts:145-200
```

在发送给压缩 LLM 之前，`stripImagesFromMessages` 将所有图像和文档块替换为
`[image]` / `[document]` 占位符。这防止了 CCD 会话中频繁附加图像导致压缩请求
本身触发 prompt_too_long。

### 9.2 重注入附件剥离

```
源文件: services/compact/compact.ts:211-223
```

`stripReinjectedAttachments` 过滤掉 `skill_discovery` 和 `skill_listing` 类型
的附件消息，因为这些会在压缩后通过其他机制重新注入。

### 9.3 工具使用阻止

```
源文件: services/compact/compact.ts:1125-1134
```

```typescript
export function createCompactCanUseTool(): CanUseToolFn {
  return async () => ({
    behavior: 'deny' as const,
    message: 'Tool use is not allowed during compaction',
    decisionReason: {
      type: 'other' as const,
      reason: 'compaction agent should only produce text summary',
    },
  })
}
```

压缩代理的所有工具调用都被拒绝。提示词中也强调了这一点（prompt.ts:19-26 的
NO_TOOLS_PREAMBLE）。

### 9.4 保活信号

```
源文件: services/compact/compact.ts:1159-1176
```

压缩 API 调用可能需要 5-10+ 秒。在此期间，定期发送 keep-alive 信号以防止
远程会话 WebSocket 因空闲超时而断开：

```typescript
const activityInterval = isSessionActivityTrackingActive()
  ? setInterval(
      (statusSetter) => {
        sendSessionActivitySignal()
        statusSetter?.('compacting')
      },
      30_000,
      context.setSDKStatus,
    )
  : undefined
```

## 10. 压缩警告系统

### 10.1 状态管理

```
源文件: services/compact/compactWarningState.ts
```

```typescript
export const compactWarningStore = createStore<boolean>(false)

// 成功压缩后抑制警告
export function suppressCompactWarning(): void {
  compactWarningStore.setState(() => true)
}

// 新压缩尝试开始时清除抑制
export function clearCompactWarningSuppression(): void {
  compactWarningStore.setState(() => false)
}
```

### 10.2 React Hook 集成

```
源文件: services/compact/compactWarningHook.ts
```

```typescript
export function useCompactWarningSuppression(): boolean {
  return useSyncExternalStore(
    compactWarningStore.subscribe,
    compactWarningStore.getState,
  )
}
```

这让 UI 可以在压缩刚完成但还没有新的 API 响应来更新 token 计数时，
暂时抑制"上下文即将满"的警告。

## 11. 与其他系统的交互

### 11.1 Context Collapse

当 `CONTEXT_COLLAPSE` 实验开启时，自动压缩被抑制（`autoCompact.ts:210-223`）。
上下文折叠在90%时开始提交，95%时阻塞新操作，完全接管了上下文管理。
自动压缩（~93%触发）恰好夹在两者之间，会与折叠竞争。

### 11.2 Prompt Cache 断裂检测

```
源文件: services/compact/compact.ts:698-703
```

每次压缩后都会通知 prompt cache break detection 重置基线，
避免压缩后 cache read 下降被错误标记为异常。

### 11.3 Session Transcript

```
源文件: services/compact/compact.ts:715-717
```

Kairos (assistant mode) 下，压缩前的消息会写入 session transcript segment。

## 12. 亮点发现

### 发现1：三级压缩策略的精密协调

压缩系统不是单一算法，而是三层递进策略：
- **微压缩**（时间MC + 缓存MC）：零 LLM 成本，保持缓存
- **Session Memory 压缩**：零额外 LLM 成本（利用后台已提取的摘要）
- **完整 LLM 压缩**：最后手段

这三层之间通过精确的阈值和条件判断来决定使用哪一层。自动压缩甚至会
**优先尝试 Session Memory 压缩**（autoCompact.ts:288），只有在 SM 不可用时
才调用 LLM。这是一个非常聪明的成本优化。

### 发现2：熔断器解决了真实的全球规模问题

`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3` 这个看似简单的常量，背后是一个
数据驱动的决策：BQ 数据显示 1,279 个会话出现了 50+ 次连续失败（最多 3,272 次），
每天浪费约 250K 次 API 调用。这个熔断器是一个经典的"小改动大影响"优化。

### 发现3：缓存共享 Fork 的工程美学

压缩的 LLM 调用通过 `runForkedAgent` 复用主对话的 prompt cache。
这意味着一次 200K token 的压缩调用，大部分 input tokens 来自 cache_read
而非 cache_creation，成本可能降低 90%。但这个设计也带来了约束 ——
fork 不能设置 `maxOutputTokens`，因为那会通过 `Math.min(budget, maxOutputTokens-1)`
改变 thinking config，导致 cache key 不匹配。

### 发现4：时间触发微压缩的"搭便车"哲学

时间触发 MC 的设计逻辑是：API 服务端的 prompt cache 有1小时 TTL。
如果用户离开超过1小时回来，缓存已经冷了，全部前缀都要重新写入。
既然代价已经付出了，不如趁机清理旧数据 —— 这是"反正要重写，不如少写一点"的
"搭便车"哲学。

### 发现5：Partial Compact 的 Cache 感知方向选择

两个部分压缩方向（from / up_to）并非等价：
- `from`（保留前缀）：prompt cache 完全命中，因为前缀不变
- `up_to`（保留后缀）：prompt cache 失效，因为摘要改变了前缀

这意味着 `from` 方向在成本上显著优于 `up_to`，这可能是它被设为默认方向的原因。

### 发现6：消息链完整性的精密维护

`annotateBoundaryWithPreservedSegment`（compact.ts:349-367）确保磁盘持久化后，
压缩 boundary 与保留消息之间的引用关系正确。这解决了一个微妙的问题：
保留的消息在磁盘上保持原始的 parentUuids（通过 dedup-skip），加载器需要
知道如何将 head -> anchor 和 anchor 的其他子节点 -> tail 进行正确拼接。

### 发现7：Prompt-Too-Long 的递归防护

压缩请求本身可能触发 prompt_too_long —— 一个"压缩无法压缩"的死锁场景。
`truncateHeadForPTLRetry` 通过逐步丢弃最旧的 API 轮次组来突破这个死锁，
并且小心地处理了之前重试添加的合成标记（避免重试退化为只丢弃标记本身），
以及切分后以 assistant 开头的无效序列。

### 发现8：不重置 sentSkillNames 的精打细算

compact.ts:526-529 明确注释了不重置 `sentSkillNames`，因为重新注入完整的
skill_listing（~4K tokens）只会产生 cache_creation 而没有实质收益。
模型仍然有 SkillTool 在 schema 中，invoked_skills 附件保留了已使用 skill 的
内容，新的 skill 通过 skillChangeDetector 动态添加。这个决策每次压缩事件
节省约 4K tokens 的 cache creation 成本。
