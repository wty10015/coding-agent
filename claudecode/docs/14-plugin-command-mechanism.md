# 上游工具插件与命令机制深度分析

## 1. 架构总览

上游工具的插件与命令系统是一个多层架构，支持从内建命令到第三方市场插件的完整生态。
系统设计同时兼顾了安全性（同形字攻击防御、官方仿冒检测）和扩展性（市场注册、版本管理、
策略控制）。

### 1.1 核心架构图

```
+-------------------------------------------------------------------+
|                       用户交互层                                    |
|  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ |
|  │ /command 输入  │  │ /plugin UI   │  │ settings.json 配置       │ |
|  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘ |
+---------┼─────────────────┼──────────────────────┼────────────────+
          │                 │                      │
          v                 v                      v
+-------------------------------------------------------------------+
|                      命令注册层                                     |
|  ┌──────────────────────────────────────────────────────────────┐  |
|  │  commands.ts - 统一命令注册表                                  │  |
|  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │  |
|  │  │ 内建命令    │ │ 技能命令   │ │ 插件命令    │ │ 动态命令   │ │  |
|  │  │ (70+个)     │ │ (bundled)  │ │ (plugin)   │ │ (MCP等)    │ │  |
|  │  └────────────┘ └────────────┘ └────────────┘ └───────────┘ │  |
|  └──────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
          │
          v
+-------------------------------------------------------------------+
|                      插件加载层                                     |
|  ┌──────────────────────────────────────────────────────────────┐  |
|  │  pluginLoader.ts (~3300行) - 插件发现、加载、验证              │  |
|  │  ┌────────────┐ ┌────────────┐ ┌────────────┐              │  |
|  │  │ 市场插件    │ │ 内建插件   │ │ 会话插件    │              │  |
|  │  │ (name@mkt) │ │ (builtin)  │ │ (--plugin)  │              │  |
|  │  └────────────┘ └────────────┘ └────────────┘              │  |
|  └──────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
          │
          v
+-------------------------------------------------------------------+
|                      市场管理层                                     |
|  ┌──────────────────────────────────────────────────────────────┐  |
|  │  marketplaceManager.ts (~2643行) - 市场注册与缓存              │  |
|  │  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐    │  |
|  │  │ 官方市场     │ │ GitHub仓库源  │ │ Git/NPM/本地源      │    │  |
|  │  │ (GCS加速)    │ │ (git clone)  │ │ (多种安装方式)       │    │  |
|  │  └─────────────┘ └──────────────┘ └────────────────────┘    │  |
|  └──────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
          │
          v
+-------------------------------------------------------------------+
|                      安全防护层                                     |
|  ┌─────────────┐ ┌──────────────┐ ┌────────────────────────────┐  |
|  │ schemas.ts  │ │ 同形字检测    │ │ 组织策略控制               │  |
|  │ (Zod验证)   │ │ (Unicode攻击) │ │ (managed-settings)        │  |
|  └─────────────┘ └──────────────┘ └────────────────────────────┘  |
+-------------------------------------------------------------------+
```

### 1.2 文件规模统计

| 文件 | 行数 | 职责 |
|------|------|------|
| commands.ts | ~400 | 命令注册表 |
| pluginLoader.ts | ~3300 | 插件加载与验证 |
| marketplaceManager.ts | ~2643 | 市场管理与缓存 |
| schemas.ts | ~1681 | 插件模式验证 |
| commands/ 目录 | 101 个子目录/文件 | 所有命令实现 |
| utils/plugins/ | 44 个文件 | 插件子系统工具 |

## 2. 命令系统

### 2.1 命令类型定义

**文件**: `src/types/command.ts`

上游工具的命令系统支持四种类型：

```typescript
// command.ts:25-57 (简化)
export type PromptCommand = {
  type: 'prompt'
  progressMessage: string
  contentLength: number
  argNames?: string[]
  allowedTools?: string[]
  model?: string
  source: SettingSource | 'builtin' | 'mcp' | 'plugin' | 'bundled'
  pluginInfo?: { pluginManifest: PluginManifest; repository: string }
  hooks?: HooksSettings           // 技能专属 Hooks
  skillRoot?: string              // 技能资源根目录
  context?: 'inline' | 'fork'    // 内联或子代理执行
  agent?: string                  // 子代理类型
  effort?: EffortValue
  paths?: string[]                // 文件路径匹配模式
  getPromptForCommand(args: string, context: ToolUseContext):
    Promise<ContentBlockParam[]>
}

type LocalCommand = {
  type: 'local'
  supportsNonInteractive: boolean
  load: () => Promise<LocalCommandModule>   // 懒加载
}

type LocalJSXCommand = {
  type: 'local-jsx'
  load: () => Promise<LocalJSXCommandModule>  // 懒加载 JSX UI
}
```

**四种命令类型的执行流**:

