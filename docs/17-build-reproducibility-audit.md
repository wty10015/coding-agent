# 源码构建可复现性审计

## 结论

我目前无法从仓库中的现有材料复现源码安装与构建。打包运行程序可启动，不等于源码构建可复现；在缺少依赖清单、锁定依赖和部分被引用源码的情况下，我不会猜测依赖版本或补写替代实现。

## 已核对的材料

- `sourcecode/src/entrypoints/cli.tsx` 是源码目录中的 CLI 入口。下列源码路径均相对于源码快照目录。
- `sourcecode` 目录没有自己的 `package.json`。目录中的 `tsconfig.json` 只配置 `src/*` 路径映射，没有定义构建流程。
- 源码快照目录的 `package.json` 只声明 `source-map`；这不足以描述源码所需的完整依赖。
- `sourcecode/node_modules` 中有 2,521 个文件，包含第三方依赖和内部集成源码；但目录中没有 `package.json` 或 npm 隐藏锁文件，不能据此确定完整依赖图和所有准确版本。
- 随附的 Bun 锁文件只有可选平台依赖，`packages` 列表为空，不能锁定源码构建所需的依赖版本。原始 ZIP 也没有包含源码级 package manifest 或 lock 文件。
- 源码入口引用了多处当前快照与原始 ZIP 均缺失的相对模块，包括 `sourcecode/src/types/connectorText.ts`、`sourcecode/src/entrypoints/sdk/runtimeTypes.ts`、`toolTypes.ts`、`coreTypes.generated.ts`、`components/agents/SnapshotUpdateDialog.tsx` 和 `tools/TungstenTool/TungstenTool.tsx`。我检查了随附 source map 的全部 4,756 个 source 条目，也没有找到这些项目源码文件。
- 我对 1,884 个 TypeScript 源文件做了本地导入路径静态盘点，发现 251 个不同的本地模块路径无法解析，共涉及 598 处引用；`types/message.ts` 和 SDK `controlTypes.ts` 等缺失路径已直接核对。该扫描用于估算缺失范围，不替代 TypeScript 编译器诊断。
- 我将这次盘点归并出的 190 个缺失目标路径与 source map 的 source 清单逐项匹配，命中数为 0；正向检查能在映射中找到仓库已有的 `src/Tool.ts`。source map 因此没有提供可恢复这些缺失文件的源码条目。
- 本地依赖目录含有两个内部集成依赖的源码，但公开 npm 元数据查询均返回 404；由于本地副本也没有包元数据，无法从现有证据生成可复现的安装声明。
- 我还检索了当前仓库中依赖目录以外的归档文件、安装清单和锁文件；没有发现可供恢复的源码归档。对源码依赖目录进行忽略规则外的定向检索，也没有找到上述缺失模块。现有文件仍不足以补回缺失源码或重建准确依赖图。

## 验证边界

我已在本机验证随附打包程序可以显示帮助和版本信息。这项检查只覆盖打包文件的启动行为，不验证 TypeScript 源码能否安装依赖、编译或运行。

当前工作站原先没有 Bun 或 TypeScript 编译器。我用临时 Bun CLI 对源码入口做了两次诊断：完整 bundle 无法解析 `chalk`、`lodash-es`、MCP SDK 等包及其部分文件；将 npm 包设为 external 后，仍因上述多处缺失的相对源码模块而失败。临时诊断未写入项目目录，也不构成可复现的正式构建流程。

目前缺少足以复现源码构建的依赖清单、精确版本锁定和多处被引用源码。获得这些原始材料后，我会从干净克隆开始记录安装、构建和核心验证步骤；在此之前，源码构建状态保持未通过。
