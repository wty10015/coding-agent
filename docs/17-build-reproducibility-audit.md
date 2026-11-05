# 源码构建可复现性审计

## 结论

我目前无法从仓库中的现有材料复现源码安装与构建。打包运行程序可启动，不等于源码构建可复现；在缺少依赖清单、锁定依赖和部分被引用源码的情况下，我不会猜测依赖版本或补写替代实现。

## 已核对的材料

- `sourcecode/src/entrypoints/cli.tsx` 是源码目录中的 CLI 入口。下列源码路径均相对于源码快照目录。
- `sourcecode` 目录没有自己的 `package.json`。目录中的 `tsconfig.json` 只配置 `src/*` 路径映射，没有定义构建流程。
- 源码快照目录的 `package.json` 只声明 `source-map`；这不足以描述源码所需的完整依赖。
- `sourcecode/node_modules` 中有 2,850 个文件和 192 个顶层包目录，包含第三方依赖和内部集成源码；我递归检查后未找到任何 `package.json`，该目录也没有 npm 隐藏锁文件或其他安装元数据，不能据此确定完整依赖图和准确版本。
- 随附的 Bun 锁文件只有可选平台依赖，`packages` 列表为空，不能锁定源码构建所需的依赖版本。原始 ZIP 也没有包含源码级 package manifest 或 lock 文件。
- 我已依据现有 `coreSchemas.ts` 恢复 SDK 核心类型生成器与生成文件，并让 `controlTypes.ts` 使用这些类型。随后，我依据源码调用点恢复了 `constants/querySource.ts`、`keybindings/types.ts`，以及 `types/tools.ts` 中的 Bash、PowerShell、共享 Shell、MCP、Web 搜索、任务等待、Agent、Skill 和 SDK workflow 进度类型。Agent 与 Skill 进度类型引用的 `types/message.ts` 仍缺失；`Tool.ts` 还引用未恢复的 `REPLToolProgress` 与 `ToolProgressData`。
- `rg` 在 `sourcecode/src` 下找到 179 个源码文件引用缺失的 `types/message.ts`。由于它包含多个未能从现有材料完整恢复的类型，我没有用一个不完整的同名模块掩盖该缺口。我从消息队列构造点、附件转换和 `wrapCommandText` 的分支中确认了 `MessageOrigin` 的四种来源，将这项可独立证明的契约放在 `types/messageOrigin.ts`，并调整 `utils/messages.ts` 与 `utils/attachments.ts` 的类型导入。该类型文件通过独立 TypeScript strict 检查；这没有恢复其余消息类型，也没有使完整源码类型检查或构建通过。
- 我还检查了系统消息创建器：`createSystemMessage` 和 stop-hook 摘要使用 `info`、`warning`、`suggestion`，API 错误消息使用 `error`；消息 UI 对 `info` 和 `warning` 有直接分支。基于这些可见调用契约，我将 `SystemMessageLevel` 联合类型独立恢复到 `types/systemMessageLevel.ts`。`createSystemMessage` 与远程历史 sentinel 都构造 `system/informational`，字段契约一致；我据此将 `SystemInformationalMessage` 独立放在 `types/systemInformationalMessage.ts`。这些局部类型仍不等于恢复缺失的完整系统消息结构或 `types/message.ts`。
- `StopHookInfo` 的生产和消费路径能确认 `command` 为必需字符串，`promptText` 与 `durationMs` 为可选字符串/数字。我将该类型独立放在 `types/stopHookInfo.ts` 并调整四处导入；它只恢复 hook 摘要字段，不补全其它消息变体。
- `createToolUseSummaryMessage` 明确构造了 `type`、`summary`、`precedingToolUseIds`、`uuid` 和 ISO 时间戳；`query.ts` 消费该变体并将 ID 字段映射为 SDK 的 `preceding_tool_use_ids`，对应 SDK schema 也要求 summary 与 ID 数组。我据此将内部 `ToolUseSummaryMessage` 独立放在 `types/toolUseSummaryMessage.ts` 并调整四处导入；这不恢复其它 `types/message.ts` 变体。
- `query.ts` 在每次 API 请求开始前只发出 `{ type: 'stream_request_start' }`；消息处理器和多个查询流程只按这一字段分支。我将 `RequestStartEvent` 独立放在 `types/requestStartEvent.ts` 并调整四处导入，不引入未被构造点证明的字段。
- `createAgentsKilledMessage` 是 `SystemAgentsKilledMessage` 的构造点，返回固定的 `system/agents_killed`、时间戳、UUID 和 `isMeta: false`；UI 消费者按 subtype 分支。我将该内部消息类型独立放在 `types/systemAgentsKilledMessage.ts`，没有给其它 system subtype 添加推测字段。
- `createPermissionRetryMessage` 明确构造 `system/permission_retry` 消息的 `content`、`commands`、`info` 等级、时间戳、UUID 和 `isMeta: false`；对应 UI 读取 `commands` 与 `content`。我将该类型独立放在 `types/systemPermissionRetryMessage.ts`，其字段来自构造器而非对其它系统消息的类推。
- `createScheduledTaskFireMessage` 从传入文本构造 `system/scheduled_task_fire` 消息，并写入 `isMeta: false`、时间戳和 UUID；UI 读取 `content`。我据此将 `SystemScheduledTaskFireMessage` 独立放在 `types/systemScheduledTaskFireMessage.ts`。
- `createMemorySavedMessage` 构造 `system/memory_saved` 消息；extractMemories 会补充 `teamCount`，autoDream 会补充 `verb`，消息 UI 与 team-memory helper 分别消费这些字段。我将含可选 `teamCount`、`verb` 的 `SystemMemorySavedMessage` 独立放在 `types/systemMemorySavedMessage.ts`。
- `createCompactBoundaryMessage`、SDK `compact_metadata` schema、双向转换器、compact 服务写入点和 session storage 重连逻辑共同证明 `CompactMetadata` 的压缩边界字段；构造器与写入点确认本地还保存可选 `userContext`、`messagesSummarized` 和 `preCompactDiscoveredTools`，SDK schema 与持久化逻辑确认 `preservedSegment`。我将该结构和 `SystemCompactBoundaryMessage` 独立放入对应类型文件，并调整直接消费此消息类型的模块导入；两个类型文件通过独立 strict TypeScript 检查。这没有恢复 `types/message.ts` 的其它变体，也没有使完整源码类型检查或构建通过。
- `partialCompactConversation` 与 `getPartialCompactPrompt` 都以 `'from'` 为默认方向，并按 `'up_to'` 与其它分支拆分消息。我将这两个实际方向独立记录为 `PartialCompactDirection` 并调整五个直接导入点；其余缺失消息类型不因此视为已恢复。
- `createTurnDurationMessage`、`createAwaySummaryMessage`、`createBridgeStatusMessage` 与 `createApiMetricsMessage` 明确给出四种 system 消息的判别字段、必需字段和可选字段；`SystemTextMessage` 消费 turn duration 与 bridge status。基于这些构造和消费路径，我将四种消息类型拆分到独立文件，并调整直接导入点；未据此推断其它 system subtype。
- `createSystemAPIErrorMessage` 明确构造 `api_error` 的 `APIError`、重试时长、当前/最大重试次数、错误等级和时间戳/UUID；错误 UI 与重试服务读取这些字段。我据此恢复 `SystemAPIErrorMessage` 并将六个消费文件改为导入独立类型。类型文件通过使用工作区临时 SDK 声明的 strict TypeScript 检查；仓库源码目录没有 SDK `.d.ts` 或依赖清单，因此该检查不能证明类型与仓库缺失的确切 SDK 版本完全一致，也不补全其它 API 错误或 system 消息结构。
- `createCommandInputMessage` 明确构造 `system/local_command` 的内容、信息等级、时间戳、UUID 与 `isMeta: false`；工具定义、记忆提取和消息转换流程将其与其它 system 消息区分。我据此恢复 `SystemLocalCommandMessage` 并调整其直接类型导入。`createMicrocompactBoundaryMessage` 则明确构造 `system/microcompact_boundary` 及 `trigger`、token 数、压缩工具 ID 和清除附件 UUID 字段；我据此独立恢复 `SystemMicrocompactBoundaryMessage`。两项局部类型不补全其它消息变体或缺失的总消息模块。
- `createStopHookSummaryMessage` 明确构造 hook 数量、hook 信息/错误、是否阻止继续、停止原因、输出状态、system 等级、时间戳、UUID 与可选的工具 ID、标签和总耗时；`collapseHookSummaries` 还会合并这些字段。我据此恢复 `SystemStopHookSummaryMessage` 并调整 UI、hook 汇总和消息构造模块的类型导入，不扩展其它未验证字段。
- `entrypoints/agentSdkTypes.ts` 导出的 `tool`、`createSdkMcpServer`、`query`、会话创建/查询/修改等函数当前都以抛出 `not implemented` 错误结束。该文件提供的类型签名不构成这些 SDK 运行时能力的实现；在对应实现恢复并通过调用验证前，不能把 SDK 类型检查或消息解析测试计作 agent SDK 核心 coding 流程验收。
- `utils/task/sdkProgress.ts` 会把可选的 `workflow_progress` 写入 `task_progress` 事件，`utils/sdkEventQueue.ts` 也声明了该字段；source map 中对应源码注释说明工作流进度按 `type:index` 标识并按 `phaseIndex` 分组，但没有原类型正文。我据此重建了最小 `SdkWorkflowProgress` 结构（`type`、`index`、`phaseIndex`），并在 `SDKTaskProgressMessageSchema` 中加入可选数组及 passthrough 负载，避免解析时丢弃额外字段。索引字段的数据类型与完整负载仍属推断，尚未通过原消费者或端到端测试验证。
- `entrypoints/sdk/runtimeTypes.ts` 目前只恢复了由 `utils/effort.ts` 与 `ModelInfoSchema` 共同佐证的 `EffortLevel`；`agentSdkTypes.ts` 引用的 options、query、session 等 runtime 接口在现存源码、依赖目录和随附 SDK 工具声明中均没有定义，因而仍未恢复。`settingsTypes.generated.ts` 现以 `utils/settings/types.ts` 的 `SettingsJson` 暴露 SDK `Settings` 别名；这保留了 schema 推导的类型约束，但尚未恢复原生成产物或其生成流程。缺失的 `entrypoints/sdk/toolTypes.ts` 已从仓库现存的生成声明文件重建，包含 43 个输入/输出类型导出，并通过独立 TypeScript 检查；其原始 JSON Schema 和生成命令不在仓库中，因此这项恢复尚不能由 schema 重新生成或做源码级一致性验证。`types/message.ts`、`components/agents/SnapshotUpdateDialog.tsx` 和 `tools/TungstenTool/TungstenTool.tsx` 等模块仍未恢复。
- `types/tools.ts` 还引用缺失的 `REPLToolProgress` 和 `ToolProgressData`。我检查了 `REPLTool` 目录、所有 Git 对象及本地 bundle source map：目录只保留 `constants.ts` 和 `primitiveTools.ts`，source map 也只有这两个 REPL 源文件，没有 `REPLTool.ts` 或这些类型的原始定义；Git 对象库中也没有可恢复的旧版本。由于现有调用点不能证明缺失 payload 的完整形状，我不会用宽泛占位类型补齐。
- 我用 TypeScript AST 对当前 1,891 个 `.ts`/`.tsx` 源文件的静态 import/export 和字面量动态 import 做了相对模块盘点；按直接文件、常用源码扩展名及目录 `index` 规则尝试解析后，发现 356 处未解析引用，涉及 98 个目标路径。该扫描不覆盖路径别名、包导入或 Bun 专用解析规则，也不替代 TypeScript 编译器诊断。
- 随附 source map 有 4,756 条 `sources`，且均带有非空 `sourcesContent`。我检查后未找到尚缺模块对应的项目源码条目；source map 中能找到仓库已有的 `src/Tool.ts`，但不能据此恢复缺失的 SDK runtime/tool 类型及 UI、工具模块。
- 我进一步沿 source map 定位 `skills/bundled/verifyContent.ts` 的导出赋值，确认 bundle 中的 `K85`、`s65` 和 `e65` 分别保存 skill 正文及两个示例的静态字符串；`commands/ultraplan.tsx` 的 `_rawPrompt` 映射到 `Q57 = qCK()`，对应模块把提示词字面量赋给 `QGY.exports`。这些资源没有独立的 source map 条目，但字符串仍在 bundle 中。我用 TypeScript AST 静态读取字面量，未执行 bundle，将它们补回原导入路径。verify 的三份 Markdown 逐字恢复；ultraplan 提示词仅将一句上游产品称呼替换为通用的远程编程工作区表述，未重写其余指令。源码目录的 `.gitattributes` 将这四份资源固定为 LF，避免 Windows 克隆改变提示词换行。
- 本地依赖目录含有两个内部集成依赖的源码，但公开 npm 元数据查询均返回 404；由于本地副本也没有包元数据，无法从现有证据生成可复现的安装声明。
- 我检查了本机 npm 缓存：737 条缓存索引中只有 294 个包名对应缓存 tarball；这些名字与 `sourcecode/node_modules` 的 316 个顶层包目录仅有 51 个重合。缓存来源还可能属于其他项目，无法证明缓存包版本与当前安装目录一致，也没有覆盖其余依赖，因此不能据此生成可信的源码锁文件。
- 我还检索了当前仓库中依赖目录以外的归档文件、安装清单和锁文件；没有发现可供恢复的源码归档。对源码依赖目录进行忽略规则外的定向检索，也没有找到上述缺失模块。现有文件仍不足以补回缺失源码或重建准确依赖图。