```
prompt   ──── 生成系统提示 ──── 发送到 API ──── 流式响应
local    ──── 懒加载模块 ──── 同步执行 ──── 返回文本结果
local-jsx ──── 懒加载模块 ──── 渲染 React 组件 ──── 回调完成
(第四种内部类型: 'prompt' 的 context='fork' 变体 = 子代理执行)
```

### 2.2 命令基础属性

```typescript
// command.ts (综合)
export type CommandBase = {
  name: string                    // 命令名（如 'help'、'config'）
  description: string             // 用户可见描述
  aliases?: string[]              // 别名
  isHidden?: boolean              // 是否在 /help 中隐藏
  isEnabled?: boolean             // 是否启用
  userFacingName?: () => string   // 动态显示名
  argHint?: string                // 参数提示（如 '<file>'）
}
```

### 2.3 命令注册表

**文件**: `src/commands.ts`

所有命令通过 `COMMANDS()` 函数延迟初始化（memoize），因为底层函数读取配置文件，
这在模块初始化阶段还不可用：

```typescript
// commands.ts:258-346 (简化)
const COMMANDS = memoize((): Command[] => [
  addDir, advisor, agents, branch, btw, chrome, clear,
  color, compact, config, copy, desktop, context, cost,
  diff, doctor, effort, exit, fast, files, help, ide,
  init, keybindings, mcp, memory, model, plugin,
  releaseNotes, rename, resume, session, skills, status,
  theme, feedback, review, rewind, securityReview,
  terminalSetup, usage, vim,
  // 条件性命令（特性标志控制）
  ...(proactive ? [proactive] : []),
  ...(bridge ? [bridge] : []),
  ...(voiceCommand ? [voiceCommand] : []),
  // 内部专用命令
  ...(process.env.USER_TYPE === 'ant' ? INTERNAL_ONLY_COMMANDS : []),
])
```

### 2.4 命令合并流

完整的命令列表通过多级合并构建：

```
1. COMMANDS()              // 70+ 内建命令
2. getBundledSkills()      // 打包的技能命令
3. getSkillDirCommands()   // 技能目录命令
4. getPluginCommands()     // 插件命令
5. getBuiltinPluginSkillCommands()  // 内建插件的技能命令
6. getDynamicSkills()      // 动态发现的技能
```

### 2.5 内建命令分类

通过分析 `commands/` 目录的 101 个入口，命令可以分为以下类别：

| 类别 | 命令示例 | 数量 |
|------|----------|------|
| 会话管理 | clear, compact, resume, session, rename | ~10 |
| 配置 | config, color, theme, vim, keybindings | ~8 |
| 开发工具 | diff, review, commit, branch, files | ~10 |
| 服务集成 | mcp, ide, desktop, chrome, mobile | ~8 |
| 插件系统 | plugin, reload-plugins, skills, agents | ~5 |
| 信息查看 | help, status, cost, usage, doctor | ~8 |
| 权限与安全 | permissions, sandbox-toggle, privacy-settings | ~5 |
| 高级功能 | plan, fast, effort, context, export | ~10 |
| 内部命令 | ant-trace, perf-issue, mock-limits, bughunter | ~15 |
| 特性标志 | proactive, bridge, voice, ultraplan, buddy | ~12 |

### 2.6 特性标志驱动的命令加载

```typescript
// commands.ts:60-122
const proactive = feature('PROACTIVE') || feature('KAIROS')
  ? require('./commands/proactive.js').default : null
const bridge = feature('BRIDGE_MODE')
  ? require('./commands/bridge/index.js').default : null
const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default : null
const workflowsCmd = feature('WORKFLOW_SCRIPTS')
  ? require('./commands/workflows/index.js').default : null
```

`feature()` 来自 `bun:bundle`，在构建时进行死代码消除（DCE）。
`require()` 而不是 `import()` 是为了同步加载——条件性命令必须在
命令列表构建时同步可用。

### 2.7 懒加载模式

大型命令实现使用 `load()` 函数进行懒加载：

```typescript
// commands.ts:190-201 (insights 命令)
const usageReport: Command = {
  type: 'prompt',
  name: 'insights',
  description: 'Generate a report analyzing your 该命令行工具sessions',
  // insights.ts 是 113KB (3200 行)，包含 diffLines/html 渲染
  // 懒加载垫片将重型模块的加载推迟到实际调用时
  async getPromptForCommand(args, context) {
    const real = (await import('./commands/insights.js')).default
    if (real.type !== 'prompt') throw new Error('unreachable')
    return real.getPromptForCommand(args, context)
  },
}
```

### 2.8 迁移到插件的命令

**文件**: `src/commands/createMovedToPluginCommand.ts`

当命令从内建迁移到插件时，使用一个包装器显示迁移提示：

```
/old-command  →  "此命令已移至插件 xxx。运行 /plugin install xxx@marketplace"
```

