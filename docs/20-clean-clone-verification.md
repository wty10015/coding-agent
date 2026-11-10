# 全新克隆复核记录

## 我的复核结论

我从 GitHub `main` 创建了全新的 Windows 浅克隆，克隆得到的 `HEAD` 与远端 `main` 同为 `fe7866decf5a8a7ec341182883bc0cda2137bb45`。我在克隆出的源码目录按 README 的源码安装流程执行了冻结安装、完整验证和 CLI 启动检查。

这次复核证明当前发布快照可以在没有本地 `node_modules`、构建产物或个人配置的情况下重建 CLI，并通过受控本地模型夹具驱动的核心 Edit 流程。它不扩大真实模型服务、完整 TypeScript 类型检查或尚未实现 SDK 入口的通过范围。

## 执行结果

- `npm exec --yes --package=bun@1.4.4 -- bun --version` 返回 `1.4.4`。
- `npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile` 完成，安装器报告 519 个包；一个可选 postinstall 被阻止，但没有参与后续构建、测试或包解析审计。
- `npm exec --yes --package=bun@1.4.4 -- bun run verify` 通过：CLI 构建成功，56 项测试、343 次断言通过，`audit-source-build.mjs --include-packages` 返回 `success: true` 且诊断为空。
- `npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version` 返回 `0.1.0 (Coding Agent)`。
- `npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --help` 正常返回 `Usage: coding-agent` 和选项列表。

## 可复核命令

```powershell
git clone https://github.com/wty10015/coding-agent.git
$source = (Resolve-Path .\coding-agent\*\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.4.4 -- bun run verify
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --help
```

临时克隆及其生成文件仍保留在系统 TEMP 目录供本次复核追查，没有加入仓库；个人配置和凭证也未进入 Git 工作树。
