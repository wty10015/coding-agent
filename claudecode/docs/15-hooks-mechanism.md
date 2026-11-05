# 15 - Hooks 机制详解

## 1. 概述

上游工具的 Hooks 系统是一套可扩展的生命周期钩子框架，允许用户在 CLI
运行的各个关键点插入自定义逻辑。它支持 **26 种事件类型**、**五种实现方式**
（command、prompt、agent、http、callback/function），拥有完整的安全防护
体系（SSRF 防护、CRLF 注入防护、工作区信任检查、环境变量白名单），
核心实现超过 5000 行代码。

### 核心设计目标

1. **生命周期全覆盖**: 从会话启动到结束，从工具调用前到调用后，全面可干预
2. **安全第一**: 所有 hook 执行都要求工作区信任，HTTP hook 有 SSRF/CRLF 防护
3. **灵活性**: 支持 shell 命令、LLM 评估、多轮 agent、HTTP 调用、内部回调
4. **性能优化**: 内部回调快速路径、延迟 JSON 序列化、并行执行

```
主要代码位置:
  utils/hooks.ts               - 核心引擎 (~5022 行)
  hooks/                       - Hook UI 组件目录 (~104 文件)
  hooks/toolPermission/        - 工具权限处理器
  utils/hooks/                 - 子模块 (事件、注册、执行)
  types/hooks.ts               - 类型定义
  schemas/hooks.ts             - Zod 模式定义
  costHook.ts                  - 成本追踪 Hook
```

---

## 2. 26 种 Hook 事件类型

定义在 `entrypoints/sdk/coreTypes.ts:25-53`:

```typescript
export const HOOK_EVENTS = [
  'PreToolUse',          // 工具调用前 (权限检查)
  'PostToolUse',         // 工具调用后 (结果审计)
  'PostToolUseFailure',  // 工具调用失败后
  'Notification',        // 通知事件
  'UserPromptSubmit',    // 用户提交提示
  'SessionStart',        // 会话启动
  'SessionEnd',          // 会话结束
  'Stop',                // 模型停止
  'StopFailure',         // 停止失败 (API 错误等)
  'SubagentStart',       // 子 agent 启动
  'SubagentStop',        // 子 agent 停止
  'PreCompact',          // 对话压缩前
  'PostCompact',         // 对话压缩后
  'PermissionRequest',   // 权限请求 (交互式)
  'PermissionDenied',    // 权限被拒绝
  'Setup',               // 初始设置 (一次性)
  'TeammateIdle',        // 团队成员空闲
  'TaskCreated',         // 任务创建
  'TaskCompleted',       // 任务完成
  'Elicitation',         // MCP 引出请求
  'ElicitationResult',   // MCP 引出结果
  'ConfigChange',        // 配置变更
  'WorktreeCreate',      // Worktree 创建
  'WorktreeRemove',      // Worktree 删除
  'InstructionsLoaded',  // 指令文件加载
  'CwdChanged',          // 工作目录变更
  'FileChanged',         // 文件变更
] as const
```

### 事件分类图

```
+--------------------------------------------------------------------+
|                    Hook 事件分类                                     |
+--------------------------------------------------------------------+
|                                                                      |
|  会话生命周期:                                                        |
|    Setup ─→ SessionStart ─→ ... ─→ Stop ─→ SessionEnd               |
|                                     └─→ StopFailure                  |
|                                                                      |
|  工具调用链:                                                          |
|    PreToolUse ─→ [执行] ─→ PostToolUse                               |
|         │                    └─→ PostToolUseFailure                   |
|         │                                                            |
|         └─→ PermissionRequest (交互式权限)                            |
|              └─→ PermissionDenied                                    |
|                                                                      |
|  用户交互:                                                            |
|    UserPromptSubmit                                                  |
|    Elicitation ─→ ElicitationResult                                  |
|    Notification                                                      |
|                                                                      |
|  子系统:                                                              |
|    SubagentStart ─→ SubagentStop                                     |
|    TaskCreated ─→ TaskCompleted                                      |
|    TeammateIdle                                                      |
|                                                                      |
|  环境变化:                                                            |
|    ConfigChange, CwdChanged, FileChanged                             |
|    InstructionsLoaded                                                |
|    PreCompact ─→ PostCompact                                         |
|    WorktreeCreate / WorktreeRemove                                   |
+--------------------------------------------------------------------+
```

---

## 3. 五种 Hook 实现类型

### 3.1 Command Hook (Shell 命令)

最基础、最常用的 hook 类型。在 bash（或 PowerShell）中执行自定义命令。