## 3. 插件系统架构

### 3.1 插件生命周期

```
                        插件生命周期
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────v────┐        ┌────v────┐         ┌────v────┐
   │  发现   │        │  安装   │         │  加载   │
   │ discover│        │ install │         │  load   │
   └────┬────┘        └────┬────┘         └────┬────┘
        │                  │                   │
   ┌────v────────────┐ ┌───v────────────┐ ┌───v───────────┐
   │ 市场manifest   │ │ git clone      │ │ 验证manifest  │
   │ 设置扫描       │ │ npm install    │ │ 加载hooks     │
   │ 种子目录探测   │ │ 本地复制       │ │ 加载commands  │
   │ 内建注册       │ │ 版本缓存       │ │ 加载agents    │
   └────┬────────────┘ │ zip压缩缓存   │ │ 加载MCP      │
        │              └───┬────────────┘ │ 解析依赖      │
        │                  │              └───┬───────────┘
        └──────────────────┼──────────────────┘
                           │
                    ┌──────v──────┐
                    │   运行时    │
                    │  runtime    │
                    ├─────────────┤
                    │ 命令执行    │
                    │ Hook触发    │
                    │ MCP通信     │
                    │ 自动更新    │
                    │ 策略控制    │
                    └─────────────┘
```

### 3.2 插件标识符

**文件**: `src/utils/plugins/pluginIdentifier.ts`

```typescript
// pluginIdentifier.ts:51-57
export function parsePluginIdentifier(plugin: string): ParsedPluginIdentifier {
  if (plugin.includes('@')) {
    const parts = plugin.split('@')
    return { name: parts[0] || '', marketplace: parts[1] }
  }
  return { name: plugin }
}
```

插件 ID 格式：`{name}@{marketplace}`，例如：
- `my-plugin@claude-plugins-official` - 官方市场插件
- `test-runner@builtin` - 内建插件
- `custom-tool@my-marketplace` - 第三方市场插件

### 3.3 插件目录结构

```
my-plugin/
├── plugin.json          # 清单文件（元数据 + 组件声明）
├── commands/            # 斜杠命令（Markdown 文件）
│   ├── build.md
│   └── deploy/
│       └── SKILL.md     # 技能式命令
├── agents/              # 自定义 AI 代理
│   └── test-runner.md
├── hooks/               # Hook 配置
│   └── hooks.json
├── skills/              # 技能（与 commands 类似但语义不同）
│   └── refactor/
│       └── SKILL.md
└── mcp-servers/         # MCP 服务器配置
```

### 3.4 插件清单（Plugin Manifest）

**文件**: `src/utils/plugins/schemas.ts`

```typescript
// schemas.ts:274-320 (简化)
const PluginManifestMetadataSchema = z.object({
  name: z.string().min(1)
    .refine(name => !name.includes(' '), { message: '使用 kebab-case' }),
  version: z.string().optional(),
  description: z.string().optional(),
  author: PluginAuthorSchema().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  dependencies: z.array(DependencyRefSchema()).optional(),
})
```

完整清单还可以声明：
- `hooks`: 内联或外部文件引用的 Hook 配置
- `commands`: 命令映射（路径或内联 Markdown）
- `skills`: 技能映射
- `agents`: 代理定义
- `mcpServers`: MCP 服务器配置
- `outputStyles`: 自定义输出样式

## 4. 插件加载器

### 4.1 加载流程

**文件**: `src/utils/plugins/pluginLoader.ts` (~3300 行)

```
loadAllPlugins()
    │
    ├── 1. 加载设置中的 enabledPlugins
    │
    ├── 2. 加载内建插件
    │      getBuiltinPlugins() → { enabled, disabled }
    │
    ├── 3. 加载市场插件
    │      ├── parsePluginIdentifier(id)
    │      ├── resolvePluginPath(id, version)
    │      │   ├── 版本化路径: ~/.claude/plugins/cache/{mkt}/{plugin}/{version}/
    │      │   ├── 种子目录探测: probeSeedCache()
    │      │   └── 遗留路径回退: ~/.claude/plugins/cache/{plugin}/
    │      ├── loadPluginManifest(path)
    │      │   └── PluginManifestSchema.parse(json)
    │      ├── loadPluginHooks(path)
    │      └── 验证 + 错误收集
    │
    ├── 4. 加载会话插件（--plugin-dir 或 SDK）
    │      getInlinePlugins()
    │
    ├── 5. 重复名称检测
    │
    └── 6. 返回 PluginLoadResult
           { enabled: LoadedPlugin[], disabled: LoadedPlugin[], errors: PluginError[] }
```

### 4.2 版本化缓存路径

