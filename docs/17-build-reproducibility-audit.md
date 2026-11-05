# 源码构建可复现性审计

## 结论

我已建立源码级依赖清单与新锁文件，并在 Windows 全新克隆中以 Bun 1.4.4 完成冻结安装、CLI 打包、启动帮助和本地模型夹具的 Edit 工具闭环。这证明当前外部分发 CLI 的构建和一条受控 coding 路径可复现；它不是原始依赖锁的恢复，也不证明完整源码类型检查、真实模型服务或独立 Agent SDK 运行时已通过。下文保留各阶段发现的缺口及修复证据；阶段性失败不代表现在仍在相同位置。

## 已核对的材料

- `sourcecode/src/entrypoints/cli.tsx` 是源码目录中的 CLI 入口。下列源码路径均相对于源码快照目录。
- 初始 `sourcecode` 目录没有自己的 `package.json`。目录中的 `tsconfig.json` 只配置 `src/*` 路径映射，没有定义构建流程。
- 源码快照目录的 `package.json` 只声明 `source-map`；这不足以描述源码所需的完整依赖。
- `sourcecode/node_modules` 中有 2,850 个文件和 192 个顶层包目录，包含第三方依赖和内部集成源码；我递归检查后未找到任何 `package.json`，该目录也没有 npm 隐藏锁文件或其他安装元数据，不能据此确定完整依赖图和准确版本。
- 初始随附的 Bun 锁文件只有可选平台依赖，`packages` 列表为空，不能锁定源码构建所需的依赖版本。原始 ZIP 也没有包含源码级 package manifest 或 lock 文件。
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
- 缺失的 `cli/transports/Transport.ts` 现依据 `RemoteIO` 五项调用及 WebSocket/SSE 类共同实现的方法恢复为纯类型接口；两种传输额外提供的连接回调与 SSE 事件回调不属于共同契约。
- 我已将 `entrypoints/agentSdkTypes.ts` 的 `listSessions` 和 `getSessionInfo` 接到现存的便携会话读取逻辑，并以隔离 JSONL 夹具验证项目筛选、分页、摘要、缺失文件和 sidechain 排除。`tool`、`createSdkMcpServer`、`query`、会话消息读取、创建及修改等函数仍是未实现外壳；这两项元数据接口不能作为 agent SDK 核心 coding 流程验收。
- `utils/task/sdkProgress.ts` 会把可选的 `workflow_progress` 写入 `task_progress` 事件，`utils/sdkEventQueue.ts` 也声明了该字段；source map 中对应源码注释说明工作流进度按 `type:index` 标识并按 `phaseIndex` 分组，但没有原类型正文。我据此重建了最小 `SdkWorkflowProgress` 结构（`type`、`index`、`phaseIndex`），并在 `SDKTaskProgressMessageSchema` 中加入可选数组及 passthrough 负载，避免解析时丢弃额外字段。索引字段的数据类型与完整负载仍属推断，尚未通过原消费者或端到端测试验证。
- `entrypoints/sdk/runtimeTypes.ts` 保留了由 `utils/effort.ts` 与 `ModelInfoSchema` 共同佐证的 `EffortLevel`，并复用现存 `listSessionsImpl.ts` 的列表选项及公开注释中的单会话目录选项；其余 options、query、session 等 runtime 接口仍未恢复。`settingsTypes.generated.ts` 现以 `utils/settings/types.ts` 的 `SettingsJson` 暴露 SDK `Settings` 别名；这保留了 schema 推导的类型约束，但尚未恢复原生成产物或其生成流程。缺失的 `entrypoints/sdk/toolTypes.ts` 已从仓库现存的生成声明文件重建，包含 43 个输入/输出类型导出，并通过独立 TypeScript 检查；其原始 JSON Schema 和生成命令不在仓库中，因此这项恢复尚不能由 schema 重新生成或做源码级一致性验证。`types/message.ts`、`components/agents/SnapshotUpdateDialog.tsx` 和 `tools/TungstenTool/TungstenTool.tsx` 等模块仍未恢复。
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

我核对 `main.tsx` 的所有三个对话框入口调用点后，确认快照更新只在 `AGENT_MEMORY_SNAPSHOT` 启用时调用，会话选择与安装入口只在 `KAIROS` 启用时调用。但 `dialogLaunchers.tsx` 提取出的共用入口没有保留这些构建时条件，导致关闭功能时仍解析三个缺失组件。我将动态导入和原入口逻辑放入相同的正向功能分支；开关关闭时直接调用入口会明确拒绝，避免把功能不可用伪装为用户取消。启用分支中的属性、回调、异步等待和安装错误传递保持原样，没有补写缺失组件实现。

该文件含内嵌 source map。我同步修改其 `sourcesContent`，按插入的行与缩进调整既有映射，并为新增开关位置添加映射，保留原有函数与 JSX 的来源位置。临时 AST 对照确认三个启用分支与修改前函数体一致，其余函数未改变；仓库内测试还核验三个动态导入指向更新后的原始源码行。

