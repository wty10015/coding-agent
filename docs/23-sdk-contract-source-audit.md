# SDK 公共入口契约证据审计

## 本轮结论

我对现有项目目录中的源码、随附发布材料及本地编译产物做了只读核对。现有材料足以确认 CLI 侧的 MCP 控制传输和交互式会话分支逻辑，但不足以恢复公开 SDK 的完整运行时契约。本轮不把声明文件或编译文本当成实现依据，继续将公开 SDK 范围标记为未完成。

## 已确认事实

- 随附发布材料包含编译后的 CLI、source map 和工具输入声明文件；source map 的 `sourcesContent` 中，`sourcecode/src/entrypoints/agentSdkTypes.ts` 仍保留 `query`、`tool`、`createSdkMcpServer`、V2 session 和 `forkSession` 的显式桩。
- 工具输入声明文件只描述工具输入/输出的类型表面，没有公开 SDK 进程启动、选项映射、MCP server 注册或资源清理的实现。
- `sourcecode/src/services/mcp/SdkControlTransport.ts` 和 `sourcecode/src/cli/structuredIO.ts` 证明了 CLI 与 SDK 之间的控制消息方向、请求响应转发和关闭回调；它们没有证明 SDK server 工厂应如何保存实例或关联多个请求。
- `sourcecode/src/commands/branch/branch.ts` 能从当前 bootstrap 会话创建交互式分支，并重写 transcript 的会话标识；它依赖当前会话状态，不能直接证明公开 `forkSession` 对任意目录、`upToMessageId`、UUID 重映射和截断边界的契约。
- `sourcecode/src/entrypoints/sdk/runtimeTypes.ts` 当前只包含已接入的会话读取与变更类型，公开查询、MCP 工具和 fork 所需的运行时类型正文仍缺失。

## 排除的推断

我没有把以下做法当作修复：

1. 根据 `QueryEngine` 和 CLI headless 调用点猜测 `Options` 到 `QueryEngineConfig` 的完整映射。
2. 直接复用交互式 branch 命令实现公开 `forkSession`，因为两者的输入会话来源和截断语义不同。
3. 依据 MCP client transport 反推 server 工厂的实例生命周期、初始化顺序、请求关联或幂等清理。
4. 仅凭编译产物中可见的文档/字符串宣称公开 SDK 已可运行。

## 解除阻断所需证据

要实现并验证这些入口，至少还需要一份可追溯的 SDK runtime 源码或可执行测试，明确：

- `query()` 如何启动 CLI、映射选项、处理 abort/退出并释放资源；
- `tool()` 和 `createSdkMcpServer()` 的 schema、handler、实例字段及 MCP 生命周期；
- V2 session 的创建、恢复和消息流行为；
- `forkSession` 的任意目录读写、`upToMessageId` 匹配字段、UUID/parent 链重写和标题记录格式。

在获得这些证据前，我会保留现有显式桩，并把 CLI 构建与受控 coding 夹具的通过结果和公开 SDK 未完成范围分开报告。

## 可复核命令

```powershell
rg -n "not implemented|createSdkMcpServer|forkSession|query\(" `
  .\sourcecode\src\entrypoints .\sourcecode\src\services\mcp `
  .\sourcecode\src\commands\branch
```

该命令只检查源码中的公开入口和已有分支实现，不会读取凭证或提交编译产物。