```typescript
// pluginLoader.ts:139-162
export function getVersionedCachePathIn(
  baseDir: string, pluginId: string, version: string
): string {
  const { name, marketplace } = parsePluginIdentifier(pluginId)
  // 清理路径组件以防止路径遍历攻击
  const sanitizedMarketplace = (marketplace || 'unknown')
    .replace(/[^a-zA-Z0-9\-_]/g, '-')
  const sanitizedPlugin = (pluginName || pluginId)
    .replace(/[^a-zA-Z0-9\-_]/g, '-')
  const sanitizedVersion = version
    .replace(/[^a-zA-Z0-9\-_.]/g, '-')
  return join(baseDir, 'cache', sanitizedMarketplace,
    sanitizedPlugin, sanitizedVersion)
}
```

路径格式: `~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/`

### 4.3 种子目录（Seed Directories）

```typescript
// pluginLoader.ts:195-208
async function probeSeedCache(
  pluginId: string, version: string
): Promise<string | null> {
  for (const seedDir of getPluginSeedDirs()) {
    const seedPath = getVersionedCachePathIn(seedDir, pluginId, version)
    try {
      const entries = await readdir(seedPath)
      if (entries.length > 0) return seedPath
    } catch { /* 尝试下一个种子 */ }
  }
  return null
}
```

种子目录支持企业预置部署：BYOC（Bring Your Own Container）场景下，
插件可以预先安装在种子目录中，避免首次启动时的网络克隆。

当版本为 'unknown' 时，`probeSeedCacheAnyVersion` 会探测种子目录中的
任意单一版本（pluginLoader.ts:220-238）。

### 4.4 安装来源

**Git 克隆**（pluginLoader.ts:534-640）:

```typescript
export async function gitClone(
  gitUrl: string, targetPath: string,
  ref?: string, sha?: string
): Promise<void> {
  // 始终从浅克隆开始
  const args = ['clone', '--depth', '1',
    '--recurse-submodules', '--shallow-submodules']
  if (ref) args.push('--branch', ref)
  if (sha) args.push('--no-checkout')
  args.push(gitUrl, targetPath)
  // ... 克隆执行
  // SHA 指定时：先浅获取，失败则 unshallow
  if (sha) {
    const shallowFetch = await execFileNoThrow(
      gitExe(), ['fetch', '--depth', '1', 'origin', sha], ...)
    if (shallowFetch.code !== 0) {
      await execFileNoThrow(gitExe(), ['fetch', '--unshallow'], ...)
    }
    await execFileNoThrow(gitExe(), ['checkout', sha], ...)
  }
}
```

**GitHub 仓库**（pluginLoader.ts:662-678）：

```typescript
async function installFromGitHub(repo, targetPath, ref?, sha?) {
  // 验证 owner/repo 格式
  if (!/^[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+$/.test(repo))
    throw new Error('Invalid GitHub repository format')
  // CCR 用 HTTPS（无 SSH 密钥），正常 CLI 用 SSH
  const gitUrl = isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)
    ? `https://github.com/${repo}.git`
    : `git@github.com:${repo}.git`
  return installFromGit(gitUrl, targetPath, ref, sha)
}
```

**NPM 包**（pluginLoader.ts:490-524）：

```typescript
// npm install {package}@{version} --prefix {cachePath}
// 然后 copyDir 到目标路径
```

**ZIP 缓存**（pluginLoader.ts:372-398）：

当启用 ZIP 缓存模式时，已安装的插件被压缩为 `.zip` 文件存储，
减少文件系统 inode 使用和冷启动时的目录遍历时间。

### 4.5 依赖解析

**文件**: `src/utils/plugins/dependencyResolver.ts`

```
verifyAndDemote()
    │
    ├── 构建依赖图
    ├── 检测缺失依赖
    ├── 检测循环依赖
    └── 将不满足依赖的插件降级为禁用状态
```

裸名称（不含 `@marketplace`）解析到声明插件所在的同一市场。

## 5. 市场管理器

### 5.1 市场源类型

**文件**: `src/utils/plugins/marketplaceManager.ts`

```
~/.claude/plugins/
├── known_marketplaces.json         # 已知市场配置
└── marketplaces/                   # 市场缓存目录
    ├── my-marketplace.json         # URL 源的 JSON 缓存
    └── github-marketplace/         # GitHub 源的克隆仓库
        └── .claude-plugin/
            └── marketplace.json
