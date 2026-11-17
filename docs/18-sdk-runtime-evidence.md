# SDK 运行时证据记录

## 当前结论

我沿着源码中的 SDK 入口、MCP 配置、控制消息和传输实现核对了自定义工具运行时。现有材料证明 CLI 侧具备 SDK MCP 客户端的连接与工具发现路径，也支持基于现有 transcript 逻辑实现 `forkSession`；我又依据已证明的 CLI 参数、NDJSON 控制协议和 `SdkControlTransport` 接通了 `query()` 的 SDK MCP 工具子集。V2 session 和更广泛的 SDK server 生命周期仍缺少完整契约，因此继续保持明确边界。

## 已确认的源码证据

- `sourcecode/src/entrypoints/agentSdkTypes.ts` 的 `tool()` 与 `createSdkMcpServer()` 已形成可验证的定义/配置层；`query()` 已接到 `sdk/queryRuntime.ts` 的进程适配，V2 session API 仍是桩；`forkSession()` 已接到独立 JSONL 实现并有隔离测试。
- `sourcecode/src/entrypoints/sdk/runtimeTypes.ts` 已补齐进程适配所需的 `Query`、`Options`、权限回调和控制方法类型；这些类型只覆盖已验证的 CLI 参数和控制消息，不宣称完整第三方 SDK 兼容。
- `sourcecode/src/services/mcp/types.ts` 的 `McpSdkServerConfigSchema` 证明了 `{ type: 'sdk', name: string }` 这一个可序列化配置；它没有证明实例、工具 handler 或关闭方法应如何挂载。
- `sourcecode/src/services/mcp/client.ts` 的 `setupSdkMcpClients()` 会为每个 SDK 配置创建 `SdkControlClientTransport`，连接 MCP client，再读取 server capabilities 和 tools。该函数通过 `StructuredIO.sendMcpMessage()` 把 JSON-RPC 消息交给控制通道。
- `sourcecode/src/services/mcp/SdkControlTransport.ts` 已证明 CLI 侧 client transport 与 SDK 侧 server transport 的消息方向、关闭行为和 callback 形状。它没有证明 `createSdkMcpServer()` 应如何注册 server，或多个 server 如何分别维护实例。
- `queryRuntime.ts` 的隔离夹具已证明单个 SDK MCP 配置可以完成 `initialize`、初始化通知、`tools/list`、`tools/call` 和结果回传；适配器只发布已有 `tool()` 定义层能支持的字段，不把它扩展成完整 V2 session 或所有 server 生命周期。
- `sourcecode/src/cli/print.ts` 的 `initialize` 与 `mcp_message` 分支证明了 server 名称登记和消息路由；消息到达 CLI 后只会转发给已经连接的 SDK client。动态配置中的 `type: 'sdk'` 服务器仍由 SDK 进程负责实际 server 生命周期。

## QueryEngine 与 headless 调用链

我沿着现有调用点核对了核心 coding 回合的实际路径：

- `sourcecode/src/QueryEngine.ts` 的 `QueryEngine.submitMessage()` 负责设置工作目录、组装系统提示词、处理 slash command、写入 transcript、构造系统初始化消息、进入 `query()` 主循环并逐条产出 SDK 消息。
- `sourcecode/src/cli/print.ts` 的 `runHeadless()` 先创建 `StructuredIO`、载入初始消息和工具/MCP 连接，再把输入交给 `runHeadlessStreaming()`；后者逐轮调用 `ask()`，将控制请求、SDK 事件和结果按顺序写回 `StructuredIO`。
- `sourcecode/src/cli/structuredIO.ts` 负责 NDJSON 输入拆分、控制请求 pending 表、权限响应匹配、重复 tool-use 防护和输入关闭时拒绝未完成请求。`queryRuntime.ts` 复用这些已验证的字段启动构建后的 CLI，并在适配层处理权限、控制请求、abort 和退出清理。

这条链路证明现有 CLI 可以复用会话引擎完成受控 coding 回合；进程适配层完成了已覆盖的 `Options` 映射、`StructuredIO` 控制请求桥接和 MCP 工具回合，但没有把内部 `QueryEngineConfig` 当作公开契约，也没有声称恢复完整 SDK server 生命周期。`forkSession()` 的 transcript 分支逻辑另有独立验证，不依赖这条进程生命周期。

## 仍缺失的契约

要继续扩展这些入口，至少还需要从源码、声明或可执行测试中确认：

1. `createSdkMcpServer()` 返回对象中实例、server name、version、tools 和 cleanup 的确切字段，以及初始化和关闭的幂等性。
2. 多 server、动态增删和幂等关闭等完整 SDK MCP server 生命周期。
3. V2 session 创建、恢复、消息流和会话持久化边界。
4. 完整 SDK 选项与 hook、MCP、文件缓存和会话持久化的兼容映射。

仅凭 `McpSdkServerConfigSchema`、CLI 的客户端代码或 `QueryEngine` 的内部调用点扩展这些内容会改变公开行为，无法证明与现有实现一致。因此当前只发布已由进程夹具验证的 `query()` 子集，并把后续扩展前提固定为上述契约证据。

## 可复核命令

```powershell
npm exec --yes --package=bun@1.4.4 -- bun run test:sdk-query
npm exec --yes --package=bun@1.4.4 -- bun run verify
```

这些命令会验证当前 CLI 构建、启动、会话 API、本地模型夹具和进程适配夹具，其中 MCP 夹具覆盖单个 SDK server 的工具发现与调用；它们不把 V2 session 或完整 SDK MCP 生命周期算作通过。

## 发布边界

我本轮没有提交本机 bundle、依赖目录、个人配置或临时类型检查文件。V2 session、多 server 动态生命周期和完整 SDK 选项仍列为未完成范围，直到获得可追溯的源码级契约和对应隔离测试。