**Schema** (schemas/hooks.ts:32-65):

```typescript
{
  type: 'command',
  command: string,           // Shell 命令
  if?: string,               // 权限规则过滤 (如 "Bash(git *)")
  shell?: 'bash' | 'powershell',
  timeout?: number,          // 超时 (秒)
  statusMessage?: string,    // 自定义进度消息
  once?: boolean,            // 执行一次后移除
  async?: boolean,           // 后台执行
  asyncRewake?: boolean,     // 后台执行，exit code 2 时唤醒模型
}
```

**执行流程** (utils/hooks.ts:747-1335):

```
execCommandHook()
  |
  1. 确定 shell 类型: hook.shell → DEFAULT_HOOK_SHELL → 'bash'
  |
  2. Windows 路径处理:
  |   bash: 所有路径转为 POSIX (/c/Users/foo)
  |   powershell: 使用原生 Windows 路径
  |
  3. Shell 前缀命令: CLAUDE_CODE_SHELL_PREFIX
  |
  4. 设置环境变量:
  |   CLAUDE_HOOK_EVENT_NAME, CLAUDE_HOOK_SESSION_ID,
  |   CLAUDE_HOOK_TRANSCRIPT_PATH, CLAUDE_HOOK_CWD,
  |   CLAUDE_HOOK_ENV_FILE (hook-env-vars 文件路径)
  |
  5. 创建子进程:
  |   bash: spawn(shellPath, ['-c', fullCommand])
  |   powershell: spawn(pwshPath, buildPowerShellArgs(command))
  |
  6. 通过 stdin 发送 JSON 输入
  |
  7. 监听 stdout 中的提示请求 (prompt protocol)
  |
  8. 检测异步响应 ({"async": true})
  |   → true: 在后台运行，注册到 AsyncHookRegistry
  |   → false: 等待完成
  |
  9. 解析输出: parseHookOutput()
```

### 3.2 Prompt Hook (LLM 评估)

使用 LLM 模型评估条件，适合需要语义理解的判断。

**Schema** (schemas/hooks.ts:67-95):

```typescript
{
  type: 'prompt',
  prompt: string,            // 提示文本, $ARGUMENTS 占位符
  if?: string,
  timeout?: number,          // 默认 30s
  model?: string,            // 如 "claude-sonnet-4-6"
  statusMessage?: string,
  once?: boolean,
}
```

**执行流程** (utils/hooks/execPromptHook.ts:21-100):

```
execPromptHook()
  |
  1. 将 $ARGUMENTS 替换为 hook input JSON
  |
  2. 创建 UserMessage (不通过 processUserInput, 避免递归)
  |
  3. 可选: 附加对话历史
  |
  4. queryModelWithoutStreaming({
  |     model: hook.model ?? getSmallFastModel(),  // 默认 Haiku
  |     systemPrompt: "...返回 {ok: true/false, reason?: string}...",
  |     outputFormat: { type: 'json_schema', ... },
  |   })
  |
  5. 解析响应: { ok: boolean, reason?: string }
  |   → ok=true: 通过
  |   → ok=false: 阻塞, 返回 reason
```

### 3.3 Agent Hook (多轮 Agent 验证)

使用多轮 LLM 对话和工具进行复杂验证。

**Schema** (schemas/hooks.ts:128-163):

```typescript
{
  type: 'agent',
  prompt: string,            // 验证指令, $ARGUMENTS 占位符
  if?: string,
  timeout?: number,          // 默认 60s
  model?: string,
  statusMessage?: string,
  once?: boolean,
}
```

**执行流程** (utils/hooks/execAgentHook.ts:36-50):

```
execAgentHook()
  |
  1. $ARGUMENTS 替换
  |
  2. 过滤工具集: 排除 ALL_AGENT_DISALLOWED_TOOLS
  |
  3. 添加 SyntheticOutputTool (用于结构化输出)
  |
  4. 启动 query() 多轮循环:
  |   - 可以调用工具 (如读文件、运行测试)
  |   - 最终返回 { ok: boolean, reason?: string }
  |
  5. 读取 SyntheticOutputTool 输出作为结果
```

### 3.4 HTTP Hook (远程服务调用)

通过 HTTP POST 将 hook 输入发送到远程 URL。

**Schema** (schemas/hooks.ts:97-126):

```typescript
{
  type: 'http',
  url: string,               // POST 目标 URL
  if?: string,
  timeout?: number,
  headers?: Record<string, string>,  // 支持 $VAR_NAME 插值
  allowedEnvVars?: string[],         // 允许插值的环境变量白名单
  statusMessage?: string,
  once?: boolean,
}
```

