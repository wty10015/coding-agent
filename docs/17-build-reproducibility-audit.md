# 源码构建可复现性审计

## 结论

我目前无法从仓库中的现有材料复现源码安装与构建。打包运行程序可启动，不等于源码构建可复现；在缺少依赖清单、锁定依赖和部分被引用源码的情况下，我不会猜测依赖版本或补写替代实现。

## 已核对的材料

- `sourcecode/src/entrypoints/cli.tsx` 是源码目录中的 CLI 入口。下列源码路径均相对于源码快照目录。
- `sourcecode` 目录没有自己的 `package.json`。目录中的 `tsconfig.json` 只配置 `src/*` 路径映射，没有定义构建流程。
- 源码快照目录的 `package.json` 只声明 `source-map`；这不足以描述源码所需的完整依赖。
- `sourcecode/node_modules` 中有 2,521 个文件和 192 个顶层包目录，包含第三方依赖和内部集成源码；我递归检查后未找到任何 `package.json`，该目录也没有 npm 隐藏锁文件或其他安装元数据，不能据此确定完整依赖图和准确版本。
- 随附的 Bun 锁文件只有可选平台依赖，`packages` 列表为空，不能锁定源码构建所需的依赖版本。原始 ZIP 也没有包含源码级 package manifest 或 lock 文件。
- 我已依据现有 `coreSchemas.ts` 恢复 SDK 核心类型生成器与生成文件，并让 `controlTypes.ts` 使用这些类型。当前仍缺少 `sourcecode/src/types/connectorText.ts`、`sourcecode/src/entrypoints/sdk/runtimeTypes.ts`、`toolTypes.ts`、`settingsTypes.generated.ts`、`components/agents/SnapshotUpdateDialog.tsx` 和 `tools/TungstenTool/TungstenTool.tsx` 等相对模块；这些缺失阻止完整源码构建。
- 我对当前 1,888 个 TypeScript 源文件做了相对导入静态盘点，发现 362 处无法按 `.ts`、`.tsx`、`.js`、`.jsx`、`.json` 和目录 `index` 文件规则解析的引用，涉及 73 个不同目标路径。该扫描不覆盖路径别名、包导入或 Bun 专用解析规则，也不替代 TypeScript 编译器诊断。
- 随附 source map 有 4,756 条 `sources`，且均带有非空 `sourcesContent`。我此前逐项检查时，缺失目标没有对应的项目源码条目；source map 中能找到仓库已有的 `src/Tool.ts`，但不能据此恢复缺失的 SDK runtime/tool 类型及 UI、工具模块。
- 本地依赖目录含有两个内部集成依赖的源码，但公开 npm 元数据查询均返回 404；由于本地副本也没有包元数据，无法从现有证据生成可复现的安装声明。
- 我还检索了当前仓库中依赖目录以外的归档文件、安装清单和锁文件；没有发现可供恢复的源码归档。对源码依赖目录进行忽略规则外的定向检索，也没有找到上述缺失模块。现有文件仍不足以补回缺失源码或重建准确依赖图。

## 验证边界

我已在本机验证随附打包程序可以显示帮助和版本信息。这项检查只覆盖打包文件的启动行为，不验证 TypeScript 源码能否安装依赖、编译或运行。

我还使用临时依赖环境对恢复的 SDK 核心类型、控制类型和 usage utility 执行了 TypeScript 检查，结果通过。该检查只覆盖这些类型文件，依赖没有写入仓库，也不能证明完整项目可以安装或构建。

当前工作站原先没有 Bun 或 TypeScript 编译器。我用临时 `esbuild` 对 `sourcecode/src/entrypoints/cli.tsx` 做了 bundle 诊断：命令报告 1,649 个解析错误，首批错误包括 Bun 专用模块 `bun:bundle` 以及 `daemon/workerRegistry.js`、`daemon/main.js`、`cli/bg.js`、`cli/handlers/templateJobs.js` 和 `environment-runner/main.js` 等缺失的相对源码模块。临时诊断未写入项目目录，也不构成可复现的正式构建流程。

我此前从 GitHub `main` 做过 Windows 干净克隆验收：该检出没有源码级 `package.json`、锁文件或构建脚本，`npm ci` 与 `npm run` 无法执行，CLI bundle 诊断也因 Bun 专用模块和大量缺失相对模块失败。此后我在本地恢复了部分 SDK 类型，但提交尚未推送，且这些类型恢复没有补足源码依赖清单或其他缺失模块；因此干净克隆的安装、完整构建和核心 coding 流程仍未通过。

目前缺少足以复现源码构建的依赖清单、精确版本锁定和多处被引用源码。获得这些原始材料后，我会从干净克隆开始记录安装、构建和核心验证步骤；在此之前，源码构建状态保持未通过。
