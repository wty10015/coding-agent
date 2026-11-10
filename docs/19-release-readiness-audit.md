# 发布就绪审计

## 我的发布判断

我以当前 `main` 发布快照和可复核命令检查源码级分发边界。当前仓库可以从 Windows 干净 checkout 安装源码依赖、构建 CLI，并通过本地模型夹具驱动的核心 Edit 流程；这部分证据已经覆盖冻结安装、启动检查、JSON/NDJSON 输出、NDJSON 输入、会话读取和会话元数据变更。

我没有把本机 bundle、`node_modules`、个人配置、凭证、临时 TypeScript 环境或原始归档加入提交。仓库中的 `sourcecode/package.json` 与 `sourcecode/bun.lock` 是依据现存源码和可核对发布包版本建立的可复现依赖选择，不宣称恢复了缺失材料的原始锁文件。

## 已通过的发布检查

- GitHub `main` 的最新提交可通过 `git ls-remote` 核对；提交信息不包含日期。
- Windows Bun 1.4.4 冻结安装完成，安装器报告 519 个包。一个可选 postinstall 被阻止，但没有参与当前构建、测试或包解析审计。
- `bun run verify` 已在干净发布快照中通过：CLI 构建成功，56 项测试、343 次断言通过，`audit-source-build.mjs --include-packages` 返回 `success: true` 且诊断为空。
- 核心夹具实际驱动 CLI 执行 `Edit` 工具，覆盖 JSON 输出、NDJSON 流输出和 NDJSON 输入配合流输出，并检查临时文件内容。
- README、构建审计和 SDK 证据文档均已扫描，未出现指定上游项目名称或具体版本号。

## 尚未通过的范围

- 完整源码 TypeScript 类型检查仍缺少完整依赖、Bun 全局声明和若干源码模块，当前没有通过证据。
- 真实模型服务、凭证配置和网络联通不在本地夹具验证范围内。
- 公开 SDK 的 `query()`、`tool()`、`createSdkMcpServer()`、V2 session 和 `forkSession()` 仍是显式桩；现有 `QueryEngine` 与 headless CLI 调用链不足以证明这些公开契约。
- `forkSession` 的 `upToMessageId` 尚未确认应匹配 transcript `uuid` 还是 API `message.id`，因此我没有用猜测实现替代缺失契约。

## 第七天复核命令

在 Windows PowerShell 中从全新克隆进入源码目录后执行：

```powershell
git clone https://github.com/wty10015/coding-agent.git
$source = (Resolve-Path .\coding-agent\*\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.4.4 -- bun run verify
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --help
```

命令通过后，只能据此宣称当前 CLI 构建和受控核心 coding 流程可复现；未通过范围仍按本审计记录披露。

## 下一步收口

我会在最终验收日重新核对远端 `main` SHA，并在网络可用时从该 SHA 做一次全新 Git 克隆。若公开 SDK 缺口仍没有新的源码级契约证据，我会保留显式未实现状态，不把文档验证扩大为完整项目功能完成。