## 验证边界

我用仓库外临时安装的 Bun 1.4.4 重新检查了完整 CLI 入口。源码注释要求 `feature()` 在构建时排除未启用功能，并将 `process.env.USER_TYPE` 固定为 `external`；Ink 的 devtools 导入还按 `NODE_ENV` 排除。我将这些已有构建约定写入 `sourcecode/scripts/audit-source-build.mjs`，使用 Markdown/文本 loader，且不写出不完整产物。该脚本保留外部包导入，诊断范围仅为本地运行时模块解析；它不验证依赖安装、完整打包、TypeScript 类型或运行时行为。安装 Bun 1.4.4 后，进入源码目录执行：

```powershell
bun .\scripts\audit-source-build.mjs
```

我从本地提交 `d845d35` 创建 Windows 干净克隆，以同一脚本和配置比较恢复前后结果：恢复前报告 16 处解析错误，补回四份资源后报告 12 处；两个结果均以退出码 1 表示未通过。剩余错误仍包含缺失的 UI、工具、压缩服务、文件持久化常量模块和 Ink 声明导入，不能把错误数量减少视为完整构建通过。我还使用 Bun 实际打包现有 `verifyContent.ts` 和恢复的提示词，确认导入后的四份字符串与资源文件逐一相等。

我随后核对 `tools.ts` 与 `constants/tools.ts`，发现工具注册仅在 `USER_TYPE === 'ant'` 时使用 `TungstenTool`，递归工作流禁用规则仅在 `WORKFLOW_SCRIPTS` 开启时使用工作流名称，但原静态 import 始终要求解析对应模块。我将这两处导入改为沿用原条件的 `require`，保留原注册与禁用规则。`scripts/optional-imports.test.mjs` 在实际两个源码模块上检查四种启停组合：旧代码的两个关闭用例失败，修复后四项全部通过。测试隔离了其它依赖，并仅为启用分支提供替身导出，验证的是模块解析与打包保留边界，不验证缺失工具的功能。完整 CLI 同配置诊断仍退出 1，错误从 12 处降到 10 处。进入源码目录可复测：

