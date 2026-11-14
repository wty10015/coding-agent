# Coding Agent

这是我主导推进的 AI 辅助编程项目。我以现有项目文件和实现为基础，结合 AI 辅助开展结构梳理、问题修缮与验证。我负责目标定义、方案取舍、代码审阅和验收，并对最终提交内容负责。

我按每天完成并验证的一组改动逐步整理和发布项目。提交信息只说明改动内容，不写日期；Git 会记录实际提交时间。

## 当前进度

- 我建立了源码级 `package.json` 与重新生成的 `bun.lock`，并以现有实现及可核对的发布包版本为依据锁定依赖。在 Windows 全新克隆中，Bun 1.4.4 的冻结安装、完整 CLI 打包、`--version`、`--help`、包级模块解析、45 项边界测试和本地模型夹具的 Edit 闭环均通过；夹具还覆盖 JSON、NDJSON 输出及 NDJSON 输入。会话元数据 API 也已接到现存存储实现并单独验证。这份锁文件是新建的可复现依赖选择，不是原始锁文件；完整源码类型检查、真实模型服务调用及独立 Agent SDK 的 `query` 与工具运行时仍待验收。
- 我已在本机验证现有打包运行程序可以显示帮助和版本信息；这只证明打包程序可启动，不代表源码构建已经恢复。
- 我已根据现有 Zod schema 恢复 SDK 核心类型声明与控制消息类型，并用临时 TypeScript 环境完成该部分局部类型检查。随后，我依据现有调用点和 schema 补回查询来源、快捷键、Shell/MCP/Web 搜索/任务/Agent/Skill 进度类型，以及 SDK effort 与 Settings 类型导出；我还按现有 SDK 事件注释重建了最小 workflow progress 结构，并修复 schema 解析会丢弃该字段的问题，局部解析验证确认额外负载得以保留。我从本地生成声明重建了 SDK 工具输入/输出类型模块，独立 TypeScript 检查通过；近期又依据 stop-hook 的生产和消费路径恢复 `StopHookInfo`，并完成对应的 strict 类型检查。SDK 工具类型的原始 schema 和生成流程仍缺失。这些增量尚未通过完整源码类型检查，也不代表完整源码已能安装、构建或运行。
- 我依据 compact boundary 构造器、SDK schema、转换器和持久化/UI 消费点恢复了 `CompactMetadata` 与 `SystemCompactBoundaryMessage` 两个独立类型，并完成 strict 类型检查。这项改动只覆盖能够由现存实现证明的压缩消息契约，未恢复缺失的完整消息联合类型。
- 我依据 partial compact 的默认参数和分支恢复了 `PartialCompactDirection`（`'from' | 'up_to'`），并解除五个源码文件对此类型的缺失总消息模块依赖；独立 strict 类型检查通过。
- 我依据消息构造器与 UI 分支恢复了 `SystemTurnDurationMessage`、`SystemAwaySummaryMessage`、`SystemBridgeStatusMessage` 和 `SystemApiMetricsMessage`，并将直接消费者改为引用独立类型文件；完整消息联合类型仍未恢复。
- 我依据 API 重试消息构造器、错误 UI 和重试流程恢复了 `SystemAPIErrorMessage`，并将错误处理链上的直接类型导入改为引用独立类型文件；该类型通过使用临时 SDK 声明的 strict 检查，但当时的仓库源码目录缺少 SDK 声明及依赖清单，完整消息联合类型和其它 API 错误变体仍未恢复。
- 我依据消息构造器和查询流程恢复了 `SystemLocalCommandMessage` 与 `SystemMicrocompactBoundaryMessage`，并调整直接类型消费者；这两项局部契约不代表完整消息联合类型已经恢复。
- 我依据 stop-hook 摘要构造器及 hook 归并消费者恢复了 `SystemStopHookSummaryMessage`，并将相关模块改为导入独立类型；完整消息联合类型仍缺失。
- 我从随附 bundle 的静态字符串中补回了 verify skill 的三份 Markdown 和 ultraplan 提示词；资源通过 Bun 实际打包与字符串一致性检查。在相同 Bun 诊断配置下，完整 CLI 的本地模块解析错误由 16 处减至 12 处，完整构建仍未通过。
- 我修复了工具注册表和工作流禁用列表中的两处无条件导入，使其沿用原有功能开关加载；四项构建边界回归测试通过，本地模块解析错误进一步减至 10 处。这不代表缺失的可选工具实现或完整构建已恢复。
- 我依据现有终端 UI 组件与渲染器重建了四种 JSX 元素的声明，复用了项目的布局、事件和节点类型；局部 strict 类型检查及十个反例检查通过，本地模块解析错误减至 8 处。这项检查不覆盖完整源码类型检查或终端交互运行。
- 我进一步修复了缓存压缩与历史裁剪提示的两处可选模块加载边界，保留原有功能开关和调用顺序；八项构建边界回归测试通过，本地模块解析错误减至 6 处。缺失的压缩实现、完整构建与运行验证仍待完成。
- 我按主入口已有条件修复了三个可选对话框入口的导入边界，并同步内嵌源码映射；十四项导入边界测试和十二项入口回调/映射检查通过，隔离克隆结果一致，本地模块解析错误减至 3 处。这不代表缺失对话框或实际安装流程已恢复。
- 我继续修复了文件持久化入口、终端监视组件、工具选择器和压缩进度组件的导入边界，补齐源码已注明的外部构建定义，并校正相关内嵌源码映射。我还修正诊断脚本把缺失的 `src/*` 项目路径当作外部包保留的盲点。二十八项导入/映射测试、十二项入口检查和四项诊断脚本测试全部通过，Windows 隔离克隆结果一致；外部分发配置下的本地运行时模块解析现已通过。开启依赖包解析后，当时残留依赖报告 18 条错误，完整安装、构建和核心 coding 流程尚未通过。
- 我核对随附源码映射与现存依赖快照，逐文件恢复了浏览器集成模块的八个源码文件，并将四个已有本地实现接入源码路径别名。导入诊断现在会遍历这些别名；45 项回归测试和外部构建配置下的本地模块解析通过。在当时不完整的依赖快照中，包解析仍有 17 条错误；这一阶段尚未完成源码级依赖清单、安装、完整构建和核心 coding 流程。
- 我依据 `RemoteIO` 的调用及 WebSocket/SSE 两种传输类的实际方法，恢复了共享 `Transport` 类型契约，覆盖连接、消息写入、关闭、数据与关闭回调；专属回调仍由各自实现负责。该恢复不增加运行时代码，完整源码类型检查仍有其他缺失模块和 Bun 类型缺口。
- 我将公开 SDK 的 `listSessions`、`getSessionInfo`、`getSessionMessages`、`renameSession` 和 `tagSession` 接到现存会话存储实现。消息读取复用 transcript loader、parent 链恢复和字段清理逻辑；会话变更复用 CLI 已有的 `custom-title` 与 `tag` JSONL 记录格式，`tagSession(..., null)` 使用现有空 tag 记录清除标签。隔离夹具覆盖分支选择、消息顺序、分页、元数据写入、清除标签及无效输入。独立 SDK 的 `query`、自定义工具运行时、会话创建和 fork 仍未实现，因此这不代表独立 Agent SDK 的核心 coding 流程已可运行。
- 我把已验证的 CLI `--version` 与 `--help` 启动检查加入源码验证套件；测试从项目 manifest 读取预期版本，并检查命令退出码、输出和错误输出。该项随 `bun run verify` 自动执行，与现有本地模型夹具的 Edit 闭环共同覆盖源码构建后的 CLI 启动和核心工具路径。
- 我从远端 `main` 的发布快照建立了全新 Windows 验收目录，执行 `bun install --frozen-lockfile`、`bun run verify`；安装核对 519 个包，CLI 构建成功，56 项测试、343 次断言和包解析审计全部通过。安装器阻止的一个可选 postinstall 不影响本次构建、测试或审计；该快照验证的是当前可复现 CLI 与本地模型夹具路径，不等于真实模型服务或未实现 SDK 接口已经通过。
- 我又从 GitHub `main` 做了全新的浅克隆，并在 checkout 内用 Bun 1.4.4 完成 `bun install --frozen-lockfile` 与 `bun run verify`；克隆目录的 HEAD 与远端发布 SHA 一致，519 个包安装完成，56 项测试、343 次断言和包解析审计再次通过。此次验证证明文档中的 Git 克隆路径可以复现当前 CLI 构建和本地模型夹具流程；被安装器阻止的可选 postinstall、真实模型服务和未实现 SDK 接口仍不在通过范围内。
- 我在最新发布提交 `ab63f60` 上再次建立全新的 Windows 浅克隆，按同一文档执行冻结安装和 `bun run verify`；克隆 HEAD、远端 `main` 和验收提交一致，519 个包安装完成，56 项测试、343 次断言及包解析审计再次通过。可选 postinstall 仍被安装器阻止，但没有参与构建、测试或审计；真实模型服务和未实现 SDK 接口仍不在通过范围内。
- 我随后对最新提交 `e00ae87` 创建全新的 Windows detached checkout，并按同一文档执行冻结安装和 `bun run verify`；精确提交的 checkout 安装 519 个包，56 项测试、343 次断言及包解析审计再次通过。该次 GitHub 浅克隆重试受网络连接限制，因此这条结果标注为本地 Git 对象的干净 checkout 验收，不替代网络恢复后的重新克隆。
- 我随后用完整历史的普通 Git 克隆再次执行同一组命令；依赖安装和验证结果保持一致，说明发布内容不依赖浅克隆或特定 Git 历史深度。
- 我记录了当前源码构建缺口及其证据，详见[源码构建可复现性审计](docs/17-build-reproducibility-audit.md)。
- 我新增了[发布就绪审计](docs/19-release-readiness-audit.md)，把已验证的 Windows 安装、构建、核心 coding 流程、排除材料和未完成 SDK 范围集中列出，作为最终验收日的复核入口。
- 我又从 GitHub `main` 创建全新的 Windows 浅克隆，按 README 使用 `npm exec --package=bun@1.4.4` 引导 Bun 1.4.4 完成冻结安装、`bun run verify`、CLI 版本和帮助检查；克隆 `HEAD` 与远端 `main` 同为 `fe7866d`，519 个包、56 项测试、343 次断言及包解析审计均通过。详细命令和边界见[全新克隆复核记录](docs/20-clean-clone-verification.md)。
- 我又对已知最后一次成功推送的 `8feae3e` 建立全新的 Windows detached checkout，519 个包的冻结安装、CLI 构建、56 项测试、343 次断言、包解析审计以及版本/帮助检查均通过。复核期间 GitHub 连接重置，因此我明确将它记录为本地 Git 对象的干净 checkout，而不是新的远端克隆；第七天的远端 SHA 与全新克隆验收仍待完成，详见[最新提交复核记录](docs/21-latest-commit-verification.md)。
- 我在第七天从 GitHub `main` 建立了新的 Windows 浅克隆，并在 D 盘完成 README 中的冻结安装、CLI 构建、核心 Edit 流程、版本和帮助检查。克隆 `HEAD`、实时远端 `main` 和 GitHub API 均核对为 `1cb3813`；519 个包、56 项测试、343 次断言和包解析审计全部通过。完整类型检查、真实模型服务和未实现 SDK 入口仍按审计记录披露，详见[GitHub 全新克隆最终验收](docs/22-github-clean-clone-final.md)。
- 我又沿 `QueryEngine`、`runHeadless`、`StructuredIO` 和 `ask()` 的真实调用点核对了受控 coding 回合：现有 CLI 已能把输入交给会话引擎并按 NDJSON 输出控制请求、SDK 事件和结果，但公开 SDK 的 `query()` 仍缺少启动、选项映射和 MCP server 生命周期契约，因此我继续保留未实现状态，并记录了逐文件证据，详见[SDK 运行时证据记录](docs/18-sdk-runtime-evidence.md)。
- 我沿 SDK 入口、MCP 配置、控制消息和传输实现核对了自定义工具运行时；现有源码只证明 CLI 侧的 SDK MCP 连接与工具发现路径，`tool()`、`createSdkMcpServer()`、`query()` 及其运行时类型仍缺少完整契约，因此我保留明确桩并记录证据边界，详见[SDK 运行时证据记录](docs/18-sdk-runtime-evidence.md)。
- 由于没有其他完整源码材料，我会继续依据仓库现存的 schema、调用点和测试重建可证实的部分，并明确记录推断边界；已通过的 CLI 构建与本地夹具测试不等于恢复了原始完整源码。