```

### 5.2 市场声明与协调

```typescript
// marketplaceManager.ts:161-192
export function getDeclaredMarketplaces(): Record<string, DeclaredMarketplace> {
  const implicit: Record<string, DeclaredMarketplace> = {}

  // 当任何启用的插件引用官方市场时，隐式声明官方市场
  const enabledPlugins = {
    ...getAddDirEnabledPlugins(),
    ...(getInitialSettings().enabledPlugins ?? {}),
  }
  for (const [pluginId, value] of Object.entries(enabledPlugins)) {
    if (value && parsePluginIdentifier(pluginId).marketplace
        === OFFICIAL_MARKETPLACE_NAME) {
      implicit[OFFICIAL_MARKETPLACE_NAME] = {
        source: OFFICIAL_MARKETPLACE_SOURCE,
        sourceIsFallback: true,  // 不覆盖已存在的显式声明
      }
      break
    }
  }

  // 优先级: 隐式 < --add-dir < 合并设置
  return {
    ...implicit,
    ...getAddDirExtraMarketplaces(),
    ...(getInitialSettings().extraKnownMarketplaces ?? {}),
  }
}
```

### 5.3 官方市场 GCS 加速

**文件**: `src/utils/plugins/officialMarketplaceGcs.ts`

官方市场使用 Google Cloud Storage 加速获取，而不是每次 git clone：

```
officialMarketplaceGcs.ts
├── fetchOfficialMarketplaceFromGcs()
│   ├── 从 downloads.claude.ai 获取 marketplace.json
│   └── 内存中解析验证
└── 作为 git clone 的快速回退
```

### 5.4 市场缓存与刷新

```typescript
// marketplaceManager.ts (memoized)
export const getMarketplace = memoize(async (name: string) => {
  // 1. 内存缓存命中 → 直接返回
  // 2. 磁盘缓存读取 → 解析验证 → 返回
  // 3. 网络获取（URL/GitHub/Git） → 缓存到磁盘 → 返回
})
```

## 6. 插件命令加载

### 6.1 Markdown 命令文件

**文件**: `src/utils/plugins/loadPluginCommands.ts`

插件命令通过 Markdown 文件定义，支持 frontmatter 元数据：

```markdown
---
description: Build the project
allowedTools: [Bash, ReadFile]
model: claude-sonnet-4-20250514
context: fork
agent: Bash
effort: high
---

Build the current project using the configured build system.
Run tests after building to verify the build succeeded.
```

### 6.2 命令名称空间

```typescript
// loadPluginCommands.ts:60-96
function getCommandNameFromFile(filePath, baseDir, pluginName) {
  // 普通文件: {pluginName}:{相对路径}:{文件名}
  // 技能文件: {pluginName}:{相对路径}:{目录名}
  // 例如: my-plugin:build
  //       my-plugin:deploy:staging
}
```

所有插件命令以 `{pluginName}:` 为前缀，避免与内建命令冲突。

### 6.3 变量替换

```typescript
// loadPluginCommands.ts (通过 pluginOptionsStorage.ts)
substitutePluginVariables(content, pluginOptions)
substituteUserConfigInContent(content, userConfig)
```

插件 Markdown 内容支持 `{{variable}}` 模板变量，在执行时替换为用户配置的值。

### 6.4 参数替换

```typescript
// argumentSubstitution.ts
parseArgumentNames(content)       // 提取 $1, $2 等参数名
substituteArguments(content, args) // 替换实际参数值
```

## 7. 内建插件系统

### 7.1 注册机制

**文件**: `src/plugins/builtinPlugins.ts`

```typescript
// builtinPlugins.ts:21-32
const BUILTIN_PLUGINS: Map<string, BuiltinPluginDefinition> = new Map()
export const BUILTIN_MARKETPLACE_NAME = 'builtin'

export function registerBuiltinPlugin(definition: BuiltinPluginDefinition) {
  BUILTIN_PLUGINS.set(definition.name, definition)
}
```

内建插件与市场插件的区别：
- 随 CLI 一起发布，无需网络安装
- 在 `/plugin` UI 中显示在"内建"分组下
- 用户可以启用/禁用（持久化到用户设置）
- 使用 `{name}@builtin` 格式的 ID

### 7.2 可用性检查

```typescript
// builtinPlugins.ts:65-69
for (const [name, definition] of BUILTIN_PLUGINS) {
  // isAvailable() 返回 false 的插件完全不可见
  if (definition.isAvailable && !definition.isAvailable()) {
    continue
  }
  // ...
}
```

### 7.3 启用状态逻辑

```typescript
// builtinPlugins.ts:72-76
const userSetting = settings?.enabledPlugins?.[pluginId]
// 优先级: 用户设置 > 插件默认值 > true
const isEnabled =
  userSetting !== undefined
    ? userSetting === true
    : (definition.defaultEnabled ?? true)
```

## 8. 安全机制

### 8.1 同形字攻击防御

**文件**: `src/utils/plugins/schemas.ts`

```typescript
// schemas.ts:78-79
const NON_ASCII_PATTERN = /[^\u0020-\u007E]/