`scripts/optional-imports.test.mjs` 现有十四项启停用例。仅加入新增测试时，三个关闭用例失败；应用修复后全部通过。`scripts/dialog-launchers.test.mjs` 另有十二项检查，在实际入口模块中使用受控 UI/组件替身，覆盖快照的三种选择及取消、会话选择与取消、安装成功/取消/报错、默认目录计算错误、关闭入口明确拒绝和源码映射位置。两份测试共 26 项、181 次断言全部通过。我在基于 `db45806` 的 Windows 隔离克隆中，仅加入这三份文件复现了上述结果；同一 CLI 诊断由 6 处错误减至 3 处。进入源码目录可复测：

```powershell
bun test .\scripts\optional-imports.test.mjs .\scripts\dialog-launchers.test.mjs
bun .\scripts\audit-source-build.mjs
```

这些测试没有挂载真实终端 UI、安装文件或连接远程服务，也没有验证缺失组件的实现。在该批修复结束时，模块诊断继续保留包导入，仍因内部工具监视组件、可选计划验证工具和文件持久化常量模块缺失而退出 1。

我随后依据现有调用条件处理其余导入边界：`cli/print.ts` 只在 `FILE_PERSISTENCE` 启用时记录回合时间并上传结果，我让文件持久化模块的加载也遵循这个开关；`screens/REPL.tsx` 的监视组件渲染条件在当前快照中已是字面量 `"external" === 'ant'`，我让其导入沿用同一条件，没有改为可启用的环境变量判断。`utils/messages.ts` 与计划退出组件的注释明确规定外部分发构建将计划验证变量设为 `'false'`，我将这项已有约定补入诊断脚本，并在输出中列出实际构建定义。启用计划验证的测试仍保留该工具的导入。

清除上述错误后，同一诊断继续暴露 `components/TokenWarning.tsx` 中压缩进度子组件的导入问题。父组件只在 `CONTEXT_COLLAPSE` 启用时渲染它，我将子组件原有函数体放入同一个正向分支；关闭时若直接调用该私有子组件，会明确抛出不可用错误。启用时的统计订阅、文本与渲染逻辑未重写。文件持久化的缺失常量、内部监视组件和压缩实现仍未补回；关闭分支能够排除它们，不代表这些可选功能已经恢复。

我进一步检查临时打包结果时，发现 `packages: 'external'` 会把未解析的 `src/*` 项目路径也当作外部包保留，原诊断因此遗漏了 `components/agents/ToolSelector.tsx` 对内部工具的静态导入。我改为只外置实际包请求，让相对路径、绝对路径和现有 `src/*` 别名继续交由 Bun 解析；修正后的诊断先报告该导入缺失。我再按工具分组中已有的字面量 `"external" === 'ant'` 条件加载该工具，保持当前分组行为。后续检查临时打包结果，未再发现遗留的相对路径或 `src/*` 导入字面量；这项扫描不覆盖运行时计算出的动态路径。

我同步了三个 TSX 文件的内嵌 source map，并修正 `REPL.tsx` 早前拆分 `PartialCompactDirection` 类型导入后留下的旧映射。临时 AST 与 JSX 转译对照确认原有运行时函数体保持一致；完整映射位置检查通过，仓库测试覆盖监视组件导入、拆分后的类型导入、工具选择器和压缩模块导入对应的原始源码位置。

`scripts/optional-imports.test.mjs` 现有二十四项导入边界测试和四项映射检查。新增的 `scripts/audit-source-build.test.mjs` 使用临时源码目录执行真实诊断脚本，分别验证缺失的 `src/*` 别名必须报错、已存在的 `.ts` 文件可由 `.js` 别名解析、包解析模式能报告缺失依赖，以及未知参数必须拒绝；测试还确认没有写出构建产物。在基于 `b8cecc0` 的 Windows 隔离克隆中，仅加入两份新测试时有十三项失败，对应六个导入用例、三个映射检查和四个新增诊断契约用例。加入四份源码修复和诊断脚本改动后，连同既有十二项入口检查，44 项、280 次断言全部通过。外部分发配置下的本地运行时模块诊断返回 `success: true`、空诊断列表和退出码 0，隔离环境不含源码依赖目录，结果一致。

我给诊断脚本增加 `--include-packages`，用于继续解析实际依赖包，而默认模式仍隔离本地模块图；两种模式都不写出构建产物。当时使用本机残留依赖开启包解析后，报告 18 条错误，包括包入口无法解析，以及 Zod 和模型 SDK 副本中的文件缺失。这是本次解析暴露的错误，不是完整项目仅剩十八项工作的证明。进入源码目录可复测：

```powershell
bun test .\scripts\optional-imports.test.mjs .\scripts\dialog-launchers.test.mjs .\scripts\audit-source-build.test.mjs
bun .\scripts\audit-source-build.mjs
bun .\scripts\audit-source-build.mjs --include-packages
```

在该阶段通过的仅是默认外部构建配置的本地运行时模块解析；包解析仍退出 1，当时源码依赖清单和锁文件尚未恢复，完整类型检查、安装、构建与核心 coding 流程仍待验证。