**执行流程** (utils/hooks/execHttpHook.ts:123-242):

```
execHttpHook()
  |
  1. URL 白名单检查 (allowedHttpHookUrls)
  |   → 未匹配: 立即返回错误
  |
  2. 构建请求头:
  |   - 环境变量插值: $VAR_NAME → process.env[VAR_NAME]
  |   - 仅允许 allowedEnvVars 中的变量
  |   - CRLF 消毒: sanitizeHeaderValue()
  |
  3. 代理路由选择:
  |   - 沙箱代理 > 环境代理 > 直连
  |   - 有代理时跳过 SSRF guard
  |
  4. axios.post(url, jsonInput, {
  |     lookup: ssrfGuardedLookup,  // DNS 级 SSRF 防护
  |     maxRedirects: 0,            // 禁止重定向
  |     proxy: sandboxProxy ?? false,
  |   })
  |
  5. 解析响应体为 HookJSONOutput
```

### 3.5 Callback / Function Hook (内部回调)

程序化注册的 hook，不通过配置文件。

**Callback Hook** (types/hooks.ts):

```typescript
type HookCallback = {
  type: 'callback'
  internal?: boolean        // 内部 hook, 跳过慢路径
  timeout?: number
  callback: (input, toolUseID, signal, index, context) => Promise<{}>
}
```

**Function Hook** (utils/hooks/sessionHooks.ts:24-31):

```typescript
type FunctionHook = {
  type: 'function'
  id?: string               // 用于移除
  timeout?: number
  callback: (messages: Message[], signal?) => boolean | Promise<boolean>
  errorMessage: string
  statusMessage?: string
}
```

**Function Hook 用于 Stop 事件的模式验证**:

```
executeFunctionHook()
  |
  1. callback(messages, abortSignal)
  |   → true: 验证通过
  |   → false: 阻塞, 返回 errorMessage
  |
  2. 例: schema-mode agent 的输出验证
  |   "The agent must produce valid JSON matching the schema"
```

---

## 4. Hook 执行引擎

### 4.1 总体执行流程

**核心入口**: `utils/hooks.ts:1952-2067` — `executeHooks()`

```
executeHooks({ hookInput, toolUseID, matchQuery, signal, ... })
  |
  1. 全局禁用检查:
  |   shouldDisableAllHooksIncludingManaged()
  |   CLAUDE_CODE_SIMPLE 环境变量
  |
  2. 安全检查:
  |   shouldSkipHookDueToTrust()  (所有 hook 要求工作区信任)
  |
  3. 匹配 hook:
  |   getMatchingHooks(appState, sessionId, hookEvent, hookInput, tools)
  |     → 合并: settings file hooks + plugin hooks + session hooks
  |     → 去重: hookDedupKey (namespace + command)
  |     → 过滤: matcher pattern + if condition
  |
  4. 快速路径 (内部 callback):
  |   if 所有 hook 都是 internal callback:
  |     → 直接串行执行, 跳过 span/progress/abort/JSON 处理
  |     → 性能: 6.01us → ~1.8us (-70%)
  |
  5. 发射进度消息 (hook_progress)
  |
  6. 延迟 JSON 序列化 (getJsonInput)
  |
  7. 并行执行所有 hook:
  |   hookPromises = matchingHooks.map(async function* ...)
  |   for await (const result of all(hookPromises)) { ... }
  |
  8. 聚合结果:
  |   - blockingError → 阻塞当前操作
  |   - preventContinuation → 终止会话
  |   - permissionBehavior → allow/deny/ask
  |   - additionalContext → 注入到对话
  |   - updatedInput → 修改工具输入
  |   - systemMessage → 系统提醒
```

### 4.2 匹配逻辑

**matchesPattern()** (utils/hooks.ts:1346-1381):

```
支持三种匹配模式:
  1. 精确匹配: "Write"
  2. 管道分隔多值: "Write|Edit"
  3. 正则表达式: "^Write.*", ".*", "^(Write|Edit)$"

判断逻辑:
  if /^[a-zA-Z0-9_|]+$/ (无特殊字符):
    → 管道分隔精确匹配
  else:
    → 正则匹配 (同时检查 legacy 工具名)
```

**if 条件匹配** (utils/hooks.ts:1390-1421):

`if` 字段使用权限规则语法进行细粒度过滤:

