# 当前 GitHub 发布归档验收

我从 GitHub API 读取 `coding-agent` 的 `main`，确认当前提交为 `9a951fa4b4fd934c5d20790f004cf6de61f15c0f`。由于本轮 Git clone endpoint 多次出现连接重置，我使用该精确提交的 GitHub 发布归档建立了全新 Windows 验收目录，并把这次结果标记为归档验收，不把它表述为新的 Git clone。

## 验证结果

- 归档内容与 API 返回的 `9a951fa4...` 提交一致；远端 `main` SHA 也已由 GitHub API 核对。
- 在没有本地依赖和构建产物的归档目录中执行 `npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile`，安装器报告 519 个包；一个可选 postinstall 被阻止，但没有参与后续检查。
- `npm exec --yes --package=bun@1.4.4 -- bun run verify` 通过：CLI 构建成功，68 项测试、383 次断言通过，`audit-source-build.mjs --include-packages` 返回 `success: true` 且诊断为空。
- 构建后的 CLI 版本检查输出 `0.1.0 (Coding Agent)`；帮助检查输出 `Usage: coding-agent [options] [command] [prompt]`。
- SDK MCP 进程夹具实际验证 `initialize`、初始化通知、`tools/list`、`tools/call` 和 `connected` 状态；V2 session、完整源码 TypeScript 类型检查和真实模型服务仍不在本次通过范围内。

## 复核命令

```powershell
npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.4.4 -- bun run verify
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --help
```

待 Git clone endpoint 恢复后，我会用同一 SHA 补做新的 Windows 浅克隆，并单独记录 clone 的 HEAD 与远端 `main` 核对结果。