// schemas.ts:87-101
export function isBlockedOfficialName(name: string): boolean {
  // 如果在允许列表中则不阻止
  if (ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(name.toLowerCase()))
    return false
  // 阻止非 ASCII 字符以防止同形字攻击
  // (例如用西里尔字母 'а' 冒充拉丁字母 'a')
  if (NON_ASCII_PATTERN.test(name))
    return true
  // 检查模式匹配
  return BLOCKED_OFFICIAL_NAME_PATTERN.test(name)
}
```

### 8.2 官方名称仿冒检测

```typescript
// schemas.ts:71-72
export const BLOCKED_OFFICIAL_NAME_PATTERN =
  /(?:official[^a-z0-9]*(anthropic|claude)|
     (?:anthropic|claude)[^a-z0-9]*official|
     ^(?:anthropic|claude)[^a-z0-9]*(marketplace|plugins|official))/i
```

这个正则表达式阻止以下类型的仿冒尝试：
- `official-claude-plugins` (official + claude)
- `claude-official` (claude + official)
- `anthropic-marketplace` (anthropic + marketplace 开头)

### 8.3 官方源验证

```typescript
// schemas.ts:119-157
export function validateOfficialNameSource(name, source) {
  // 保留名称只能来自 anthropics GitHub 组织
  if (source.source === 'github') {
    const repo = source.repo || ''
    if (!repo.toLowerCase().startsWith(`${OFFICIAL_GITHUB_ORG}/`)) {
      return `The name '${name}' is reserved...`
    }
  }
  if (source.source === 'git' && source.url) {
    // 检查 HTTPS 或 SSH 格式的 github.com/anthropics/
    const isHttpsAnthropics = url.includes('github.com/anthropics/')
    const isSshAnthropics = url.includes('git@github.com:anthropics/')
    if (!isHttpsAnthropics && !isSshAnthropics)
      return `The name '${name}' is reserved...`
  }
}
```

### 8.4 保留的官方市场名称

```typescript
// schemas.ts:19-28
export const ALLOWED_OFFICIAL_MARKETPLACE_NAMES = new Set([
  'coding-agent-marketplace',
  'coding-agent-plugins',
  'claude-plugins-official',
  'anthropic-marketplace',
  'anthropic-plugins',
  'agent-skills',
  'life-sciences',
  'knowledge-work-plugins',
])
```

### 8.5 市场名称验证

```typescript
// schemas.ts:216-246
const MarketplaceNameSchema = z.string()
  .min(1)
  .refine(name => !name.includes(' '), ...)    // 不含空格
  .refine(name => !name.includes('/') &&       // 不含路径分隔符
    !name.includes('\\') &&
    !name.includes('..') &&                     // 不含路径遍历
    name !== '.', ...)
  .refine(name => !isBlockedOfficialName(name), ...)  // 不仿冒官方
  .refine(name => name.toLowerCase() !== 'inline', ...) // 保留名
  .refine(name => name.toLowerCase() !== 'builtin', ...) // 保留名
```

### 8.6 组织策略控制

**文件**: `src/utils/plugins/pluginPolicy.ts`

```typescript
// pluginPolicy.ts:17-20
export function isPluginBlockedByPolicy(pluginId: string): boolean {
  const policyEnabled =
    getSettingsForSource('policySettings')?.enabledPlugins
  return policyEnabled?.[pluginId] === false
}
```

策略通过 `managed-settings.json` 控制（由组织管理员设置），
在安装检查点、启用操作和 UI 过滤器中作为单一真相来源使用。

### 8.7 Git URL 验证

```typescript
// pluginLoader.ts (validateGitUrl)
function validateGitUrl(url: string): string {
  // 验证 URL 格式（https、http、file、git@ ssh）
  // 防止命令注入
  // 标准化 URL
}
```

### 8.8 插件下架检测

**文件**: `src/utils/plugins/pluginBlocklist.ts`

```typescript
// pluginBlocklist.ts:34-53
export function detectDelistedPlugins(
  installedPlugins, marketplace, marketplaceName
): string[] {
  const marketplacePluginNames = new Set(
    marketplace.plugins.map(p => p.name))
  const delisted: string[] = []
  for (const pluginId of Object.keys(installedPlugins.plugins)) {
    if (!pluginId.endsWith(suffix)) continue
    const pluginName = pluginId.slice(0, -suffix.length)
    if (!marketplacePluginNames.has(pluginName)) {
      delisted.push(pluginId)
    }
  }
  return delisted
}
```

当市场中的插件被移除时，`detectAndUninstallDelistedPlugins()` 会自动卸载
已安装的副本并记录为已标记（flagged），防止恶意插件持续运行。

## 9. 插件 UI 管理

### 9.1 /plugin 命令

**文件**: `src/commands/plugin/`（17 个文件）

```
/plugin
├── index.tsx              // 入口路由
├── plugin.tsx             // 主 UI 组件
├── ManagePlugins.tsx      // 插件管理面板
├── ManageMarketplaces.tsx // 市场管理面板
├── BrowseMarketplace.tsx  // 市场浏览
├── DiscoverPlugins.tsx    // 插件发现
├── AddMarketplace.tsx     // 添加市场
├── PluginSettings.tsx     // 插件设置
├── PluginOptionsDialog.tsx    // 选项对话框
├── PluginOptionsFlow.tsx      // 选项配置流
├── PluginTrustWarning.tsx     // 信任警告
├── ValidatePlugin.tsx         // 插件验证
├── PluginErrors.tsx           // 错误显示
├── UnifiedInstalledCell.tsx   // 统一安装状态单元
├── pluginDetailsHelpers.tsx   // 详情辅助函数
├── parseArgs.ts               // 参数解析
└── usePagination.ts           // 分页 Hook
```

### 9.2 信任模型

安装第三方插件时显示信任警告（`PluginTrustWarning.tsx`），告知用户：
- 插件可以执行任意代码（通过 Hooks）
- 插件可以启动 MCP 服务器
- 插件来自非 Anthropic 控制的源

## 10. 插件组件加载

### 10.1 命令加载

**文件**: `src/utils/plugins/loadPluginCommands.ts`

```
loadPluginCommands.ts
├── getPluginCommands()        // 获取所有插件命令（memoized）
├── getPluginSkills()          // 获取所有插件技能（memoized）
└── buildPluginCommand()       // 从 Markdown 构建 Command 对象
    ├── 解析 frontmatter
    ├── 提取 description
    ├── 解析 allowedTools
    ├── 解析 model 覆盖
    ├── 解析执行上下文 (inline/fork)
    ├── 构建 getPromptForCommand()
    │   ├── substitutePluginVariables()
    │   ├── substituteUserConfigInContent()
    │   ├── substituteArguments()
    │   └── executeShellCommandsInPrompt()
    └── 设置 source: 'plugin'
