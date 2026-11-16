# 发布就绪审计

## 我的发布判断

我以当前 `main` 发布快照和可复核命令检查源码级分发边界。当前仓库可以从 Windows 干净 checkout 安装源码依赖、构建 CLI，并通过本地模型夹具驱动的核心 Edit 流程；这部分证据已经覆盖冻结安装、启动检查、JSON/NDJSON 输出、NDJSON 输入、会话读取和会话元数据变更。

我没有把本机 bundle、`node_modules`、个人配置、凭证、临时 TypeScript 环境或原始归档加入提交。仓库中的 `sourcecode/package.json` 与 `sourcecode/bun.lock` 是依据现存源码和可核对发布包版本建立的可复现依赖选择，不宣称恢复了缺失材料的原始锁文件。

## 已通过的发布检查

- GitHub `main` 的最新提交可通过 `git ls-remote` 核对；提交信息不包含日期。
- Windows Bun 1.4.4 冻结安装完成，安装器报告 519 个包。一个可选 postinstall 被阻止，但没有参与当前构建、测试或包解析审计。
- `bun run verify` 已在干净发布快照中通过：CLI 构建成功，66 项测试、378 次断言通过，`audit-source-build.mjs --include-packages` 返回 `success: true` 且诊断为空。
- 核心夹具实际驱动 CLI 执行 `Edit` 工具，覆盖 JSON 输出、NDJSON 流输出和 NDJSON 输入配合流输出，并检查临时文件内容。
- README、构建审计和 SDK 证据文档均已扫描，未出现指定上游项目名称或具体版本号。

## 尚未通过的范围

- 完整源码 TypeScript 类型检查仍缺少完整依赖、Bun 全局声明和若干源码模块，当前没有通过证据。
- 真实模型服务、凭证配置和网络联通不在本地夹具验证范围内。
- 公开 SDK 的 `query()` 已接入现有 CLI 的最小进程适配，并由本地模型夹具验证启动、NDJSON 事件、Edit 闭环、控制请求和退出清理；V2 session 仍是显式桩。`tool()` 已恢复为可验证的纯定义构造器，`createSdkMcpServer()` 已恢复为配置容器，`watchScheduledTasks()` 已复用现有 scheduler 提供可取消的事件观察层，但 SDK MCP server 实例注册、请求关联和完整清理生命周期仍未补齐。`forkSession()` 已依据 resume loader 和 branch 命令的源码证据接入 JSONL 实现，并有隔离测试覆盖。
- `forkSession` 的 `upToMessageId` 已按 resume loader 的实际行为匹配 transcript `uuid`，不是依据 API `message.id` 猜测。

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

我会继续以 `docs/30-sdk-query-process-verification.md` 记录进程适配的可验证范围；若 SDK MCP 生命周期或 V2 session 没有新的源码级契约证据，我会保留显式边界，不把局部适配扩大为完整 SDK 功能完成。
