# 源码构建可复现性审计

## 结论

我目前无法从仓库中的现有材料复现源码安装与构建。打包运行程序可启动，不等于源码构建可复现；在缺少依赖清单、锁定依赖和部分被引用源码的情况下，我不会猜测依赖版本或补写替代实现。

## 已核对的材料

- `sourcecode/src/entrypoints/cli.tsx` 是源码目录中的 CLI 入口。下列源码路径均相对于源码快照目录。
- `sourcecode` 目录没有自己的 `package.json`。目录中的 `tsconfig.json` 只配置 `src/*` 路径映射，没有定义构建流程。
- 源码快照目录的 `package.json` 只声明 `source-map`；这不足以描述源码所需的完整依赖。
- `sourcecode/node_modules` 中有 2,521 个文件，包含第三方依赖和内部集成源码；但目录中没有 `package.json` 或 npm 隐藏锁文件，不能据此确定完整依赖图和所有准确版本。
- 随附的 Bun 锁文件只有可选平台依赖，`packages` 列表为空，不能锁定源码构建所需的依赖版本。原始 ZIP 也没有包含源码级 package manifest 或 lock 文件。
- 已有源码引用了缺失的 `sourcecode/src/utils/protectedNamespace` 和 `sourcecode/src/entrypoints/sdk/runtimeTypes`。我检查了随附 source map 的全部 4,756 个 source 条目，没有找到这两个模块的来源内容；原始 ZIP 文件清单中也没有这两个路径。
- 本地依赖目录含有 `@ant/computer-use-mcp` 和 `@ant/claude-for-chrome-mcp` 的源码，但公开 npm 元数据查询返回 404；由于本地副本也没有包元数据，无法从现有证据生成可复现的安装声明。

## 验证边界

我已在本机验证随附打包程序可以显示帮助和版本信息。这项检查只覆盖打包文件的启动行为，不验证 TypeScript 源码能否安装依赖、编译或运行。

当前工作站未安装 Bun 或 TypeScript 编译器，因此还没有完成源码构建验证。

目前缺少足以复现源码构建的依赖清单、精确版本锁定和被引用源码。获得这些原始材料后，我会从干净克隆开始记录安装、构建和核心验证步骤；在此之前，源码构建状态保持未通过。
