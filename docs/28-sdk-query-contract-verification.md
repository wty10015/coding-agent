# SDK 查询契约验证记录

## 本轮结论

我更新了公开 SDK 查询入口的回归边界。当前 `query()` 已通过现有 CLI 的进程与 NDJSON 控制协议接入最小运行时，V2 session 和 one-shot prompt 仍明确拒绝，不会返回伪造会话。

## 已验证行为

- `query({ prompt, options })` 返回可迭代的进程适配器；其启动、输入、输出和 Edit 工具闭环由独立夹具验证，详见[SDK 查询进程验证记录](30-sdk-query-process-verification.md)。
- `unstable_v2_createSession()` 同步抛出明确的未实现错误。
- `unstable_v2_resumeSession()` 同步抛出明确的未实现错误。
- `unstable_v2_prompt()` 返回拒绝状态，并携带明确的未实现错误。
- V2 边界测试不调用模型服务；进程夹具只使用本地 HTTP 模型服务，不读取真实凭证。

## 为什么没有直接接内部生成器

源码中的 `src/query.ts` 生成器需要消息数组、系统提示、用户/系统上下文、权限回调、工具执行上下文、查询来源和运行时依赖注入。`QueryEngine.ask()` 另外依赖应用状态、工具集合、MCP 客户端、文件缓存和权限回调。当前 `src/entrypoints/sdk/runtimeTypes.ts` 也没有公开 `Query`、`InternalQuery`、`Options`、`SDKSession` 或 `SDKSessionOptions` 的完整生命周期定义。

CLI 的 `runHeadlessStreaming()` 具有 CLI 专属的应用状态和工具初始化流程，因此我没有猜测内部 `QueryEngine` 参数，而是沿已证明的进程启动、NDJSON 输入输出和控制请求字段实现适配层。SDK MCP 实例注册、完整选项兼容和 V2 session 仍缺少证据，继续保持明确边界。

## 验证命令

```powershell
npm exec --yes --package=bun@1.4.4 -- bun test scripts/sdk-query-contract.test.mjs scripts/sdk-query-process.test.mjs
npm exec --yes --package=bun@1.4.4 -- bun run verify
```

通过这组命令可以证明进程适配的本地模型夹具闭环和 V2 明确边界；它不等于真实模型服务、SDK MCP 实例生命周期或完整 SDK 查询选项兼容已经完成。
