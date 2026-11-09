# SDK 运行时证据记录

## 本轮结论

我沿着源码中的 SDK 入口、MCP 配置、控制消息和传输实现重新核对了自定义工具运行时。当前材料能够证明 CLI 侧已经具备 SDK MCP 客户端的连接与工具发现路径，但不足以证明 SDK 侧的 `tool()` 工厂、`createSdkMcpServer()` 实例生命周期和完整 `query()` 主循环。它们仍保持显式未实现状态，我没有用占位实现掩盖缺失的运行时契约。

## 已确认的源码证据

- `sourcecode/src/entrypoints/agentSdkTypes.ts` 暴露了 `tool()` 与 `createSdkMcpServer()` 的公开签名，但函数体仍抛出 `not implemented`。同一文件中的 `query()`、V2 session API 和 `forkSession()` 也仍是桩。
- `sourcecode/src/entrypoints/sdk/runtimeTypes.ts` 目前只恢复了 effort、会话列表、会话读取和会话变更所需的类型。`McpSdkServerConfigWithInstance`、`SdkMcpToolDefinition`、`AnyZodRawShape`、`InferShape`、`Query` 和 `Options` 等入口依赖的运行时类型正文不在现有源码中。
- `sourcecode/src/services/mcp/types.ts` 的 `McpSdkServerConfigSchema` 只证明了 `{ type: 'sdk', name: string }` 这一个可序列化配置；它没有证明实例、工具 handler 或关闭方法应如何挂载。
- `sourcecode/src/services/mcp/client.ts` 的 `setupSdkMcpClients()` 会为每个 SDK 配置创建 `SdkControlClientTransport`，连接 MCP client，再读取 server capabilities 和 tools。该函数通过 `StructuredIO.sendMcpMessage()` 把 JSON-RPC 消息交给控制通道。
- `sourcecode/src/services/mcp/SdkControlTransport.ts` 已证明 CLI 侧 client transport 与 SDK 侧 server transport 的消息方向、关闭行为和 callback 形状。它没有证明 `createSdkMcpServer()` 应如何注册 server，或多个 server 如何分别维护实例。
- `sourcecode/src/services/mcp/InProcessTransport.ts` 证明了一个独立的、成对的进程内 transport 工具，但现有入口没有把它接到 SDK MCP server 工厂，也没有测试证明两种 transport 可以互换。
- `sourcecode/src/cli/print.ts` 的 `initialize` 与 `mcp_message` 分支证明了 server 名称登记和消息路由；消息到达 CLI 后只会转发给已经连接的 SDK client。动态配置中的 `type: 'sdk'` 服务器仍由 SDK 进程负责实际 server 生命周期。

## 仍缺失的契约

要实现这些入口，至少还需要从源码、声明或可执行测试中确认：

1. `SdkMcpToolDefinition` 对 Zod input schema 的保存方式、JSON Schema 转换时机、handler 的 `extra` 参数和异常返回约定。
2. `createSdkMcpServer()` 返回对象中实例、server name、version、tools 和 cleanup 的确切字段，以及初始化和关闭的幂等性。
3. SDK 进程接收 `mcp_message` 后创建 MCP `Server`、注册 `tools/list` 与 `tools/call` handler 的生命周期。
4. `query()` 如何启动 CLI、发送 `initialize`、等待控制响应、维护 pending JSON-RPC 请求，以及在 abort、CLI 退出和 MCP server 关闭时释放资源。

仅凭 `McpSdkServerConfigSchema` 或 CLI 的客户端代码补写这些内容会改变公开行为，无法证明与现有实现一致。因此本轮继续保留缺口，并把下一步调查范围固定在上述四项契约。

## 可复核命令

在源码目录执行以下命令，可以重新确认本记录引用的入口和传输证据：

```powershell
rg -n "not implemented|McpSdkServerConfigSchema|setupSdkMcpClients|SdkControl(Client|Server)Transport|mcp_message" `
  .\src\entrypoints .\src\services\mcp .\src\cli
```

`bun run verify` 仍会验证当前已恢复的 CLI 构建、启动、会话 API 和本地模型夹具路径；它不把上述未实现 SDK 入口算作通过。

## 发布边界

我本轮只补充证据记录，没有提交本机 bundle、依赖目录、个人配置或临时类型检查文件。待找到完整运行时契约后，我会先增加隔离测试，再实现对应入口；在此之前，发布说明继续把独立 SDK 查询和自定义工具运行时列为未完成范围。
