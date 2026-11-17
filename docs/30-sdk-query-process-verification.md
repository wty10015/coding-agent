# SDK 查询进程验证记录

## 实现范围

我沿现有 CLI 的 `--print` 参数、`--input-format stream-json`、`--output-format stream-json`、`--verbose` 约束，以及 `StructuredIO` 已有的 `control_request/control_response` 字段，实现了公开 `query()` 的最小进程适配层。适配器位于 `sourcecode/src/entrypoints/sdk/queryRuntime.ts`，公开入口仍位于 `sourcecode/src/entrypoints/agentSdkTypes.ts`。

当前适配器已覆盖：

- 字符串或 `AsyncIterable<SDKUserMessage>` 输入；
- CLI 的 NDJSON SDK 消息输出；
- `cwd`、环境变量、模型、权限模式、最大轮数、允许/拒绝工具和少量已有 CLI 参数映射；
- `canUseTool` 权限回调及控制响应；
- `interrupt()`、`setPermissionMode()`、`setModel()` 和 `setMaxThinkingTokens()` 控制请求；
- `Options.mcpServers` 的单个 SDK MCP server 控制桥接，包括 `initialize`、初始化通知、`tools/list` 和 `tools/call`；MCP 回合期间保持输入通道打开，最终 `result` 到达后再关闭；
- abort、非零退出和 pending 控制请求清理。

## 验证结果

`bun test scripts/sdk-query-contract.test.mjs scripts/sdk-query-process.test.mjs` 通过 4 项测试、10 次断言。进程夹具使用本地 HTTP 模型服务，启动构建后的 CLI，驱动两轮 `Edit` 调用，确认 SDK 流收到 assistant/result 事件，并确认临时文件内容为 `SDK_QUERY_OK`；另一个夹具确认 abort 会结束子进程和消息流；MCP 夹具确认 server 状态为 connected、工具实际返回 `hello Ada`，并完成两轮模型请求。

完整 `bun run verify` 通过：CLI 构建成功，68 项测试、383 次断言通过，包解析审计返回 `success: true` 且诊断为空。

## 边界

这项实现复用的是仓库现有 CLI 进程和控制协议，不把内部 `QueryEngine` 参数映射猜测成公开 API。单个 SDK MCP server 的 `initialize`、`tools/list`、`tools/call` 生命周期已由进程夹具验证；多 server 动态生命周期、完整第三方选项兼容和 V2 session 创建/恢复仍未完成；V2 入口由独立测试保持明确拒绝。

真实模型服务、真实凭证和多平台运行时没有纳入本地夹具验证范围。

## 可复核命令

```powershell
$source = (Resolve-Path .\\coding-agent\\*\\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun run test:sdk-query
npm exec --yes --package=bun@1.4.4 -- bun run verify
```
