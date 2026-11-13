# GitHub 全新克隆最终验收

## 我的验收结论

我从 GitHub `main` 建立了新的 Windows 浅克隆，并把验收目录放在 D 盘以避开系统临时盘空间不足。克隆得到的 `HEAD`、克隆后实时读取的远端 `main` 和 GitHub API 返回的提交均为 `4261ee330e4e0b050b00e4167bda7913aeb98f15`。这次结果满足“从 GitHub 干净克隆按文档安装、构建并完成受控核心 coding 验收”的证据要求。

这项验收覆盖当前源码级 CLI 分发和本地模型夹具驱动的 Edit 流程，不扩大完整 TypeScript 类型检查、真实模型服务或尚未实现 SDK 公开入口的范围。那些缺口仍在发布审计中明确列出。

## 执行结果

- GitHub API 读取 `main`：`4261ee330e4e0b050b00e4167bda7913aeb98f15`。
- 全新浅克隆的 `HEAD`：`4261ee330e4e0b050b00e4167bda7913aeb98f15`。
- 克隆内 `git ls-remote origin refs/heads/main`：`4261ee330e4e0b050b00e4167bda7913aeb98f15`。
- `npm exec --yes --package=bun@1.4.4 -- bun --version` 返回 `1.4.4`。
- `npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile` 安装 519 个包；一个可选 postinstall 被阻止，但没有参与后续验证。
- `npm exec --yes --package=bun@1.4.4 -- bun run verify` 通过：CLI 构建成功，56 项测试、343 次断言通过，包解析审计返回 `success: true` 且诊断为空。
- `npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version` 返回 `0.1.0 (Coding Agent)`；`--help` 输出 `Usage: coding-agent` 和选项列表。

## 复核命令

```powershell
$clone = Join-Path $PWD 'coding-agent'
git clone --depth 1 https://github.com/wty10015/coding-agent.git $clone
$head = git -C $clone rev-parse HEAD
$remote = (git -C $clone ls-remote origin refs/heads/main).Split("`t")[0]
if ($head -ne $remote) { throw 'Clone and remote SHA mismatch' }
$source = (Resolve-Path (Join-Path $clone '*\sourcecode')).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.4.4 -- bun run verify
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --help
```

## 仍未覆盖的范围

完整源码 TypeScript 类型检查、真实模型服务和独立 SDK 的 `query()`、工具工厂、V2 session 与 fork 入口仍按[发布就绪审计](19-release-readiness-audit.md)披露；我没有用这次 CLI 验收替代这些契约的实现或验证。