```powershell
bun test .\scripts\optional-imports.test.mjs
```

我依据 `ink/components/Box.tsx`、`ScrollBox.tsx`、`Text.tsx`、`Link.tsx`、`RawAnsi.tsx` 和 `ink/reconciler.ts` 的现存实现，重建了 `ink/global.d.ts` 中四种 JSX 元素的声明：`ink-box`、`ink-text`、`ink-link`、`ink-raw-ansi`。声明直接复用现有 `DOMElement`、`Styles`、`TextStyles` 和 `EventHandlerProps`，没有添加任意属性索引或宽泛占位类型；这属于依据调用契约重建，并非找回了原始声明全文。现存 React 运行时代码标注为 19.2.0，本次局部检查使用对应的 React 类型声明。

`scripts/check-ink-jsx.cjs` 对该声明及 `scripts/fixtures/ink-jsx.typecheck.tsx` 进行 strict 检查，覆盖有效嵌套元素、终端事件与节点 ref，以及十个必须报错的反例。反例检查错误的布局宽度、浏览器节点 ref、事件参数、滚动状态、颜色、链接地址、ANSI 尺寸和未知属性/元素。缺少声明时，同一有效用例报告元素不存在等十项错误；补回声明后检查通过。我还从 `4f7f3df` 创建 Windows 隔离克隆，仅加入这三份文件后复测，结果一致。同一 Bun CLI 模块诊断中只消除了 `Box.tsx`、`ScrollBox.tsx` 引用该声明文件的两个错误，剩余 8 处错误，仍未通过。