```

### 10.2 Hook 加载

**文件**: `src/utils/plugins/loadPluginHooks.ts`

插件 Hook 在两个位置定义：
1. `hooks/hooks.json` — 标准位置
2. `plugin.json` 中的 `hooks` 字段 — 内联或文件引用

Hook 配置合并后与全局 Hook 系统集成。

### 10.3 代理加载

**文件**: `src/utils/plugins/loadPluginAgents.ts`

插件可以提供自定义 AI 代理定义（Markdown 格式），
在 `/agents` 命令和代理工具中可见。

### 10.4 输出样式加载

**文件**: `src/utils/plugins/loadPluginOutputStyles.ts`, `src/outputStyles/loadOutputStylesDir.ts`

插件可以自定义 Claude 输出的格式化方式。

### 10.5 MCP 服务器集成

**文件**: `src/utils/plugins/mcpPluginIntegration.ts`

插件可以声明 MCP 服务器配置，在启动时自动连接。

### 10.6 LSP 集成

**文件**: `src/utils/plugins/lspPluginIntegration.ts`

插件可以提供 LSP（Language Server Protocol）配置，
增强代码智能功能。

## 11. 插件设置层级

### 11.1 设置优先级

```
组织策略 (policySettings)      最高优先级 - 不可覆盖
    │
用户设置 (userSettings)        用户全局配置
    │
项目设置 (projectSettings)     项目级配置
    │
本地设置 (localSettings)       本地机器配置
    │