```
示例: if: "Bash(git *)"
  → 只对 Bash 工具中运行 git 命令的调用触发

解析流程:
  1. prepareIfConditionMatcher(hookInput, tools)
  2. permissionRuleValueFromString(ifCondition)
     → { toolName, ruleContent }
  3. tool.preparePermissionMatcher(validatedInput)
     → (ruleContent) => boolean (tree-sitter AST 匹配等)
```

### 4.3 退出码语义

```
Shell Hook 退出码:
==================

  0   ─→ 成功 (success)
         输出作为附件消息

  2   ─→ 阻塞错误 (blocking)
         stderr 内容作为反馈发送给模型
         例: "这个命令不安全"

  其他 ─→ 非阻塞错误 (non_blocking_error)
         显示给用户但不中断流程
```

### 4.4 JSON 输出协议

Hook 的 stdout 如果以 `{` 开头，会被解析为 JSON:

**同步响应** (types/hooks.ts:50-166):

```typescript
type SyncHookJSONOutput = {
  continue?: boolean         // false = 终止会话
  suppressOutput?: boolean   // 隐藏 stdout
  stopReason?: string        // continue=false 时的停止原因
  decision?: 'approve' | 'block'
  reason?: string            // decision 的解释
  systemMessage?: string     // 警告消息
  hookSpecificOutput?: {
    // PreToolUse 特有
    hookEventName: 'PreToolUse'
    permissionDecision?: 'allow' | 'deny' | 'ask'
    permissionDecisionReason?: string
    updatedInput?: Record<string, unknown>  // 修改工具输入!
    additionalContext?: string

    // PostToolUse 特有
    hookEventName: 'PostToolUse'
    additionalContext?: string
    updatedMCPToolOutput?: unknown           // 修改 MCP 输出!

    // UserPromptSubmit 特有
    hookEventName: 'UserPromptSubmit'
    additionalContext?: string

    // SessionStart 特有
    hookEventName: 'SessionStart'
    additionalContext?: string
    initialUserMessage?: string              // 注入初始消息
    watchPaths?: string[]                    // 文件监控路径

    // PermissionRequest 特有
    hookEventName: 'PermissionRequest'
    decision?: { behavior: 'allow' | 'deny', updatedInput?, message? }

    // PermissionDenied 特有
    hookEventName: 'PermissionDenied'
    retry?: boolean                          // 是否重试

    // Elicitation 特有
    hookEventName: 'Elicitation'
    action?: 'accept' | 'decline' | 'cancel'
    content?: Record<string, unknown>

    // ... 更多事件类型
  }
}
```

**异步响应**:

```typescript
type AsyncHookJSONOutput = {
  async: true              // 异步标记
  asyncTimeout?: number    // 超时 (默认 15000ms)
}
```

当 hook 输出 `{"async": true}` 时:
1. 进程被移入后台 (AsyncHookRegistry)
2. executeHooks 立即继续
3. 进程完成后通过 hookEvents 发射结果

### 4.5 提示交互协议

Hook 进程可以通过 stdout 发起提示交互:

```
Hook 进程 (stdout)                    CLI
    |                                  |
    | {"prompt":"req1","message":"...",|
    |  "options":[{"key":"a",         |
    |   "label":"Yes"},{"key":"b",    |
    |   "label":"No"}]}               |
    |--------------------------------->|
    |                                  | 显示选项给用户
    |                                  | 用户选择 "a"
    | {"prompt_response":"req1",      |
    |  "selected":"a"}                |
    |<---------------------------------|
    |                                  |
    | (继续执行)                       |
```

实现在 `utils/hooks.ts` 的 `execCommandHook` 函数中，通过解析每行 stdout
检测 `promptRequestSchema` 匹配来触发。

---

## 5. Hook 配置体系

### 5.1 配置来源层级

```
配置来源 (按优先级):
======================

  1. 托管策略设置 (policySettings)
     → 管理员通过 API 下发
     → allowManagedHooksOnly: 禁止非托管 hook

  2. 用户设置 (~/.claude/settings.json)
     → 用户级别配置

  3. 项目设置 (.claude/settings.json)
     → 项目级别配置

  4. 本地设置 (.claude/settings.local.json)
     → 本地覆盖，不提交到 git

  5. 插件 Hook (plugins)
     → 已安装插件提供的 hook
     → 环境变量: CLAUDE_PLUGIN_ROOT 等

  6. 技能 Hook (skills)
     → 已安装技能提供的 hook

  7. 会话 Hook (sessionHooks)
     → 运行时通过 API 注册
     → 如 frontmatter 声明、schema-mode 验证
```