我将检查依赖安装到仓库外，避免把临时工具环境误作源码依赖清单。进入源码目录后，可在 PowerShell 复测：

```powershell
$inkCheckDir = Join-Path ([IO.Path]::GetTempPath()) 'coding-agent-ink-typecheck'
npm install --prefix $inkCheckDir --ignore-scripts --no-audit --no-fund --save-exact typescript@5.9.3 @types/react@19.2.0 @types/node@22.15.30
$previousNodePath = $env:NODE_PATH
try {
  $env:NODE_PATH = Join-Path $inkCheckDir 'node_modules'
  node .\scripts\check-ink-jsx.cjs
} finally {
  $env:NODE_PATH = $previousNodePath
}
```

该脚本只收集 fixture 和新声明文件的语法、语义诊断，不检查其传递依赖中所有源码实现的函数体，也不运行 UI；它不能替代完整源码类型检查、源码构建或终端交互验收。

我进一步检查 `services/compact/microCompact.ts` 和 `utils/attachments.ts`：缓存压缩的调用点已有 `CACHED_MICROCOMPACT` 开关，但懒加载 helper 中的动态 import 未被开关直接包围；历史裁剪提示虽会在 `HISTORY_SNIP` 关闭时提前返回，Bun 仍解析后续 require。我将实际导入放入原开关的正向分支，保留缓存模块的懒加载与复用，以及历史裁剪的运行时检查、提示判断和返回值。私有缓存 helper 在开关关闭时显式拒绝调用；现存调用路径仍受原开关保护。

