# SDK 公共入口契约证据审计

## 当前结论

我对现有项目目录中的源码、随附发布材料和本地编译产物做了只读核对。审计材料足以确认 CLI 侧的 MCP 控制传输、交互式会话分支和 transcript 变换逻辑；后续我沿这些证据实现并验证了 `query()` 的进程适配及单个 SDK MCP server 的工具回合。本记录继续界定多 server 生命周期和 V2 session 的缺口。

## 已确认事实

- 随附发布材料包含编译后的 CLI、source map 和工具输入声明文件；它们能帮助核对控制协议和类型表面，但不能单独证明完整公开 SDK 生命周期。
- `sourcecode/src/services/mcp/SdkControlTransport.ts` 和 `sourcecode/src/cli/structuredIO.ts` 证明了 CLI 与 SDK 之间的控制消息方向、请求响应转发和关闭回调；隔离夹具还验证了单个 SDK MCP server 的初始化通知、工具列表和工具调用回传。
- `sourcecode/src/commands/branch/branch.ts`、resume loader 和 JSONL 存储路径共同证明了 `forkSession` 的 UUID/`parentUuid` 重建规则；该入口已有隔离测试。
- `sourcecode/src/entrypoints/sdk/runtimeTypes.ts` 已补齐进程适配所需的 `Query`、`Options`、权限回调和控制方法类型；V2 session 与 SDK MCP 实例生命周期的完整类型仍没有源码级证据。
- `sourcecode/src/entrypoints/sdk/queryRuntime.ts` 复用现有 CLI 参数和 NDJSON 控制协议，已由本地模型夹具验证启动、Edit 闭环、控制方法和退出清理。

## 排除的推断

我没有把以下做法当作完整修复：

1. 根据 `QueryEngine` 和 CLI headless 调用点猜测 `Options` 到 `QueryEngineConfig` 的完整映射；当前适配只映射已经由 CLI 参数和控制协议验证的子集。
2. 直接复用交互式 branch 命令作为公开入口，因为两者的输入会话来源不同。
3. 依据 MCP client transport 反推多 server、动态增删或幂等清理的完整 SDK server 生命周期。
4. 仅凭编译产物中可见的文档或字符串宣称 V2 session 已可运行。

## 仍需证据的范围

要扩展这些入口，至少还需要从源码、声明或可执行测试中明确：

- 多 server、动态增删和幂等关闭等完整 SDK MCP server 生命周期；单个 server 的 `tools/list` 与 `tools/call` 已在进程夹具中验证；
- V2 session 创建、恢复、消息流和会话持久化行为；
- 完整 SDK 选项与 hook、MCP、文件缓存和会话持久化的兼容映射。

在获得这些证据前，我会保留 V2 session 和完整 SDK MCP 生命周期的显式边界，并把单个 server 进程适配的通过结果与其余未完成范围分开报告。

## 可复核命令

```powershell
rg -n "queryRuntime|createSdkMcpServer|forkSession|mcp_message|runHeadlessStreaming" `
  .\sourcecode\src\entrypoints .\sourcecode\src\services\mcp `
  .\sourcecode\src\commands\branch .\sourcecode\src\cli
```

该命令只检查源码中的公开入口、控制传输和已有分支实现，不会读取凭证或提交编译产物。