架构分析文档中的项目称呼和快照版本信息采用通用表述；为保证技术分析可核验，API、协议和环境变量等实现标识按现有源码保留。

## Windows 源码安装与验证

需要已安装 Node.js 和 npm。在 PowerShell 中使用 `npm exec` 临时引导固定版本的 Bun，不需要全局安装 Bun：

```powershell
git clone https://github.com/wty10015/coding-agent.git
$source = (Resolve-Path .\coding-agent\*\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.4.4 -- bun run verify
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --help
```

`verify` 依次构建 CLI、运行源码目录中的测试文件并检查包模块解析，避免核心夹具因尚未生成 `dist/cli.js` 而失败。测试覆盖构建边界、会话元数据和核心 Edit 工具流程；模型 API 由本机夹具模拟，不发送真实模型请求。构建不包含整个源码树的 TypeScript 类型检查；真实服务与独立 SDK 的查询及工具接口仍需验收。单独运行测试时，可将上方命令中的 `verify` 替换为 `test`；若只运行 `build`，CLI 生成后再单独运行测试。

## 本地凭证

本地 API 验证使用环境变量提供凭证。凭证、个人配置和运行数据不会提交到仓库。

## 开发方式

我使用 AI 辅助代码理解、实现和测试，负责审查生成或修改的内容，并通过实际运行结果决定是否提交。整理现有项目时，我会保留适用的版权和许可声明。
