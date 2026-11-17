# 最终本地复核记录

我以远端 `main` 当前提交 `990f7964bf9d01aa4be146e98c18f0879277aac0` 为基线，在项目源码目录中重新执行文档要求的安装、构建和核心验证命令。该记录用于补充可复核证据，不改变项目已经声明的功能边界。

## 已执行命令

```powershell
npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.4.4 -- bun run verify
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --help
```

## 结果

- `bun install --frozen-lockfile` 使用仓库锁文件完成依赖安装。
- `bun run verify` 成功：CLI 构建完成，68 项测试和 383 次断言通过，`audit-source-build.mjs --include-packages` 返回 `success: true` 且诊断为空。
- 构建后的 CLI 版本输出为 `0.1.0 (Coding Agent)`。
- 帮助输出以 `Usage: coding-agent [options] [command] [prompt]` 开头，进程退出成功。
- 本地模型夹具覆盖 JSON、NDJSON 输出、NDJSON 输入、Edit 闭环和单个 SDK MCP 工具回合；验证不发送真实模型请求。

## 仍未完成的范围

这次复核不能推出完整源码 TypeScript 类型检查、真实模型服务或 V2 session 已经完成。相关入口继续按 SDK 审计文档中的明确拒绝和证据边界处理；没有新的源码级契约时，我不会补造实现或把夹具结果扩大为完整 SDK 兼容性结论。