CLI 标志 (flagSettings)        最低优先级 - 会话临时
```

```typescript
// pluginIdentifier.ts:26-32
export const SETTING_SOURCE_TO_SCOPE = {
  policySettings: 'managed',
  userSettings: 'user',
  projectSettings: 'project',
  localSettings: 'local',
  flagSettings: 'flag',
} as const
```

### 11.2 启用/禁用状态存储

```json
// settings.json
{
  "enabledPlugins": {
    "my-plugin@claude-plugins-official": true,
    "dangerous-plugin@untrusted": false
  }
}
```

### 11.3 插件选项存储

**文件**: `src/utils/plugins/pluginOptionsStorage.ts`

插件可以声明用户可配置的选项，存储在独立的配置文件中，
支持 `{{option_name}}` 模板变量在命令内容中替换。

## 12. 自动更新

### 12.1 更新机制

**文件**: `src/utils/plugins/pluginAutoupdate.ts`

```
pluginAutoupdate.ts
├── 检查市场是否启用 autoUpdate
├── 比较本地版本与市场版本
├── 下载新版本到版本化缓存路径
├── 清理旧版本缓存
└── 通知用户更新结果
```

### 12.2 官方市场自动更新

```typescript
// schemas.ts:48-58
export function isMarketplaceAutoUpdate(
  marketplaceName: string,
  entry: { autoUpdate?: boolean }
): boolean {
  return entry.autoUpdate ??
    (ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(normalizedName) &&
     !NO_AUTO_UPDATE_OFFICIAL_MARKETPLACES.has(normalizedName))
}
```

官方市场默认启用自动更新（除了 `knowledge-work-plugins`）。
第三方市场默认关闭，需要用户显式启用。

## 13. 启动时检查

**文件**: `src/utils/plugins/performStartupChecks.tsx`

```
performStartupChecks()
├── pluginStartupCheck.ts      // 插件完整性检查
├── officialMarketplaceStartupCheck.ts  // 官方市场连通性
├── pluginBlocklist.ts         // 下架检测与自动卸载
├── pluginAutoupdate.ts        // 自动更新检查
└── orphanedPluginFilter.ts    // 孤立插件清理
```

## 14. 亮点发现

### 14.1 三层仿冒防御

插件系统对官方市场名称实施了三层防御：
1. **直接仿冒检测**：正则表达式匹配 `anthropic`/`claude` + `official`/`marketplace`/`plugins` 的组合
2. **同形字攻击防御**：阻止任何非 ASCII 字符（`/[^\u0020-\u007E]/`），防止 Unicode 外观相似字符（如西里尔字母 `а` vs 拉丁字母 `a`）
3. **源组织验证**：保留名称必须来自 `github.com/anthropics/` 仓库

这种纵深防御确保即使单层被绕过，其他层仍然有效。

### 14.2 sourceIsFallback 的精妙设计

官方市场的隐式声明使用 `sourceIsFallback: true`（marketplaceManager.ts:178）。
这意味着如果用户或种子目录已经从内部镜像源注册了官方市场，
隐式声明不会用 GitHub 源覆盖它。
这避免了企业环境中的网络问题——内部镜像是首选源。

### 14.3 版本化缓存的鸡蛋问题

首次启动时，插件版本只有在克隆后才能知道（从仓库的 HEAD 计算 SHA），
但缓存路径需要版本号来构建。`probeSeedCacheAnyVersion()`（pluginLoader.ts:220-238）
解决了这个鸡蛋问题：它在种子目录中查找只有一个版本的插件目录，
直接使用那个版本，跳过版本计算步骤。

### 14.4 命令类型系统的懒加载优化

`local` 和 `local-jsx` 命令类型使用 `load()` 函数返回 Promise<Module>。
这意味着像 `/insights`（113KB，3200 行，包含 diffLines 和 HTML 渲染）
这样的重型命令，其实现代码只在用户实际输入 `/insights` 时才加载到内存。
对比直接 `import` 方式，这可以节省数百毫秒的启动时间。

### 14.5 路径遍历的多层防护

版本化缓存路径（pluginLoader.ts:149-154）对三个组件分别进行清理：
- `marketplace` → `[^a-zA-Z0-9\-_]` → `-`
- `plugin` → 同上
- `version` → `[^a-zA-Z0-9\-_.]` → `-`（额外允许 `.`）

市场名称验证（schemas.ts:226-234）禁止 `/`、`\\`、`..` 和 `.`，
防止通过市场名称进行路径遍历。这是独立于路径清理的第二层防护。

### 14.6 下架检测的安全设计

`detectAndUninstallDelistedPlugins()` 只在市场设置了 `forceRemoveDeletedPlugins`
标志时才执行自动卸载（pluginBlocklist.ts:79）。
这是一种保守设计——只有明确声明支持强制移除的市场才会触发此行为，
防止市场暂时不可用时误删合法插件。

### 14.7 Git URL 的环境自适应

```typescript
// pluginLoader.ts:674-677
const gitUrl = isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)
  ? `https://github.com/${repo}.git`   // CCR: 无 SSH 密钥
  : `git@github.com:${repo}.git`       // 本地: SSH 更快
```

上游远程会话（CCR）环境没有 SSH 密钥，自动切换到 HTTPS。
本地环境使用 SSH 因为通常有 ssh-agent 且避免密码提示。

### 14.8 MarketplaceNameSchema 的统一

市场名称验证使用共享的 `MarketplaceNameSchema`（schemas.ts:216-246），
同时被 `PluginMarketplaceSchema`（验证获取的 marketplace.json）和
设置中的 `MarketplaceSourceSchema`（验证用户输入）使用。

注释中解释了为什么必须保持同步：`loadAndCacheMarketplace` 的 `case 'settings'` 路径
在 PluginMarketplaceSchema 验证运行**之前**就写入了 `join(cacheDir, source.name)`。
如果设置允许的名称在后验证中失败，就会在缓存中留下孤立文件。
共享 Schema 使这种不一致不可能发生。

### 14.9 插件作用域层级映射

设置源到插件作用域的映射（pluginIdentifier.ts:26-32）实现了精确的权限控制：
- `policySettings` → `managed`：不可被任何其他源覆盖
- `flagSettings` → `flag`：会话级别，不持久化

这使得企业管理员可以通过 `managed-settings.json` 强制禁用不安全的插件，
而用户的 `settings.json` 无法覆盖这个决定。
同时，`--plugin-dir` 标志只在当前会话有效，不影响持久配置。