`scripts/optional-imports.test.mjs` 已扩展为八项启停用例。原代码的两个新增关闭用例失败，修复后八项全部通过，启用分支仍保留可选模块。我在基于 `d84b404` 的 Windows 隔离克隆中，仅加入两份源码改动与该测试，复现了同样的失败/通过结果；同一 CLI 诊断脚本和配置下，错误由 8 处减至 6 处，只消除了这两个可选导入错误。测试继续使用替身导出，只验证模块解析和打包保留边界，不验证缺失的压缩模块实现。余下诊断涉及三个对话框入口、内部工具监视组件、可选计划验证工具和文件持久化常量模块；诊断退出码仍为 1，完整构建未通过。

恢复资源的 SHA-256 如下，路径相对于 `sourcecode`；校验值对应 UTF-8/LF 文件内容：

| 资源 | SHA-256 |
| --- | --- |
| `src/skills/bundled/verify/SKILL.md` | `a9995acc78b27b807aef7b70f03846051450aeba2bd397102c6198b08b5aea0d` |
| `src/skills/bundled/verify/examples/cli.md` | `92c3784a19bf09094ffe311f62c84d960fec6c4273c22d2cb5e5a8023f281031` |
| `src/skills/bundled/verify/examples/server.md` | `cae669e4a86d3d1352e976f457d7330aed96afd5337d61e0d062f38cccf31c1a` |
| `src/utils/ultraplan/prompt.txt` | `3dec12ed05fc9f445ea02bed56c3534241d086b7382ae79aca11fb7e0fa9c39f` |

