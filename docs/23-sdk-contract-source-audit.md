# SDK 公共入口契约证据审计

## 本轮结论

我对现有项目目录中的源码、随附发布材料及本地编译产物做了只读核对。现有材料足以确认 CLI 侧的 MCP 控制传输和交互式会话分支逻辑，并支持独立实现 `forkSession`；但不足以恢复公开 SDK 的完整运行时契约。本轮将已实现的 fork 范围与仍未完成的公开运行时范围分开记录。

## 已确认事实

- 随附发布材料包含编译后的 CLI、source map 和工具输入声明文件；source map 记录的历史 `agentSdkTypes.ts` 仍保留 `query`、`tool`、`createSdkMcpServer` 和 V2 session 的显式桩。该材料早于本轮 fork 实现，不能作为当前 fork 状态的反证。
- 工具输入声明文件只描述工具输入/输出的类型表面，没有公开 SDK 进程启动、选项映射、MCP server 注册或资源清理的实现。
- `sourcecode/src/services/mcp/SdkControlTransport.ts` 和 `sourcecode/src/cli/structuredIO.ts` 证明了 CLI 与 SDK 之间的控制消息方向、请求响应转发和关闭回调；它们没有证明 SDK server 工厂应如何保存实例或关联多个请求。
- `sourcecode/src/commands/branch/branch.ts` 能从当前 bootstrap 会话创建交互式分支，并重写 transcript 的会话标识；结合 resume loader 对 `uuid` 截断边界的处理，我据此实现了公开 `forkSession` 的任意目录读取、UUID 重映射和 `parentUuid` 重建，并用隔离夹具验证。
- `sourcecode/src/entrypoints/sdk/runtimeTypes.ts` 当前只包含已接入的会话读取与变更类型，公开查询、MCP 工具和 fork 所需的运行时类型正文仍缺失。

## 排除的推断

我没有把以下做法当作修复：

1. 根据 `QueryEngine` 和 CLI headless 调用点猜测 `Options` 到 `QueryEngineConfig` 的完整映射。
2. 直接复用交互式 branch 命令作为公开入口，因为两者的输入会话来源不同；实现只复用了已被源码证明的 UUID/parent 链规则。
3. 依据 MCP client transport 反推 server 工厂的实例生命周期、初始化顺序、请求关联或幂等清理。
4. 仅凭编译产物中可见的文档/字符串宣称公开 SDK 已可运行。

## 解除阻断所需证据

要实现并验证这些入口，至少还需要一份可追溯的 SDK runtime 源码或可执行测试，明确：

- `query()` 如何启动 CLI、映射选项、处理 abort/退出并释放资源；
- `tool()` 和 `createSdkMcpServer()` 的 schema、handler、实例字段及 MCP 生命周期；
- V2 session 的创建、恢复和消息流行为；
- `query()` 的进程启动与选项映射、工具工厂/MCP 生命周期、V2 session 行为；fork 的实现前提已经由现有源码和隔离测试覆盖。

在获得这些证据前，我会保留现有显式桩，并把 CLI 构建与受控 coding 夹具的通过结果和公开 SDK 未完成范围分开报告。

## 可复核命令

```powershell
rg -n "not implemented|createSdkMcpServer|forkSession|query\(" `
  .\sourcecode\src\entrypoints .\sourcecode\src\services\mcp `
  .\sourcecode\src\commands\branch
```

该命令只检查源码中的公开入口和已有分支实现，不会读取凭证或提交编译产物。
