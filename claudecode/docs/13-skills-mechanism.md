# 上游工具Skills 机制深度解析

## 目录

1. [概述](#概述)
2. [系统架构](#系统架构)
3. [核心类型体系](#核心类型体系)
4. [Skill 加载层级与来源](#skill-加载层级与来源)
5. [文件系统加载器 loadSkillsDir](#文件系统加载器-loadskillsdir)
6. [Bundled Skills 内置技能系统](#bundled-skills-内置技能系统)
7. [内置技能详细清单](#内置技能详细清单)
8. [SkillTool — 模型调用技能的桥梁](#skilltool--模型调用技能的桥梁)
9. [Inline vs Fork 执行模式](#inline-vs-fork-执行模式)
10. [上下文预算 1% 规则](#上下文预算-1-规则)
11. [动态技能发现](#动态技能发现)
12. [条件技能 (Conditional Skills)](#条件技能-conditional-skills)
13. [MCP 技能集成](#mcp-技能集成)
14. [技能文件变更检测](#技能文件变更检测)
15. [SKILL.md 前置元数据规范](#skillmd-前置元数据规范)
16. [Skillify — 技能自动生成器](#skillify--技能自动生成器)
17. [权限与安全机制](#权限与安全机制)
18. [数据流总览](#数据流总览)
19. [亮点发现](#亮点发现)

---

## 概述

Skills 系统是上游工具的可扩展 prompt 注入框架,允许用户和组织定义可复用的
"技能"(本质上是结构化的 Markdown 提示词),通过 `/skill-name` 斜杠命令或由模型
自动触发。系统支持多层级来源(项目级、用户级、策略级、插件、MCP、内置),并提供
inline(当前上下文展开)和 fork(独立子代理执行)两种执行模式。

```
+---------------------------------------------------------------------+
|                    Skills 系统架构总览                                |
+---------------------------------------------------------------------+
|                                                                      |
|  来源层                                                              |
|  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌─────┐ ┌─────┐ |
|  │ Bundled  │ │ Project  │ │  User    │ │ Policy │ │ MCP │ │Plugin│ |
|  │ (内置)   │ │ (.claude │ │ (~/.claude│ │(managed│ │     │ │     │ |
|  │          │ │ /skills) │ │ /skills) │ │ .claude│ │     │ │     │ |
|  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └──┬──┘ └──┬──┘ |
|       │            │            │            │         │        │    |
|       v            v            v            v         v        v    |
|  ┌──────────────────────────────────────────────────────────────┐    |
|  │              Command Registry (统一注册表)                    │    |
|  └──────────────────────────┬───────────────────────────────────┘    |
|                             │                                        |
|             ┌───────────────┼───────────────┐                        |
|             v               v               v                        |
|     ┌──────────────┐ ┌──────────┐ ┌──────────────┐                  |
|     │ 用户输入      │ │ SkillTool│ │ 系统提示词    │                  |
|     │ /command      │ │ (模型调用)│ │ skill_listing│                  |
|     └──────┬───────┘ └────┬─────┘ └──────────────┘                  |
|            │              │                                          |
|            v              v                                          |
|     ┌────────────────────────────────────────┐                      |
|     │          执行引擎                        │                      |
|     │   ┌──────────┐    ┌──────────────┐     │                      |
|     │   │  Inline   │    │    Fork      │     │                      |
|     │   │  (展开到  │    │  (独立子代理  │     │                      |
|     │   │  当前上下文│    │   独立预算)   │     │                      |
|     │   └──────────┘    └──────────────┘     │                      |
|     └────────────────────────────────────────┘                      |
+---------------------------------------------------------------------+
```

## 系统架构

Skills 系统的核心文件分布:

```
skills/
├── bundledSkills.ts           # 内置技能注册框架
├── loadSkillsDir.ts           # 文件系统技能加载器(~1087行)
├── mcpSkillBuilders.ts        # MCP技能桥接注册
└── bundled/
    ├── index.ts               # 内置技能初始化入口
    ├── batch.ts               # /batch — 并行工作编排
    ├── claudeApi.ts           # /claude-api — Claude API技能
    ├── claudeApiContent.ts    # Claude API内容
    ├── claudeInChrome.ts      # /claude-in-chrome — 浏览器集成
    ├── debug.ts               # /debug — 调试会话
    ├── keybindings.ts         # /keybindings-help — 快捷键配置
    ├── loop.ts                # /loop — 循环定时任务
    ├── loremIpsum.ts          # lorem-ipsum 测试
    ├── remember.ts            # /remember — 记忆整理
    ├── scheduleRemoteAgents.ts # 远程代理调度
    ├── simplify.ts            # /simplify — 代码简化审查
    ├── skillify.ts            # /skillify — 技能自动生成
    ├── stuck.ts               # /stuck — 卡死诊断
    ├── updateConfig.ts        # /update-config — 配置更新
    ├── verify.ts              # /verify — 变更验证
    └── verifyContent.ts       # verify 内容

commands/skills/
├── index.ts                   # /skills 命令注册
└── skills.tsx                 # /skills 命令UI实现

components/skills/
└── SkillsMenu.tsx             # 技能列表菜单组件

tools/SkillTool/
├── SkillTool.ts               # SkillTool 工具实现(核心, ~1109行)
├── constants.ts               # 常量定义
├── prompt.ts                  # SkillTool 提示词与预算管理
└── UI.tsx                     # 渲染组件

utils/skills/
└── skillChangeDetector.ts     # 文件变更监听器
```

## 核心类型体系

文件路径: `src/types/command.ts`

Skills 在 上游工具中被建模为 `PromptCommand` 类型的 `Command`:

```typescript
// types/command.ts:25-57
export type PromptCommand = {
  type: 'prompt'
  progressMessage: string
  contentLength: number           // 内容长度(字符数,用于 token 估算)
  argNames?: string[]             // 命名参数列表
  allowedTools?: string[]         // 技能允许使用的工具
  model?: string                  // 模型覆盖
  source: SettingSource | 'builtin' | 'mcp' | 'plugin' | 'bundled'
  pluginInfo?: { ... }            // 插件来源信息
  disableNonInteractive?: boolean
  hooks?: HooksSettings           // 技能专属 hooks
  skillRoot?: string              // 技能资源根目录
  context?: 'inline' | 'fork'    // 执行模式
  agent?: string                  // fork模式下的代理类型
  effort?: EffortValue            // 努力等级覆盖
  paths?: string[]                // 条件激活的文件路径模式
  getPromptForCommand(            // 核心方法: 生成提示词内容
    args: string,
    context: ToolUseContext,
  ): Promise<ContentBlockParam[]>
}
```

**Command 的三种类型:**
```typescript
// types/command.ts:205-206
export type Command = CommandBase &
  (PromptCommand | LocalCommand | LocalJSXCommand)
```

- `PromptCommand`: 提示词类型(所有 Skills 都是此类型)
- `LocalCommand`: 本地命令(返回文本结果)
- `LocalJSXCommand`: 本地 JSX 命令(返回 React 组件)

**CommandBase 基础属性** (types/command.ts:175-203):
```typescript
export type CommandBase = {
  name: string                      // 技能名称
  description: string               // 描述
  whenToUse?: string                // 何时使用(用于模型自动触发)
  argumentHint?: string             // 参数提示
  disableModelInvocation?: boolean  // 禁止模型自动调用
  userInvocable?: boolean           // 用户是否可手动调用
  loadedFrom?: LoadedFrom           // 加载来源
  isHidden?: boolean                // 是否隐藏
  isEnabled?: () => boolean         // 动态启用检查
  version?: string                  // 版本号
  aliases?: string[]                // 别名
}
```

## Skill 加载层级与来源

文件路径: `src/skills/loadSkillsDir.ts:67-73`

```typescript
export type LoadedFrom =
  | 'commands_DEPRECATED'   // 旧版 /commands/ 目录
  | 'skills'                // 新版 /skills/ 目录
  | 'plugin'                // 插件来源
  | 'managed'               // 托管策略来源
  | 'bundled'               // 内置技能
  | 'mcp'                   // MCP 服务器来源
```

**加载优先级与目录结构:**

```
+----------------------------------------------------------------------+
|                 Skills 多层加载架构                                    |
+----------------------------------------------------------------------+
|                                                                       |
|  1. Policy Skills (策略技能, 最高优先级)                               |
|     路径: <managed-path>/.claude/skills/                               |
|     来源: policySettings                                              |
|     用途: 组织级强制技能, 不可跳过                                     |
|                                                                       |
|  2. User Skills (用户技能)                                            |
|     路径: ~/.claude/skills/                                           |
|     来源: userSettings                                                |
|     用途: 个人跨项目技能                                              |
|                                                                       |
|  3. Project Skills (项目技能)                                         |
|     路径: .claude/skills/ (向上遍历到 $HOME)                          |
|     来源: projectSettings                                             |
|     用途: 项目特定技能                                                |
|                                                                       |
|  4. Additional Dir Skills (附加目录)                                  |
|     路径: --add-dir 指定的目录/.claude/skills/                        |
|     来源: projectSettings                                             |
|                                                                       |
|  5. Legacy Commands (旧版命令, 兼容层)                                |
|     路径: .claude/commands/, ~/.claude/commands/                       |
|     来源: commands_DEPRECATED                                         |
|                                                                       |
|  6. Bundled Skills (内置技能, 程序化注册)                             |
|     来源: bundled                                                     |
|                                                                       |
|  7. MCP Skills (MCP 服务器提供)                                      |
|     来源: mcp                                                         |
|                                                                       |
|  8. Plugin Skills (插件提供)                                          |
|     来源: plugin                                                      |
+----------------------------------------------------------------------+
```

## 文件系统加载器 loadSkillsDir

文件路径: `src/skills/loadSkillsDir.ts`

### 技能目录结构

Skills 使用目录格式: `skill-name/SKILL.md`

```
.claude/skills/
├── deploy-pr/
│   └── SKILL.md            # 技能主文件
├── review-code/
│   ├── SKILL.md            # 技能主文件
│   └── templates/          # 附属资源
│       └── checklist.md
└── migrate-api/
    └── SKILL.md
```

### 加载流程 (loadSkillsDir.ts:407-480)

```typescript
async function loadSkillsFromSkillsDir(
  basePath: string,
  source: SettingSource,
): Promise<SkillWithPath[]> {
  const entries = await fs.readdir(basePath)

  const results = await Promise.all(
    entries.map(async (entry): Promise<SkillWithPath | null> => {
      // 只支持目录格式: skill-name/SKILL.md
      if (!entry.isDirectory() && !entry.isSymbolicLink()) return null

      const skillDirPath = join(basePath, entry.name)
      const skillFilePath = join(skillDirPath, 'SKILL.md')

      const content = await fs.readFile(skillFilePath, { encoding: 'utf-8' })
      const { frontmatter, content: markdownContent } = parseFrontmatter(content)

      const parsed = parseSkillFrontmatterFields(frontmatter, markdownContent, entry.name)
      return {
        skill: createSkillCommand({ ...parsed, skillName: entry.name, ... }),
        filePath: skillFilePath,
      }
    }),
  )
  return results.filter(r => r !== null)
}
```

### 去重机制 (loadSkillsDir.ts:726-769)

使用 `realpath` 解析符号链接,防止同一文件通过不同路径被重复加载:

```typescript
const fileIds = await Promise.all(
  allSkillsWithPaths.map(({ filePath }) => getFileIdentity(filePath))
)
const seenFileIds = new Map<string, SettingSource | ...>()
// 先出现的来源优先
```

### Frontmatter 解析 (loadSkillsDir.ts:185-265)

```typescript
export function parseSkillFrontmatterFields(
  frontmatter: FrontmatterData,
  markdownContent: string,
  resolvedName: string,
): {
  displayName: string | undefined
  description: string
  allowedTools: string[]
  argumentHint: string | undefined
  whenToUse: string | undefined
  model: string | undefined
  disableModelInvocation: boolean
  userInvocable: boolean
  hooks: HooksSettings | undefined
  executionContext: 'fork' | undefined   // context: fork
  agent: string | undefined
  effort: EffortValue | undefined
  shell: FrontmatterShell | undefined
  // ...
}
```

### createSkillCommand 命令创建 (loadSkillsDir.ts:270-401)

这是将 Markdown 文件转化为可执行 Command 的核心函数:

```typescript
export function createSkillCommand({ ... }): Command {
  return {
    type: 'prompt',
    name: skillName,
    // ...
    async getPromptForCommand(args, toolUseContext) {
      let finalContent = baseDir
        ? `Base directory for this skill: ${baseDir}\n\n${markdownContent}`
        : markdownContent

      // 参数替换
      finalContent = substituteArguments(finalContent, args, true, argumentNames)

      // ${CLAUDE_SKILL_DIR} 替换
      if (baseDir) {
        const skillDir = process.platform === 'win32'
          ? baseDir.replace(/\\/g, '/') : baseDir
        finalContent = finalContent.replace(/\$\{CLAUDE_SKILL_DIR\}/g, skillDir)
      }

      // ${CLAUDE_SESSION_ID} 替换
      finalContent = finalContent.replace(
        /\$\{CLAUDE_SESSION_ID\}/g, getSessionId()
      )

      // 安全: MCP 技能不执行内联 shell 命令
      if (loadedFrom !== 'mcp') {
        finalContent = await executeShellCommandsInPrompt(finalContent, ...)
      }

      return [{ type: 'text', text: finalContent }]
    },
  }
}
```

**关键处理步骤:**

```
+-------------------------------------------------------------+
|          Skill 内容处理管线                                    |
+-------------------------------------------------------------+
|                                                              |
|  原始 SKILL.md 内容                                          |
|       |                                                      |
|       v                                                      |
|  1. 添加 Base Directory 头部                                 |
|     "Base directory for this skill: /path/to/skill"          |
|       |                                                      |
|       v                                                      |
|  2. 参数替换 $arg_name -> 实际值                              |
|       |                                                      |
|       v                                                      |
|  3. ${CLAUDE_SKILL_DIR} -> 技能目录路径                       |
|       |                                                      |
|       v                                                      |
|  4. ${CLAUDE_SESSION_ID} -> 当前会话ID                        |
|       |                                                      |
|       v                                                      |
|  5. Shell 命令执行 (!`cmd` 语法, 仅非MCP来源)                |
|       |                                                      |
|       v                                                      |
|  最终提示词内容                                               |
+-------------------------------------------------------------+
```

## Bundled Skills 内置技能系统

文件路径: `src/skills/bundledSkills.ts`

内置技能是编译到 CLI 二进制文件中、对所有用户可用的技能。

### 注册框架

```typescript
// bundledSkills.ts:15-41
export type BundledSkillDefinition = {
  name: string
  description: string
  aliases?: string[]
  whenToUse?: string
  argumentHint?: string
  allowedTools?: string[]
  model?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  isEnabled?: () => boolean
  hooks?: HooksSettings
  context?: 'inline' | 'fork'
  agent?: string
  files?: Record<string, string>    // 附属文件,首次调用时解压到磁盘
  getPromptForCommand: (
    args: string,
    context: ToolUseContext,
  ) => Promise<ContentBlockParam[]>
}
```

**注册流程:**
```typescript
// bundledSkills.ts:53-100
export function registerBundledSkill(definition: BundledSkillDefinition): void {
  const command: Command = {
    type: 'prompt',
    name: definition.name,
    source: 'bundled',
    loadedFrom: 'bundled',
    // ... 映射所有字段
  }
  bundledSkills.push(command)
}
```

### 附属文件安全解压 (bundledSkills.ts:131-206)

对于携带 `files` 字段的技能(如 /verify),系统在首次调用时将文件安全写入磁盘:

```typescript
async function safeWriteFile(p: string, content: string): Promise<void> {
  // O_NOFOLLOW | O_EXCL — 防止符号链接攻击
  const fh = await open(p, SAFE_WRITE_FLAGS, 0o600)
  try {
    await fh.writeFile(content, 'utf8')
  } finally {
    await fh.close()
  }
}
```

安全措施:
- `O_NOFOLLOW`: 不跟随符号链接
- `O_EXCL`: 文件已存在则失败(不覆盖)
- `0o600` 权限: 仅所有者可读写
- `0o700` 目录权限: 仅所有者可访问
- 路径遍历检查: 拒绝包含 `..` 的路径

### 初始化入口 (bundled/index.ts:24-79)

```typescript
export function initBundledSkills(): void {
  // 始终注册的技能
  registerUpdateConfigSkill()
  registerKeybindingsSkill()
  registerVerifySkill()
  registerDebugSkill()
  registerLoremIpsumSkill()
  registerSkillifySkill()
  registerRememberSkill()
  registerSimplifySkill()
  registerBatchSkill()
  registerStuckSkill()

  // 条件注册(feature flag 控制)
  if (feature('KAIROS') || feature('KAIROS_DREAM')) {
    const { registerDreamSkill } = require('./dream.js')
    registerDreamSkill()
  }
  if (feature('AGENT_TRIGGERS')) {
    const { registerLoopSkill } = require('./loop.js')
    registerLoopSkill()
  }
  // ... 更多条件注册
}
```

**注意动态 require**: 条件技能使用 `require()` 而非静态 `import`,避免在
feature flag 关闭时加载多余代码。

## 内置技能详细清单

```
+----------------------------------------------------------------------+
|  技能名称         | 描述                     | 用户可调 | 模型可调  |
+----------------------------------------------------------------------+
|  update-config   | 配置 settings.json        |   是    |   是     |
|  keybindings-help| 快捷键配置帮助            |   否    |   是     |
|  verify          | 验证代码变更              |   是    |   是     |
|  debug           | 调试会话日志              |   是    |   否     |
|  lorem-ipsum     | 测试用填充文本            |   是    |   是     |
|  skillify        | 从会话生成技能            |   是    |   否     |
|  remember        | 记忆层整理                |   是    |   是     |
|  simplify        | 代码审查与简化            |   是    |   是     |
|  batch           | 并行工作编排              |   是    |   否     |
|  stuck           | 卡死进程诊断 [ANT]        |   是    |   是     |
|  loop*           | 循环定时任务              |   是    |   是     |
|  dream*          | Kairos梦境                |   是    |   是     |
|  claude-api*     | Claude API技能            |   是    |   是     |
|  claude-in-chrome| 浏览器集成                |   是    |   是     |
+----------------------------------------------------------------------+
|  * 标记为条件注册(依赖 feature flag)                                 |
+----------------------------------------------------------------------+
```

### 典型技能剖析: /simplify

文件路径: `src/skills/bundled/simplify.ts`

```typescript
export function registerSimplifySkill(): void {
  registerBundledSkill({
    name: 'simplify',
    description: 'Review changed code for reuse, quality, and efficiency, '
      + 'then fix any issues found.',
    userInvocable: true,
    async getPromptForCommand(args) {
      let prompt = SIMPLIFY_PROMPT
      if (args) {
        prompt += `\n\n## Additional Focus\n\n${args}`
      }
      return [{ type: 'text', text: prompt }]
    },
  })
}
```

/simplify 的提示词指示模型启动 **三个并行 Agent**:
1. **Code Reuse Review** — 查找可复用的现有工具函数
2. **Code Quality Review** — 检查代码质量问题(7类检查项)
3. **Efficiency Review** — 检查性能问题(7类检查项)

然后汇总发现并直接修复。

### 典型技能剖析: /batch

文件路径: `src/skills/bundled/batch.ts`

/batch 是最复杂的内置技能,分三阶段:

```
Phase 1: 研究与计划 (Plan Mode)
  ├── 启动子代理深度研究代码库
  ├── 分解为 5-30 个独立工作单元
  ├── 确定端到端测试方案
  └── 生成计划文档

Phase 2: 派遣工作者
  ├── 每个工作单元启动一个背景 Agent
  ├── 使用 isolation: "worktree" (Git worktree 隔离)
  ├── 每个 Agent 独立实现、测试、提交、创建 PR
  └── 所有 Agent 并行执行

Phase 3: 跟踪进度
  ├── 渲染状态表格
  ├── 解析每个 Agent 的 PR URL
  └── 汇总最终结果
```

## SkillTool — 模型调用技能的桥梁

文件路径: `src/tools/SkillTool/SkillTool.ts`

SkillTool 是一个标准的上游工具Tool,允许模型主动调用技能:

### 输入 Schema (SkillTool.ts:291-298)

```typescript
export const inputSchema = lazySchema(() =>
  z.object({
    skill: z.string().describe('The skill name. E.g., "commit", "review-pr"'),
    args: z.string().optional().describe('Optional arguments for the skill'),
  }),
)
```

### 验证流程 (SkillTool.ts:354-430)

```
+----------------------------------------------------------+
|              SkillTool 验证流程                             |
+----------------------------------------------------------+
|                                                           |
|  1. 去除前导 / (兼容性)                                   |
|       skill: "/commit" -> "commit"                        |
|                                                           |
|  2. 检查远程规范技能 (实验性)                              |
|       _canonical_<slug> -> 特殊处理                       |
|                                                           |
|  3. 查找本地命令 (含MCP技能)                              |
|       findCommand(name, commands)                         |
|                                                           |
|  4. 检查 disableModelInvocation                          |
|       /skillify, /batch 等禁止模型自动调用                |
|                                                           |
|  5. 确认是 prompt 类型                                    |
|       非 prompt 类型技能不可通过 SkillTool 调用            |
+----------------------------------------------------------+
```

### 权限检查 (SkillTool.ts:432-578)

```typescript
async checkPermissions({ skill, args }, context): Promise<PermissionDecision> {
  // 1. 检查 deny 规则
  const denyRules = getRuleByContentsForTool(permissionContext, SkillTool, 'deny')

  // 2. 检查 allow 规则
  const allowRules = getRuleByContentsForTool(permissionContext, SkillTool, 'allow')

  // 3. 安全属性自动放行
  if (skillHasOnlySafeProperties(commandObj)) {
    return { behavior: 'allow', ... }
  }

  // 4. 默认: 询问用户
  return { behavior: 'ask', ... }
}
```

**安全属性白名单** (SkillTool.ts:875-908):

```typescript
const SAFE_SKILL_PROPERTIES = new Set([
  // PromptCommand 属性
  'type', 'progressMessage', 'contentLength', 'argNames',
  'model', 'effort', 'source', 'pluginInfo', ...
  // CommandBase 属性
  'name', 'description', 'whenToUse', 'version', ...
])
```

只有当技能的所有属性都在安全白名单内时才自动放行。如果技能包含
`allowedTools`(非空)、`hooks` 等高权限属性,则需要用户确认。

### 执行流程 (SkillTool.ts:580-841)

```typescript
async call({ skill, args }, context, canUseTool, parentMessage, onProgress?) {
  const commandName = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed

  // Fork 模式
  if (command?.type === 'prompt' && command.context === 'fork') {
    return executeForkedSkill(command, commandName, args, context, ...)
  }

  // Inline 模式 (默认)
  const processedCommand = await processPromptSlashCommand(
    commandName, args || '', commands, context
  )

  return {
    data: { success: true, commandName, allowedTools, model },
    newMessages,           // 技能内容作为新消息注入
    contextModifier(ctx) { // 修改后续上下文
      // 注入 allowedTools
      // 覆盖 model
      // 覆盖 effort
    },
  }
}
```

## Inline vs Fork 执行模式

文件路径: `src/types/command.ts:42-48`, `src/tools/SkillTool/SkillTool.ts:118-289`

```
+--------------------------------------------------------------+
|          Inline vs Fork 执行模式对比                           |
+--------------------------------------------------------------+
|                                                               |
|  Inline (默认):                                               |
|  ┌──────────────────────────────────────┐                     |
|  │  主对话上下文                          │                     |
|  │  ├── 用户消息                         │                     |
|  │  ├── 助手消息                         │                     |
|  │  ├── [SkillTool 调用]                │                     |
|  │  ├── [技能内容展开为用户消息]          │                     |
|  │  │    "Base directory: /path..."     │                     |
|  │  │    "# Skill Title..."            │                     |
|  │  ├── 助手继续执行技能指令             │                     |
|  │  └── ... (共享上下文预算)             │                     |
|  └──────────────────────────────────────┘                     |
|                                                               |
|  Fork:                                                        |
|  ┌──────────────────────────────────────┐                     |
|  │  主对话上下文                          │                     |
|  │  ├── [SkillTool 调用]                │                     |
|  │  ├── [等待子代理完成]                 │                     |
|  │  └── [接收子代理结果摘要]             │                     |
|  └──────────────────────────────────────┘                     |
|                    ↕ (隔离)                                    |
|  ┌──────────────────────────────────────┐                     |
|  │  子代理上下文 (独立 token 预算)        │                     |
|  │  ├── 技能提示词                       │                     |
|  │  ├── 子代理执行工具调用               │                     |
|  │  ├── 子代理收集结果                   │                     |
|  │  └── 提取结果文本返回主对话            │                     |
|  └──────────────────────────────────────┘                     |
+--------------------------------------------------------------+
```

### Fork 执行详解 (SkillTool.ts:122-289)

```typescript
async function executeForkedSkill(
  command: Command & { type: 'prompt' },
  commandName: string,
  args: string | undefined,
  context: ToolUseContext,
  canUseTool: CanUseToolFn,
  parentMessage: AssistantMessage,
  onProgress?: ToolCallProgress<Progress>,
): Promise<ToolResult<Output>> {
  const agentId = createAgentId()

  const { modifiedGetAppState, baseAgent, promptMessages, skillContent } =
    await prepareForkedCommandContext(command, args || '', context)

  // 运行子代理
  for await (const message of runAgent({
    agentDefinition: agentDefinition,
    promptMessages,
    toolUseContext: { ...context, getAppState: modifiedGetAppState },
    canUseTool,
    isAsync: false,
    querySource: 'agent:custom',
    model: command.model,
    availableTools: context.options.tools,
    override: { agentId },
  })) {
    agentMessages.push(message)
    // 报告工具使用进度
  }

  const resultText = extractResultText(agentMessages, 'Skill execution completed')
  agentMessages.length = 0  // 释放消息内存

  return {
    data: { success: true, commandName, status: 'forked', agentId, result: resultText },
  }
}
```

**Fork 模式适用场景:**
- 自包含任务,不需要中途用户交互
- 需要大量上下文但不想污染主对话
- 长时间运行的后台任务

**Inline 模式适用场景:**
- 需要用户中途指导
- 需要访问当前对话上下文
- 简单的提示词注入

## 上下文预算 1% 规则

文件路径: `src/tools/SkillTool/prompt.ts`

这是 Skills 系统中最重要的资源管理机制之一:

```typescript
// prompt.ts:20-23
// Skill listing gets 1% of the context window (in characters)
export const SKILL_BUDGET_CONTEXT_PERCENT = 0.01
export const CHARS_PER_TOKEN = 4
export const DEFAULT_CHAR_BUDGET = 8_000  // Fallback: 1% of 200k * 4
```

**预算计算** (prompt.ts:31-41):
```typescript
export function getCharBudget(contextWindowTokens?: number): number {
  if (Number(process.env.SLASH_COMMAND_TOOL_CHAR_BUDGET)) {
    return Number(process.env.SLASH_COMMAND_TOOL_CHAR_BUDGET)  // 环境变量覆盖
  }
  if (contextWindowTokens) {
    return Math.floor(
      contextWindowTokens * CHARS_PER_TOKEN * SKILL_BUDGET_CONTEXT_PERCENT,
    )
  }
  return DEFAULT_CHAR_BUDGET  // 8000 字符
}
```

```
+--------------------------------------------------------------+
|          上下文预算 1% 规则示意                                 |
+--------------------------------------------------------------+
|                                                               |
|  上下文窗口: 200,000 tokens                                   |
|                                                               |
|  预算计算:                                                    |
|    200,000 tokens * 4 chars/token * 1% = 8,000 chars          |
|                                                               |
|  预算分配 (在 system-reminder 中):                             |
|  ┌──────────────────────────────────────────────┐             |
|  │  - commit: Commit changes to git             │             |
|  │  - review-pr: Review a pull request          │             |
|  │  - deploy: Deploy to staging                 │             |
|  │  - simplify: Review changed code...          │             |
|  │  - update-config: Use this skill to...       │  <= 8000    |
|  │  - ...                                       │    chars    |
|  └──────────────────────────────────────────────┘             |
|                                                               |
|  超出预算策略:                                                |
|    1. 首先尝试完整描述                                        |
|    2. 超出则截断非内置技能描述                                |
|    3. 极端情况: 非内置技能仅显示名称                          |
|    4. 内置技能始终保留完整描述                                |
+--------------------------------------------------------------+
```

### 描述截断算法 (prompt.ts:70-171)

```typescript
export function formatCommandsWithinBudget(
  commands: Command[],
  contextWindowTokens?: number,
): string {
  const budget = getCharBudget(contextWindowTokens)

  // 1. 尝试完整描述
  if (fullTotal <= budget) return fullEntries.map(e => e.full).join('\n')

  // 2. 分离内置技能(永不截断)和其他技能
  // 内置技能始终保留完整描述

  // 3. 计算非内置技能的可用空间
  const remainingBudget = budget - bundledChars
  const maxDescLen = Math.floor(availableForDescs / restCommands.length)

  // 4. 极端情况: 描述太短则名称模式
  if (maxDescLen < MIN_DESC_LENGTH) {
    return commands.map((cmd, i) =>
      bundledIndices.has(i) ? fullEntries[i]!.full : `- ${cmd.name}`,
    ).join('\n')
  }

  // 5. 正常截断
  return commands.map((cmd, i) => {
    if (bundledIndices.has(i)) return fullEntries[i]!.full
    return `- ${cmd.name}: ${truncate(description, maxDescLen)}`
  }).join('\n')
}
```

**单条描述上限** (prompt.ts:29):
```typescript
export const MAX_LISTING_DESC_CHARS = 250
```

单个技能的 `whenToUse` 描述最多 250 字符,因为技能列表仅用于发现,
完整内容在实际调用时通过 SkillTool 加载。

## 动态技能发现

文件路径: `src/skills/loadSkillsDir.ts:818-975`

动态技能发现是一种运行时机制:当模型读写文件时,系统自动在文件路径上方
搜索 `.claude/skills/` 目录,发现深层嵌套的项目技能。

```typescript
// loadSkillsDir.ts:861-915
export async function discoverSkillDirsForPaths(
  filePaths: string[],
  cwd: string,
): Promise<string[]> {
  for (const filePath of filePaths) {
    let currentDir = dirname(filePath)
    // 从文件所在目录向上遍历到 cwd (不含 cwd 本身)
    while (currentDir.startsWith(resolvedCwd + pathSep)) {
      const skillDir = join(currentDir, '.claude', 'skills')
      if (!dynamicSkillDirs.has(skillDir)) {
        dynamicSkillDirs.add(skillDir)
        await fs.stat(skillDir)
        // 检查是否被 gitignore 忽略
        if (await isPathGitignored(currentDir, resolvedCwd)) continue
        newDirs.push(skillDir)
      }
      currentDir = dirname(currentDir)
    }
  }
  // 深路径优先排序
  return newDirs.sort((a, b) => b.split(pathSep).length - a.split(pathSep).length)
}
```

```
+--------------------------------------------------------------+
|          动态技能发现示意                                      |
+--------------------------------------------------------------+
|                                                               |
|  cwd: /project                                                |
|                                                               |
|  模型读取: /project/packages/web/src/api/handler.ts           |
|                                                               |
|  搜索路径 (从深到浅):                                         |
|    /project/packages/web/src/api/.claude/skills/  ← 检查     |
|    /project/packages/web/src/.claude/skills/      ← 检查     |
|    /project/packages/web/.claude/skills/          ← 检查     |
|    /project/packages/.claude/skills/              ← 检查     |
|    /project/ ← 跳过 (cwd级别已在启动时加载)                   |
|                                                               |
|  找到新目录 → loadSkillsFromSkillsDir() → dynamicSkills      |
|  深路径技能覆盖浅路径同名技能                                 |
+--------------------------------------------------------------+
```

### 信号通知机制

```typescript
const skillsLoaded = createSignal()

export function onDynamicSkillsLoaded(callback: () => void): () => void {
  return skillsLoaded.subscribe(() => { callback() })
}
```

当动态技能加载完成时,通过信号通知其他模块清除缓存。

## 条件技能 (Conditional Skills)

文件路径: `src/skills/loadSkillsDir.ts:824-1058`

条件技能是带有 `paths` frontmatter 的技能,只有当模型操作匹配路径的文件时才激活:

```yaml
---
name: react-patterns
paths:
  - src/components/**
  - src/hooks/**
---
# React Patterns Skill
...
```

```typescript
// loadSkillsDir.ts:997-1058
export function activateConditionalSkillsForPaths(
  filePaths: string[],
  cwd: string,
): string[] {
  for (const [name, skill] of conditionalSkills) {
    const skillIgnore = ignore().add(skill.paths)
    for (const filePath of filePaths) {
      const relativePath = relative(cwd, filePath)
      if (skillIgnore.ignores(relativePath)) {
        // 激活: 从条件池移到动态技能池
        dynamicSkills.set(name, skill)
        conditionalSkills.delete(name)
        activatedConditionalSkillNames.add(name)
        activated.push(name)
        break
      }
    }
  }
}
```

使用 `ignore` 库(gitignore 风格匹配),与 CLAUDE.md 条件规则行为一致。

## MCP 技能集成

文件路径: `src/skills/mcpSkillBuilders.ts`

MCP 技能通过一个无循环依赖的桥接模块注册:

```typescript
// mcpSkillBuilders.ts — 写一次注册,依赖图叶节点
export type MCPSkillBuilders = {
  createSkillCommand: typeof createSkillCommand
  parseSkillFrontmatterFields: typeof parseSkillFrontmatterFields
}

let builders: MCPSkillBuilders | null = null

export function registerMCPSkillBuilders(b: MCPSkillBuilders): void {
  builders = b
}

export function getMCPSkillBuilders(): MCPSkillBuilders {
  if (!builders) {
    throw new Error('MCP skill builders not registered')
  }
  return builders
}
```

**为什么需要桥接?** (mcpSkillBuilders.ts:1-24 注释原文翻译)

`loadSkillsDir.ts` 传递性地引入了几乎所有模块。如果 `mcpSkills.ts` 直接导入
`loadSkillsDir.ts`,会在依赖图中引入大量循环依赖。动态 import 在 Bun 打包的
二进制文件中无法正确解析(specifier 被解析为 `/$bunfs/root/...` 路径)。
因此使用"写一次注册"模式:在 `loadSkillsDir.ts` 模块初始化时注册,
MCP 代码通过 `getMCPSkillBuilders()` 获取。

**MCP 技能的安全限制:**
```typescript
// loadSkillsDir.ts:371-396
// Security: MCP skills are remote and untrusted — never execute inline
// shell commands (!`...` / ```! ... ```) from their markdown body.
if (loadedFrom !== 'mcp') {
  finalContent = await executeShellCommandsInPrompt(finalContent, ...)
}
```

MCP 技能的 Markdown 内容中的 shell 命令(`!`command``)不会被执行。

## 技能文件变更检测

文件路径: `src/utils/skills/skillChangeDetector.ts`

使用 chokidar 文件监听器实时检测技能文件变更:

```typescript
// skillChangeDetector.ts:85-141
export async function initialize(): Promise<void> {
  const paths = await getWatchablePaths()
  watcher = chokidar.watch(paths, {
    persistent: true,
    ignoreInitial: true,
    depth: 2,              // skill-name/SKILL.md 格式需要深度2
    awaitWriteFinish: {
      stabilityThreshold: 1000,  // 文件写入稳定后1秒
      pollInterval: 500,
    },
    usePolling: USE_POLLING, // Bun下使用轮询避免死锁
    interval: 2000,         // 2秒轮询间隔
    atomic: true,
  })
}
```

**Bun 死锁规避** (skillChangeDetector.ts:52-62):

```typescript
// Bun 的 PathWatcherManager 有死锁问题 (oven-sh/bun#27469):
// 在主线程关闭 watcher 时,如果文件监听线程正在投递事件,
// 两个线程会在 __ulock_wait2 中永久挂起。
// 解决方案: Bun 下使用 stat() 轮询代替 FSWatcher。
const USE_POLLING = typeof Bun !== 'undefined'
```

**防抖机制** (skillChangeDetector.ts:254-279):

```typescript
const RELOAD_DEBOUNCE_MS = 300

function scheduleReload(changedPath: string): void {
  pendingChangedPaths.add(changedPath)
  if (reloadTimer) clearTimeout(reloadTimer)
  reloadTimer = setTimeout(async () => {
    // 执行 ConfigChange hooks
    const results = await executeConfigChangeHooks('skills', paths[0]!)
    if (hasBlockingResult(results)) return  // hooks 可以阻止重载

    clearSkillCaches()
    clearCommandsCache()
    resetSentSkillNames()
    skillsChanged.emit()
  }, RELOAD_DEBOUNCE_MS)
}
```

300ms 防抖确保批量文件变更(如 git 操作)只触发一次重载。

## SKILL.md 前置元数据规范

技能的 SKILL.md 文件使用 YAML frontmatter:

```yaml
---
name: deploy-pr
description: Deploy a PR to staging environment
allowed-tools:
  - Bash(gh:*)
  - Bash(kubectl:*)
when_to_use: >
  Use when the user wants to deploy a PR to staging.
  Triggers: "deploy", "ship to staging", "stage this PR"
argument-hint: "<PR number>"
arguments:
  - pr_number
context: fork
agent: general-purpose
model: sonnet
effort: high
user-invocable: true
disable-model-invocation: false
paths:
  - deploy/**
  - k8s/**
hooks:
  PostToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "echo done"
---

# Deploy PR to Staging

## Inputs
- `$pr_number`: The PR number to deploy

## Steps
1. Fetch PR details...
```

**所有支持的 frontmatter 字段:**

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 显示名称(可与目录名不同) |
| description | string | 技能描述 |
| allowed-tools | string[] | 允许使用的工具模式 |
| when_to_use | string | 自动触发条件描述 |
| argument-hint | string | 参数提示 |
| arguments | string[] | 命名参数 |
| context | 'inline'\|'fork' | 执行模式 |
| agent | string | fork模式下的代理类型 |
| model | string | 模型覆盖 |
| effort | string\|number | 努力等级 |
| user-invocable | boolean | 用户可否手动调用 |
| disable-model-invocation | boolean | 禁止模型自动调用 |
| paths | string[] | 条件激活路径模式 |
| hooks | object | 技能专属 hooks |
| version | string | 版本号 |
| shell | object | Shell 配置 |

## Skillify — 技能自动生成器

文件路径: `src/skills/bundled/skillify.ts`

/skillify 是一个元技能,能从当前会话中提取可复用流程并生成新的 SKILL.md:

```
+--------------------------------------------------------------+
|          /skillify 工作流程                                    |
+--------------------------------------------------------------+
|                                                               |
|  Step 1: 分析会话                                             |
|  ├── 读取 Session Memory 摘要                                 |
|  ├── 提取所有用户消息                                         |
|  └── 识别重复流程、输入/输出、工具使用                        |
|                                                               |
|  Step 2: 访谈用户 (4 轮 AskUserQuestion)                     |
|  ├── Round 1: 确认名称和目标                                  |
|  ├── Round 2: 确认步骤、参数、执行模式、保存位置              |
|  ├── Round 3: 细化每个步骤的成功标准、执行方式、检查点        |
|  └── Round 4: 确认触发条件和注意事项                          |
|                                                               |
|  Step 3: 生成 SKILL.md                                        |
|  ├── 构建 frontmatter (name, description, allowed-tools, etc) |
|  ├── 编写步骤说明 (含成功标准、执行注解)                      |
|  └── 输出代码块供用户审查                                     |
|                                                               |
|  Step 4: 确认保存                                             |
|  ├── AskUserQuestion 确认                                     |
|  ├── 写入文件                                                 |
|  └── 告知调用方式: /skill-name [args]                         |
+--------------------------------------------------------------+
```

## 权限与安全机制

### 安全属性白名单

SkillTool 使用白名单机制决定技能是否需要用户确认:

```typescript
// SkillTool.ts:910-933
function skillHasOnlySafeProperties(command: Command): boolean {
  for (const key of Object.keys(command)) {
    if (SAFE_SKILL_PROPERTIES.has(key)) continue
    const value = (command as Record<string, unknown>)[key]
    if (value === undefined || value === null) continue
    if (Array.isArray(value) && value.length === 0) continue
    // 有非安全属性且有实际值 -> 需要确认
    return false
  }
  return true
}
```

### 规则匹配

```typescript
const ruleMatches = (ruleContent: string): boolean => {
  const normalizedRule = ruleContent.startsWith('/')
    ? ruleContent.substring(1) : ruleContent
  // 精确匹配
  if (normalizedRule === commandName) return true
  // 前缀匹配: "review:*" 匹配 "review-pr 123"
  if (normalizedRule.endsWith(':*')) {
    return commandName.startsWith(normalizedRule.slice(0, -2))
  }
  return false
}
```

### MCP 技能安全限制

1. **不执行内联 shell**: MCP 技能的 Markdown 中的 `!command` 不被执行
2. **不加载附属文件**: `${CLAUDE_SKILL_DIR}` 对 MCP 技能无意义
3. **独立来源标识**: `loadedFrom: 'mcp'` 在权限检查中可做特殊处理

### Bundled Skills 文件提取安全

```typescript
// bundledSkills.ts:176-193
const SAFE_WRITE_FLAGS = process.platform === 'win32'
  ? 'wx'
  : fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW

async function safeWriteFile(p: string, content: string): Promise<void> {
  const fh = await open(p, SAFE_WRITE_FLAGS, 0o600)
  // ...
}
```

- `O_EXCL`: 文件已存在不覆盖
- `O_NOFOLLOW`: 不跟随符号链接
- `0o600/0o700`: 严格文件权限

## 数据流总览

```
+----------------------------------------------------------------------+
|                Skills 完整数据流                                      |
+----------------------------------------------------------------------+
|                                                                       |
|  启动阶段                                                             |
|  ├── initBundledSkills()                                              |
|  │   └── registerBundledSkill() x N → bundledSkills[]                 |
|  ├── getSkillDirCommands(cwd)                                         |
|  │   ├── loadSkillsFromSkillsDir(managed) → managedSkills             |
|  │   ├── loadSkillsFromSkillsDir(user)    → userSkills                |
|  │   ├── loadSkillsFromSkillsDir(project) → projectSkills             |
|  │   ├── loadSkillsFromCommandsDir(cwd)   → legacyCommands            |
|  │   ├── 去重 (realpath)                                              |
|  │   ├── 分离条件技能 (paths frontmatter)                             |
|  │   └── → unconditionalSkills + conditionalSkills                    |
|  └── skillChangeDetector.initialize()                                 |
|      └── chokidar.watch(skillDirs)                                    |
|                                                                       |
|  运行阶段                                                             |
|  ├── 系统提示词中的技能列表                                           |
|  │   └── formatCommandsWithinBudget(commands, contextWindow)          |
|  │       └── 1% 预算内截断描述                                        |
|  │                                                                    |
|  ├── 用户输入 /skill-name args                                        |
|  │   └── processPromptSlashCommand() → 展开内容                       |
|  │                                                                    |
|  ├── 模型调用 SkillTool                                               |
|  │   ├── validateInput() → 检查技能存在性                             |
|  │   ├── checkPermissions() → 权限决策                                |
|  │   └── call()                                                       |
|  │       ├── inline → 内容注入为新消息                                |
|  │       └── fork → runAgent() 独立子代理                             |
|  │                                                                    |
|  ├── 文件操作触发动态发现                                             |
|  │   ├── discoverSkillDirsForPaths() → 新技能目录                     |
|  │   ├── addSkillDirectories() → 加载新技能                           |
|  │   └── activateConditionalSkillsForPaths() → 激活条件技能           |
|  │                                                                    |
|  └── 文件变更触发重载                                                 |
|      └── handleChange() → scheduleReload() (300ms 防抖)               |
|          ├── clearSkillCaches()                                       |
|          ├── clearCommandsCache()                                     |
|          └── skillsChanged.emit()                                     |
+----------------------------------------------------------------------+
```

## 亮点发现

### 1. 1% 预算规则的精巧平衡

技能列表仅占上下文窗口的 1% (默认 8000 字符),这是经过精心权衡的:
- 太少: 模型无法发现可用技能
- 太多: 浪费宝贵的上下文空间

内置技能永远保留完整描述(它们的价值密度高),非内置技能按比例截断。
极端情况下(大量用户技能),非内置技能甚至只显示名称。

单条描述还有 250 字符硬上限(`MAX_LISTING_DESC_CHARS`),因为"列表仅用于发现,
实际内容在调用时加载"。

### 2. Bones/Soul 分层思想的复用

Bundled Skills 的 `files` 字段设计与 Buddy 系统的 Bones/Soul 分离异曲同工:
技能提示词编译到二进制中(不可篡改),附属文件在运行时安全解压到临时目录。
使用 per-process nonce 作为主防御,`O_EXCL|O_NOFOLLOW` 作为纵深防御。

### 3. 三层技能发现: 静态 + 条件 + 动态

```
静态技能: 启动时加载,始终可见
    ↓ (paths frontmatter)
条件技能: 启动时加载但不可见,文件匹配时激活
    ↓ (运行时文件操作)
动态技能: 运行时发现新目录,加载新技能
```

这种三层设计意味着:
- 大部分技能启动时就绑定,零延迟
- 路径敏感的技能仅在相关时出现,减少噪音
- 深层嵌套的技能按需发现,支持 monorepo 场景

### 4. MCP 技能的信任边界

MCP 技能明确标记为"远程不可信":
- 不执行内联 shell 命令(防止远程代码执行)
- `${CLAUDE_SKILL_DIR}` 无意义(没有本地文件)
- 在 SkillsMenu 中与其他来源分组显示

这是一个清晰的安全分层: 本地技能可以包含可执行的 shell 片段,
远程技能只能是纯 Markdown 指令。

### 5. mcpSkillBuilders 的循环依赖规避

`mcpSkillBuilders.ts` 是一个优雅的依赖图叶节点:
- 它只导入类型(编译后擦除)
- `loadSkillsDir.ts` 在模块初始化时注册构建器
- `mcpSkills.ts` 在运行时获取构建器

避免了 `client.ts -> mcpSkills.ts -> loadSkillsDir.ts -> ... -> client.ts` 的循环,
也绕开了 Bun bundled binary 中动态 import 的解析问题。

### 6. Skillify 的元递归性

/skillify 是一个用技能来创建技能的元技能。它从当前会话的用户消息和 session memory
中提取可复用流程,通过 4 轮结构化访谈确认细节,然后生成符合规范的 SKILL.md。
生成的技能立即可用,形成了技能系统的自我进化能力。

### 7. Bun 文件监听死锁的实用规避

`skillChangeDetector.ts` 中明确记录了 Bun 的 `PathWatcherManager` 死锁问题
(oven-sh/bun#27469, #26385),并采用 stat() 轮询作为替代。
2 秒的轮询间隔是权衡: 技能文件很少变更(手动编辑、git 操作),
2 秒延迟换来远少于默认 100ms 的 stat() 调用。

### 8. /batch 的 Worktree 隔离架构

/batch 技能是 Skills 系统能力的极致展示: 一个技能能编排 5-30 个并行代理,
每个代理在独立的 Git worktree 中工作,独立提交和创建 PR。
这展示了 Skills 不仅仅是提示词注入,而是可以编排复杂的多代理工作流。

### 9. 安全属性白名单的"默认拒绝"哲学

`SAFE_SKILL_PROPERTIES` 白名单的设计哲学是: 新添加到 `PromptCommand` 的属性
默认需要用户确认,除非被显式加入白名单。这意味着:
- 添加新的高权限属性(如 `hooks`)会自动触发确认
- 开发者必须有意识地决定新属性是否安全
- "忘记加入白名单"的后果是多一次确认(安全侧),而非跳过确认(危险侧)