### 5.2 settings.json 中的 hook 配置

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 verify_command.py",
            "if": "Bash(git *)",
            "timeout": 30
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "http",
            "url": "https://my-server.com/audit",
            "headers": {
              "Authorization": "Bearer $MY_TOKEN"
            },
            "allowedEnvVars": ["MY_TOKEN"]
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"Always check tests\"}}'",
          }
        ]
      }
    ]
  }
}
```

### 5.3 Hook 去重策略

**hookDedupKey()** (utils/hooks.ts:1453-1455):

```typescript
function hookDedupKey(m: MatchedHook, payload: string): string {
  return `${m.pluginRoot ?? m.skillRoot ?? ''}\0${payload}`
}
```

同一命令在 user/project/local settings 中定义时折叠为一个。
不同插件中未展开的 `${CLAUDE_PLUGIN_ROOT}/hook.sh` 不会折叠
（因为展开后指向不同文件）。

---

## 6. 安全机制详解

### 6.1 工作区信任检查

**shouldSkipHookDueToTrust()** (utils/hooks.ts:286-296):

```typescript
export function shouldSkipHookDueToTrust(): boolean {
  const isInteractive = !getIsNonInteractiveSession()
  if (!isInteractive) return false  // SDK 模式隐含信任

  const hasTrust = checkHasTrustDialogAccepted()
  return !hasTrust
}
```

**历史漏洞** (注释 line 276-284):
- SessionEnd hook 在用户拒绝信任对话框时仍然执行
- SubagentStop hook 在子 agent 完成时可能在信任确认前执行
- 现在所有 hook 统一在 executeHooks 入口检查信任

### 6.2 SSRF 防护 (utils/hooks/ssrfGuard.ts)

**被阻止的地址范围**:

```
IPv4:
  0.0.0.0/8         "this" 网络
  10.0.0.0/8         私有地址
  100.64.0.0/10      共享地址空间 / CGNAT (阿里云元数据 100.100.100.200)
  169.254.0.0/16     链路本地 (云元数据 169.254.169.254)
  172.16.0.0/12      私有地址
  192.168.0.0/16     私有地址

IPv6:
  ::                 未指定
  fc00::/7           唯一本地
  fe80::/10          链路本地
  ::ffff:<v4>        映射的 IPv4 (检查内嵌 v4)

明确允许:
  127.0.0.0/8        环回 (本地开发)
  ::1                环回
```

**ssrfGuardedLookup()** (utils/hooks/ssrfGuard.ts:216-283):

```
ssrfGuardedLookup(hostname, options, callback)
  |
  +--> isIP(hostname)?
  |       +--> isBlockedAddress(hostname)?
  |       |       → callback(ssrfError)
  |       └─→ callback(null, hostname, family)
  |
  └──→ dnsLookup(hostname, {all: true}, (err, addresses) => {
          for (addr of addresses):
            if isBlockedAddress(addr.address):
              → callback(ssrfError)
          → callback(null, first_address, family)
        })
```

**IPv4-mapped IPv6 绕过防护** (utils/hooks/ssrfGuard.ts:97-204):

特别防护 `::ffff:a9fe:a9fe`（= 169.254.169.254）等绕过:

```typescript
function extractMappedIPv4(addr: string): string | null {
  const g = expandIPv6Groups(addr)
  if (!g) return null
  // IPv4-mapped: 前 80 位为零, 接 16 位 ffff, 最后 32 位 = IPv4
  if (g[0]===0 && g[1]===0 && g[2]===0 &&
      g[3]===0 && g[4]===0 && g[5]===0xffff) {
    const hi = g[6]!
    const lo = g[7]!
    return `${hi>>8}.${hi&0xff}.${lo>>8}.${lo&0xff}`
  }
  return null
}
```

### 6.3 CRLF 注入防护 (utils/hooks/execHttpHook.ts:76-79)

```typescript
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n\x00]/g, '')
}
```

**威胁模型**: 恶意环境变量如 `token\r\nX-Evil: 1` 会注入额外的 HTTP
请求头。sanitizeHeaderValue 在所有头部值上运行。

### 6.4 环境变量白名单 (utils/hooks/execHttpHook.ts:89-108)

```typescript
function interpolateEnvVars(value: string, allowedEnvVars: ReadonlySet<string>) {
  return value.replace(
    /\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g,
    (_, braced, unbraced) => {
      const varName = braced ?? unbraced
      if (!allowedEnvVars.has(varName)) {
        return ''  // 不在白名单 → 替换为空
      }
      return process.env[varName] ?? ''
    },
  )
}
```

**双重白名单交集** (utils/hooks/execHttpHook.ts:163-168):

```
最终允许的变量 = hook.allowedEnvVars ∩ policy.allowedEnvVars
```

项目配置的 `allowedEnvVars` 必须是管理员策略 `httpHookAllowedEnvVars` 的子集。

### 6.5 URL 白名单 (utils/hooks/execHttpHook.ts:49-68)

```
policy.allowedUrls:
  undefined → 无限制
  []        → 阻止所有
  ["https://api.example.com/*"] → 必须匹配模式

