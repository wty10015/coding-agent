# 最终 GitHub 干净克隆验收

我从 GitHub `main` 建立了全新的 Windows 克隆，并在没有项目依赖和构建产物的源码目录中执行 README 要求的安装、构建和核心验证。克隆得到的 `HEAD` 为 `1a411b91cfc8244c04dd8bbc8bdfe25cc2696fd2`；主工作树在克隆前已用 `git ls-remote origin refs/heads/main` 核对同一远端 SHA。

## 验证结果

- `npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile` 成功，安装 519 个包；一个可选 postinstall 被安装器阻止，但没有参与后续检查。
- `npm exec --yes --package=bun@1.4.4 -- bun run verify` 通过：CLI 构建成功，68 项测试、383 次断言通过，包解析审计返回 `success: true` 且诊断为空。
- 构建后的 CLI `--version` 输出 `0.1.0 (Coding Agent)`。
- 构建后的 CLI `--help` 输出 `Usage: coding-agent [options] [command] [prompt]`，并以成功状态退出。
- 本地模型夹具覆盖 JSON、NDJSON 输出、NDJSON 输入、Edit 闭环和单个 SDK MCP 工具回合；没有发送真实模型请求。

## 在线复核边界

克隆目录完成后再次执行 `git ls-remote` 时 GitHub 连接被重置，因此本记录的 SHA 依据成功克隆得到的 `HEAD` 以及克隆前主工作树的远端核对。构建、测试和审计均在该精确克隆内容中完成。完整源码 TypeScript 类型检查、真实模型服务和 V2 session 继续按审计文档披露为未完成范围。

## 复核命令

```powershell
git clone --depth=1 https://github.com/wty10015/coding-agent.git
$source = (Resolve-Path .\coding-agent\*\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.4.4 -- bun run verify
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --help
```
