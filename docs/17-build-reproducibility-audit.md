# 源码构建可复现性审计

## 结论

我目前无法从仓库中的现有材料复现源码安装与构建。打包运行程序可启动，不等于源码构建可复现；在缺少依赖清单、锁定依赖和部分被引用源码的情况下，我不会猜测依赖版本或补写替代实现。

## 已核对的材料

- `sourcecode/src/entrypoints/cli.tsx` 是源码目录中的 CLI 入口。下列源码路径均相对于源码快照目录。
- `sourcecode` 目录没有自己的 `package.json`。目录中的 `tsconfig.json` 只配置 `src/*` 路径映射，没有定义构建流程。
- 源码快照目录的 `package.json` 只声明 `source-map`；这不足以描述源码所需的完整依赖。
- `sourcecode/node_modules` 中有 2,521 个文件和 192 个顶层包目录，包含第三方依赖和内部集成源码；我递归检查后未找到任何 `package.json`，该目录也没有 npm 隐藏锁文件或其他安装元数据，不能据此确定完整依赖图和准确版本。
- 随附的 Bun 锁文件只有可选平台依赖，`packages` 列表为空，不能锁定源码构建所需的依赖版本。原始 ZIP 也没有包含源码级 package manifest 或 lock 文件。
- 我已依据现有 `coreSchemas.ts` 恢复 SDK 核心类型生成器与生成文件，并让 `controlTypes.ts` 使用这些类型。随后，我依据源码调用点恢复了 `constants/querySource.ts`、`keybindings/types.ts`，以及 `types/tools.ts` 中的 Bash、PowerShell、共享 Shell、MCP、Web 搜索、任务等待、Agent、Skill 和 SDK workflow 进度类型。Agent 与 Skill 进度类型引用的 `types/message.ts` 仍缺失；`Tool.ts` 还引用未恢复的 `REPLToolProgress` 与 `ToolProgressData`。
- `utils/task/sdkProgress.ts` 会把可选的 `workflow_progress` 写入 `task_progress` 事件，`utils/sdkEventQueue.ts` 也声明了该字段；source map 中对应源码注释说明工作流进度按 `type:index` 标识并按 `phaseIndex` 分组，但没有原类型正文。我据此重建了最小 `SdkWorkflowProgress` 结构（`type`、`index`、`phaseIndex`），并在 `SDKTaskProgressMessageSchema` 中加入可选数组及 passthrough 负载，避免解析时丢弃额外字段。索引字段的数据类型与完整负载仍属推断，尚未通过原消费者或端到端测试验证。
- `entrypoints/sdk/runtimeTypes.ts` 目前只恢复了由 `utils/effort.ts` 与 `ModelInfoSchema` 共同佐证的 `EffortLevel`；该模块所需的其他 SDK runtime 类型仍未恢复。`settingsTypes.generated.ts` 现以 `utils/settings/types.ts` 的 `SettingsJson` 暴露 SDK `Settings` 别名；这保留了 schema 推导的类型约束，但尚未恢复原生成产物或其生成流程。`types/message.ts`、`toolTypes.ts`、`components/agents/SnapshotUpdateDialog.tsx` 和 `tools/TungstenTool/TungstenTool.tsx` 等模块也仍未恢复。
- 我用 TypeScript AST 对当前 1,891 个 `.ts`/`.tsx` 源文件的静态 import/export 和字面量动态 import 做了相对模块盘点；按直接文件、常用源码扩展名及目录 `index` 规则尝试解析后，发现 356 处未解析引用，涉及 98 个目标路径。该扫描不覆盖路径别名、包导入或 Bun 专用解析规则，也不替代 TypeScript 编译器诊断。
- 随附 source map 有 4,756 条 `sources`，且均带有非空 `sourcesContent`。我检查后未找到尚缺模块对应的项目源码条目；source map 中能找到仓库已有的 `src/Tool.ts`，但不能据此恢复缺失的 SDK runtime/tool 类型及 UI、工具模块。
- 本地依赖目录含有两个内部集成依赖的源码，但公开 npm 元数据查询均返回 404；由于本地副本也没有包元数据，无法从现有证据生成可复现的安装声明。
- 我还检索了当前仓库中依赖目录以外的归档文件、安装清单和锁文件；没有发现可供恢复的源码归档。对源码依赖目录进行忽略规则外的定向检索，也没有找到上述缺失模块。现有文件仍不足以补回缺失源码或重建准确依赖图。

## 验证边界

我已在本机验证随附打包程序可以显示帮助和版本信息。这项检查只覆盖打包文件的启动行为，不验证 TypeScript 源码能否安装依赖、编译或运行。

我还使用临时依赖环境对恢复的 SDK 核心类型、控制类型和 usage utility 执行了 TypeScript 检查，结果通过。该检查只覆盖这些类型文件，依赖没有写入仓库，也不能证明完整项目可以安装或构建。

当前工作站原先没有 Bun 或 TypeScript 编译器。我用临时 `esbuild` 对 `sourcecode/src/entrypoints/cli.tsx` 做了 bundle 诊断：命令报告 1,649 个解析错误，首批错误包括 Bun 专用模块 `bun:bundle` 以及 `daemon/workerRegistry.js`、`daemon/main.js`、`cli/bg.js`、`cli/handlers/templateJobs.js` 和 `environment-runner/main.js` 等缺失的相对源码模块。临时诊断未写入项目目录，也不构成可复现的正式构建流程。

我此前从 GitHub `main` 做过 Windows 干净克隆验收：该检出没有源码级 `package.json`、锁文件或构建脚本，`npm ci` 与 `npm run` 无法执行，CLI bundle 诊断也因 Bun 专用模块和大量缺失相对模块失败。此后我已恢复并推送部分 SDK 类型；这些增量没有补足源码依赖清单或其他缺失模块，因此干净克隆的安装、完整构建和核心 coding 流程仍未通过。

目前缺少足以复现源码构建的依赖清单、精确版本锁定和多处被引用源码。用户已确认没有其他完整源码材料可供补充。我会继续以仓库现存的 schema、调用点和测试为依据，逐项重建能够由证据支撑的缺失部分，并为每项记录直接证据、推断内容和未解决字段；无法从现有证据确定的依赖版本、类型字段或实现行为会继续标记为待确认，不会以宽泛占位类型伪装成完整恢复。

重建出的实现与原始源码逐字或行为完全一致，目前无法验证。只有当源码级依赖清单和精确锁文件齐备，且从干净 Windows 克隆成功完成安装、构建及核心 coding 流程验证后，我才会将源码构建状态更新为通过。