我随后检查了随附源码映射和 `sourcecode/node_modules` 中的浏览器集成模块：映射里的八个 `src/*.ts` 条目都含有源码正文，逐文件与现存副本一致。我将这八份源码恢复到 `sourcecode/vendor/chrome-mcp-src`，并在源码的 `tsconfig.json` 中把原包标识映射到该目录；已有的颜色差异、图像处理和键盘修饰键本地实现也各自接入原导入标识。默认诊断现在不会把这四个本地别名当作外部包跳过，新增测试以一个缺失的嵌套导入验证它确实遍历了 vendor 源码。45 项测试、285 次断言通过；本地模块诊断返回空错误。使用现存不完整依赖目录进行包解析时，错误数由 18 降到 17，仍不能视为完整构建。

我也检查了 `protectedNamespace.js`：现存调用仅在 `USER_TYPE === 'ant'` 的内部环境分支，源码映射没有对应模块。外部构建定义会排除该分支，当前诊断未因此报错。我没有依据名称猜造内部权限判断；若将来需要内部环境构建，必须另行取得可验证的实现。

## 新依赖锁与 Windows 干净克隆复测

我从默认 CLI 的包导入盘点出 89 个包名，其中四个已映射到仓库现存的本地源码。对其余直接依赖，我优先采用现存源码、发布包常量和随附 bundle 能证实的版本：例如模型 SDK `0.74.0`、React `19.2.0`、OpenTelemetry API `1.9.0` / core `2.2.0`，以及 AWS 客户端 `3.936.0`。其它版本从公开包中选取、写成精确版本并重新生成 `sourcecode/bun.lock`；这是一份新的兼容性选择，不是原始锁文件。

首版安装后，源码能打出 CLI，但 `--help` 因命令行解析器把 `-d2e` 判作非法短选项而失败。我将快照中的 `commander/lib/option.js` 与公开 tarball 逐字节比较，确认其对应 `commander@12.1.0`；`@commander-js/extra-typings/index.js` 同样对应 `12.1.0`。锁定这两个版本后，`--help` 正常。构建脚本依据已有外部分发定义打包，不再从未发布的内部依赖取代码；构建宏使用本项目版本及 issue 地址，未声明 npm 发布渠道。

我在新的 Windows 克隆中，仅加入本批新增的源码清单、锁文件、构建脚本、入口品牌文字和夹具测试，执行 `bun install --frozen-lockfile`、`bun run build`、`bun run test:core-smoke`、`bun run test:build-boundaries` 和 `bun run check:packages`，全部通过；`--version` 输出 `0.1.0 (Coding Agent)`，`--help` 也能启动。`test:core-smoke` 在临时目录启动本机模型接口夹具，让 CLI 经两次模型回合执行 `Edit` 工具创建文件并返回文本，随后验证文件内容。Bun 安装时阻止了 `protobufjs` 的一项 postinstall；上述构建和夹具流程未依赖它，该脚本是否影响其它功能仍待检查。

这些结果验证了可重建的外部分发 CLI 与一条受控工具调用路径。新增会话列表与单会话元数据入口已接入本地 JSONL 存储实现，并通过隔离夹具验证排序、分页、缺失会话和 sidechain 过滤；该验证不覆盖 `query` 或工具创建接口。核心 CLI 夹具现覆盖单次 JSON 输出、NDJSON 流输出，以及 NDJSON 输入配合流输出，三条路径都实际驱动 `Edit` 工具写入临时文件。测试没有真实 API 凭证，未验证模型服务联通、完整 TypeScript 类型检查、所有可选功能或仍未实现的独立 SDK 查询和工具接口。

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

我当时从本地提交 `a5a80bf` 在 Windows 上执行了干净克隆验收，克隆过程成功。在克隆根目录运行 `npm ci` 因缺少根级 `package-lock.json` 失败，运行 `npm run build` 因缺少 `package.json` 失败；本次验收针对本地提交，不代表 GitHub 远端已包含该提交。此前的 CLI bundle 诊断也因 Bun 专用模块和大量缺失相对模块失败。因此，安装、完整构建和核心 coding 流程仍未通过。

用户已确认没有其他完整源码材料可供补充。我已为外部分发 CLI 新建可安装的依赖清单与锁文件，但部分直接依赖版本是从公开发布包中选择并经当前构建与夹具测试验证，不能宣称恢复了原始精确版本。仍缺失的类型与独立 SDK 运行时会继续按现存 schema、调用点和测试逐项处理；无法证实的字段或行为不会用宽泛占位实现掩盖。

重建出的实现与原始源码逐字或行为完全一致，目前无法验证。当前已通过的是 Windows 干净克隆的冻结安装、CLI 构建和本地模型夹具的 Edit 流程；完整源码类型检查与真实模型服务的核心请求仍缺少通过证据，独立 Agent SDK 的运行时导出仍未实现，因此七日最终验收继续保持未完成。