模式匹配: * 作为通配符 (任意字符)
```

### 6.6 沙箱代理路由 (utils/hooks/execHttpHook.ts:21-41)

当启用沙箱时，HTTP hook 请求通过沙箱网络代理路由:

```
execHttpHook
  → getSandboxProxyConfig()
    → SandboxManager.isSandboxingEnabled()?
      → SandboxManager.waitForNetworkInitialization()
      → SandboxManager.getProxyPort()
    → { host: '127.0.0.1', port: proxyPort, protocol: 'http' }

  → axios.post(url, data, {
      proxy: sandboxProxy,          // 通过沙箱代理
      lookup: undefined,            // 跳过 SSRF guard (代理负责 DNS)
    })
```

---

## 7. Hook 事件系统

### 7.1 hookEvents (utils/hooks/hookEvents.ts)

独立于主消息流的事件广播系统:

```
事件类型:
  HookStartedEvent   → { type: 'started', hookId, hookName, hookEvent }
  HookProgressEvent   → { type: 'progress', ..., stdout, stderr, output }
  HookResponseEvent   → { type: 'response', ..., exitCode, outcome }

发射策略:
  始终发射的事件: SessionStart, Setup
  可选发射: 其他所有事件 (需 setAllHookEventsEnabled(true))
    → SDK includeHookEvents 选项
    → CLAUDE_CODE_REMOTE 模式

待处理队列: 最大 100 个事件 (MAX_PENDING_EVENTS)
  → handler 注册前的事件被缓存
  → 注册后立即 flush
```

### 7.2 进度报告

**startHookProgressInterval()** (utils/hooks/hookEvents.ts:124-151):

```
每 1 秒 (可配置):
  → getOutput() 获取当前 stdout/stderr
  → 与上次比较，有变化则发射 progress 事件
  → interval.unref() → 不阻止进程退出
```

### 7.3 AsyncHookRegistry (utils/hooks/AsyncHookRegistry.ts)

管理后台运行的异步 hook:

```
注册:
  registerPendingAsyncHook({
    processId, hookId, asyncResponse,
    hookName, hookEvent, command, shellCommand
  })
  → timeout 默认 15000ms
  → 启动 progressInterval
  → 存入 pendingHooks Map

完成:
  → 读取 stdout/stderr
  → 发射 hookResponse 事件
  → 清理: shellCommand.cleanup()
```

---

## 8. 工具权限处理器

### 8.1 目录结构

```
hooks/toolPermission/
  ├── PermissionContext.ts          - 权限上下文
  ├── permissionLogging.ts         - 权限决策日志
  └── handlers/
      ├── interactiveHandler.ts    - 交互式权限处理
      ├── coordinatorHandler.ts    - 协调器权限处理
      └── swarmWorkerHandler.ts    - Swarm 工作节点处理
```

### 8.2 PermissionContext (hooks/toolPermission/PermissionContext.ts)

权限决策的核心协调器，处理多种批准来源:

```
权限批准来源 (PermissionApprovalSource):
  { type: 'hook', permanent?: boolean }    → Hook 自动批准
  { type: 'user', permanent: boolean }     → 用户手动批准
  { type: 'classifier' }                   → 分类器自动批准

权限拒绝来源 (PermissionRejectionSource):
  { type: 'hook' }                         → Hook 阻止
  { type: 'user_abort' }                   → 用户中止 (Ctrl+C)
  { type: 'user_reject', hasFeedback }     → 用户拒绝
