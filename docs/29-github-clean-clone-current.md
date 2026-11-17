# 当前 GitHub 全新克隆验收

## 本轮结论

我从 GitHub `main` 建立了全新的 Windows 浅克隆，并在克隆出的源码目录按 README 执行冻结安装、完整验证和 CLI 启动检查。克隆 `HEAD` 与实时远端 `main` 均核对为 `de735686a3361ec266eff83b81363591974ddd6e`。

## 已通过项目

- `npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile` 成功安装 519 个包。
- `npm exec --yes --package=bun@1.4.4 -- bun run verify` 通过：CLI 构建成功，68 项测试、383 次断言通过，`audit-source-build.mjs --include-packages` 返回 `success: true` 且诊断为空。
- 构建后的 CLI `--version` 返回 `0.1.0 (Coding Agent)`。
- 构建后的 CLI `--help` 返回 `coding-agent` 用法和非交互模式说明。
- 核心 Edit 夹具覆盖 JSON、NDJSON 输出和 NDJSON 输入；模型请求由本地 HTTP 夹具承接，不发送真实模型请求。

## 边界

这次结果证明当前 GitHub 发布内容可以从干净克隆安装、构建并通过已纳入仓库的核心 coding 验证，且 SDK MCP 单 server 工具夹具也通过。被安装器阻止的可选 postinstall 不参与构建、测试或包解析审计。完整源码 TypeScript 类型检查、真实模型服务和 V2 session 仍按既有审计记录披露，不能由本次 CLI 验收推导为已完成。

## 可复核命令

```powershell
git clone --depth=1 https://github.com/wty10015/coding-agent.git
$source = (Resolve-Path .\\coding-agent\\*\\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.4.4 -- bun run verify
npm exec --yes --package=bun@1.4.4 -- bun .\\dist\\cli.js --version
npm exec --yes --package=bun@1.4.4 -- bun .\\dist\\cli.js --help
```