提取时使用的随附 `cli.js` SHA-256 为 `75c9611929d9a770fe2e3a393219d8b98f5de17fde539b2a7355c6db3fd2795f`，`cli.js.map` SHA-256 为 `7965012b7a5fc9e09d8d747a04c5c32b94696924536e217f686bb1e7ee70a657`。这些校验值用于核对资源恢复依据，不代表原构建流程已恢复。

我已在本机验证随附打包程序可以显示帮助和版本信息。这项检查只覆盖打包文件的启动行为，不验证 TypeScript 源码能否安装依赖、编译或运行。

我还使用临时依赖环境对恢复的 SDK 核心类型、控制类型和 usage utility 执行了 TypeScript 检查，结果通过。该检查只覆盖这些类型文件，依赖没有写入仓库，也不能证明完整项目可以安装或构建。

我尝试使用临时 TypeScript 编译器对整个 `sourcecode` 目录做严格检查，并补上 `ES2022`、`preserve`、`bundler` 与 `react-jsx` 编译选项。该目录现有 `tsconfig.json` 只提供 `src/*` 路径映射；完整检查仍报告 11,635 条诊断，主要涉及缺少 Node/Bun 全局类型、未声明或无法解析的依赖、JSX runtime 解析和由此产生的隐式 `any`。这不是可复现的项目构建配置，诊断也不足以区分源码缺陷与依赖/环境缺口，因此我没有把这些结果当作补造类型或实现的依据。

当前工作站原先没有 Bun 或 TypeScript 编译器。我用临时 `esbuild` 对 `sourcecode/src/entrypoints/cli.tsx` 做了 bundle 诊断：命令报告 1,649 个解析错误，首批错误包括 Bun 专用模块 `bun:bundle` 以及 `daemon/workerRegistry.js`、`daemon/main.js`、`cli/bg.js`、`cli/handlers/templateJobs.js` 和 `environment-runner/main.js` 等缺失的相对源码模块。临时诊断未写入项目目录，也不构成可复现的正式构建流程。

我从当前本地提交 `a5a80bf` 在 Windows 上执行了干净克隆验收，克隆过程成功。在克隆根目录运行 `npm ci` 因缺少根级 `package-lock.json` 失败，运行 `npm run build` 因缺少 `package.json` 失败；本次验收针对本地提交，不代表 GitHub 远端已包含该提交。此前的 CLI bundle 诊断也因 Bun 专用模块和大量缺失相对模块失败。因此，安装、完整构建和核心 coding 流程仍未通过。

目前缺少足以复现源码构建的依赖清单、精确版本锁定和多处被引用源码。用户已确认没有其他完整源码材料可供补充。我会继续以仓库现存的 schema、调用点和测试为依据，逐项重建能够由证据支撑的缺失部分，并为每项记录直接证据、推断内容和未解决字段；无法从现有证据确定的依赖版本、类型字段或实现行为会继续标记为待确认，不会以宽泛占位类型伪装成完整恢复。

重建出的实现与原始源码逐字或行为完全一致，目前无法验证。只有当源码级依赖清单和精确锁文件齐备，且从干净 Windows 克隆成功完成安装、构建及核心 coding 流程验证后，我才会将源码构建状态更新为通过。