```

**ResolveOnce 模式** (hooks/toolPermission/PermissionContext.ts:63-73):

```typescript
function createResolveOnce<T>(resolve: (value: T) => void): ResolveOnce<T> {
  let claimed = false
  let delivered = false
  return {
    resolve(value: T) { if (delivered) return; delivered = true; resolve(value) },
    isResolved() { return delivered },
    claim() {
      if (claimed) return false
      claimed = true
      return true    // 赢得竞争: 没有其他人已 resolve
    },
  }
}
```

**用途**: 异步回调（hook + classifier + user）竞争 resolve 同一个权限
promise。`claim()` 在 await 之前原子性地检查并标记，关闭竞争窗口。

---

## 9. costHook — 成本追踪

**文件**: `costHook.ts`

一个简单但关键的 React Hook，负责在进程退出时输出成本摘要并保存数据:

```typescript
export function useCostSummary(
  getFpsMetrics?: () => FpsMetrics | undefined,
): void {
  useEffect(() => {
    const f = () => {
      if (hasConsoleBillingAccess()) {
        process.stdout.write('\n' + formatTotalCost() + '\n')
      }
      saveCurrentSessionCosts(getFpsMetrics?.())
    }
    process.on('exit', f)
    return () => { process.off('exit', f) }
  }, [])
}
```

**注意**: 这不是 hook 系统的一部分，而是一个 React Hook (useEffect)。
名字中的 "Hook" 指 React 的 hook 概念。

---

## 10. 性能优化策略

### 10.1 内部回调快速路径

(utils/hooks.ts:2036-2067):

当所有匹配的 hook 都是 internal callback 时（如 sessionFileAccessHooks、
attributionHooks），跳过整个慢路径:
- 无 span 创建
- 无 progress 消息
- 无 AbortSignal
- 无 JSON 序列化
- 无 processHookJSONOutput

**测量结果**: 6.01us → ~1.8us per PostToolUse hit (-70%)

### 10.2 延迟 JSON 序列化

(utils/hooks.ts:2124-2140):

```typescript
let jsonInputResult
function getJsonInput() {
  if (jsonInputResult !== undefined) return jsonInputResult
  try {
    return (jsonInputResult = { ok: true, value: jsonStringify(hookInput) })
  } catch (error) {
    return (jsonInputResult = { ok: false, error })
  }
}
```

- callback/function hook 不需要 JSON，不触发序列化
- 批次中多个 command/prompt/agent/http hook 共享一次序列化

### 10.3 hasHookForEvent 提前退出

```typescript
const sessionId = toolUseContext.agentId ?? getSessionId()
if (!hasHookForEvent('PreToolUse', appState, sessionId)) {
  return  // 无匹配 hook, 跳过整个 executeHooks
}
```

每个 `execute*Hooks` 函数在创建 hookInput 之前先检查是否有任何 hook
注册了该事件。

### 10.4 Map 替代 Record

(utils/hooks/sessionHooks.ts:49-62):

```
SessionHooksState = Map<string, SessionStore>

原因:
  Map.set() 是 O(1)
  返回 prev (相同引用) → Object.is 短路 → 零 listener 通知

对比 Record + spread:
  每次 addFunctionHook: O(N) 拷贝
  parallel() + N agents: O(N^2) 总成本 + 30 个 store listener 触发
```

---

## 11. 超时管理

### 11.1 超时层级

```
超时优先级:
  hook.timeout (每个 hook 的配置) > 事件级默认 > 全局默认

全局:
  TOOL_HOOK_EXECUTION_TIMEOUT_MS = 10 分钟 (工具相关)
  SESSION_END_HOOK_TIMEOUT_MS_DEFAULT = 1.5 秒 (会话结束)
  STATUS_LINE_TIMEOUT = 5 秒
  FILE_SUGGESTION_TIMEOUT = 5 秒

特殊:
  prompt hook 默认: 30 秒
  agent hook 默认: 60 秒
  http hook 默认: 10 分钟
  async hook 默认: 15 秒

环境变量覆盖:
  CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS → SessionEnd 超时
```

### 11.2 组合 AbortSignal

(utils/combinedAbortSignal.ts):

```typescript
const { signal: combinedSignal, cleanup } = createCombinedAbortSignal(
  parentSignal,       // 来自用户取消
  { timeoutMs }       // 来自超时配置
)
// → 任一触发则 abort
// → cleanup() 移除监听器和定时器
```

---

## 12. 亮点发现

### 发现 1: asyncRewake 模式

(utils/hooks.ts:205-246)

`asyncRewake` 是一个独特的后台 hook 模式。与普通 `async` 不同:
- 不注册到 AsyncHookRegistry
- 不调用 `shellCommand.background()`（保持内存捕获）
- exit code 2 时将 stderr 作为 task-notification 入队
- 该通知会唤醒模型（空闲时通过 useQueueProcessor，忙碌时通过
  queued_command attachments）

**用途**: Stop hook 可以在后台验证结果，失败时唤醒模型重试。

### 发现 2: 提示交互协议 (prompt protocol)

Hook 进程不仅是"运行并返回"，还可以通过 stdout 发起交互式提示。
这使得 hook 可以在执行过程中向用户征询意见（如"是否继续？"），
而不需要预先知道答案。处理已回应的 prompt 行在最终输出中被精确过滤
(content-matching, fail-closed)。

### 发现 3: IPv4-mapped IPv6 完整防护

ssrfGuard 不仅检查 `::ffff:169.254.169.254`（dotted-decimal 形式），
还处理 `::ffff:a9fe:a9fe`（hex 形式）。通过完整的 IPv6 展开算法
(`expandIPv6Groups`) 和映射提取 (`extractMappedIPv4`) 覆盖所有
压缩表示形式。这防止了许多 SSRF 防护绕过的经典攻击向量。

### 发现 4: 双重白名单交集的精妙设计

HTTP hook 的环境变量插值经过双重过滤:
1. hook 级 `allowedEnvVars` — 声明需要的变量
2. 策略级 `httpHookAllowedEnvVars` — 管理员允许的变量

最终集合是两者的交集。这意味着即使项目配置声明了一个变量，
如果管理员策略没有明确允许，该变量也不会被插值。防止了
恶意项目配置窃取敏感环境变量。

### 发现 5: 会话 Hook 的 Map-not-Record 优化

(utils/hooks/sessionHooks.ts:49-62)

注释详细解释了为什么使用 Map 而非 Record:

> parallel() with N schema-mode agents fires N addFunctionHook
> calls in one synchronous tick. With a Record + spread, each call
> cost O(N) to copy the growing map (O(N^2) total) plus fired all
> ~30 store listeners. With Map: .set() is O(1), return prev means
> zero listener fires.

### 发现 6: once 字段和 Hook 自动清理

配置了 `once: true` 的 hook 在执行一次后自动从配置中移除。
这对于一次性设置任务（如首次项目初始化）非常有用，避免
在后续的会话或工具调用中重复执行。

---

## 13. 文件索引

| 文件 | 行数 | 核心职责 |
|------|------|----------|
| `utils/hooks.ts` | 5022 | Hook 引擎核心 (匹配、执行、聚合) |
| `types/hooks.ts` | ~250 | Hook 类型定义 (Zod schema) |
| `schemas/hooks.ts` | ~230 | Hook 配置 Zod 模式 |
| `entrypoints/sdk/coreTypes.ts` | - | HOOK_EVENTS 常量定义 |
| `utils/hooks/execHttpHook.ts` | 242 | HTTP Hook 执行 + SSRF/CRLF 防护 |
| `utils/hooks/execPromptHook.ts` | ~170 | Prompt Hook (LLM 评估) |
| `utils/hooks/execAgentHook.ts` | ~200 | Agent Hook (多轮验证) |
| `utils/hooks/ssrfGuard.ts` | 294 | SSRF 防护 (IP 阻止列表) |
| `utils/hooks/hookEvents.ts` | 193 | 事件广播系统 |
| `utils/hooks/AsyncHookRegistry.ts` | ~60+ | 异步 Hook 注册表 |
| `utils/hooks/sessionHooks.ts` | ~400 | 会话级 Hook 管理 |
| `utils/hooks/hooksConfigSnapshot.ts` | - | 配置快照 (信任检查前捕获) |
| `hooks/toolPermission/PermissionContext.ts` | ~80+ | 权限决策协调 |
| `hooks/toolPermission/handlers/interactiveHandler.ts` | - | 交互式权限处理 |
| `hooks/toolPermission/handlers/coordinatorHandler.ts` | - | 协调器权限处理 |
| `hooks/toolPermission/handlers/swarmWorkerHandler.ts` | - | Swarm 权限处理 |
| `costHook.ts` | 23 | 成本追踪 React Hook |

---

## 14. 总结

上游工具的 Hooks 系统是一个设计极为精细的可扩展框架。26 种事件类型
覆盖了 CLI 的完整生命周期；五种实现类型从简单的 shell 命令到复杂的多轮
agent 验证，满足不同复杂度需求。安全方面，SSRF 防护深入到 IPv4-mapped IPv6
解析，CRLF 注入在头部值层面消毒，环境变量通过双重白名单交集控制。性能方面，
内部回调快速路径减少 70% 开销，延迟 JSON 序列化避免不必要的计算，Map 替代
Record 将 N 个并发 agent 的注册成本从 O(N^2) 降为 O(N)。整个系统在灵活性
和安全性之间取得了出色的平衡。
