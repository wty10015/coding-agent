# SDK 查询契约验证记录

## 本轮结论

我为公开 SDK 查询入口补充了隔离回归测试。测试确认当前实现会明确报告运行时契约尚未接入，而不会返回一个看似可用但没有会话、鉴权或资源清理能力的伪造对象。

## 已验证行为

- `query({ prompt })` 同步抛出 `query is not implemented in the SDK`。
- `unstable_v2_createSession()` 同步抛出明确的未实现错误。
- `unstable_v2_resumeSession()` 同步抛出明确的未实现错误。
- `unstable_v2_prompt()` 返回拒绝状态，并携带明确的未实现错误。
- 测试不调用模型服务、不读取凭证，也不创建会话文件；它只锁定公开入口的当前边界。

## 为什么暂不接内部生成器

源码中的 `src/query.ts` 生成器需要消息数组、系统提示、用户/系统上下文、权限回调、工具执行上下文、查询来源和运行时依赖注入。`QueryEngine.ask()` 另外依赖应用状态、工具集合、MCP 客户端、文件缓存和权限回调。当前 `src/entrypoints/sdk/runtimeTypes.ts` 也没有公开 `Query`、`InternalQuery`、`Options`、`SDKSession` 或 `SDKSessionOptions` 的完整生命周期定义。

CLI 的 `runHeadlessStreaming()` 能证明进程内的受控 coding 回合，但它同时拥有 CLI 专属的输入、输出、退出和资源清理流程，不能直接证明公开 SDK 的可复用会话适配器。没有启动、鉴权、选项映射、abort、MCP 注册和清理证据时，我保留显式桩，并用测试防止后续改动静默伪造运行时。

## 验证命令

```powershell
npm exec --yes --package=bun@1.4.4 -- bun test scripts/sdk-query-contract.test.mjs
npm exec --yes --package=bun@1.4.4 -- bun run verify
```

通过这组命令只能证明边界行为和现有 CLI/源码构建可复现；它不等于真实模型服务或完整 SDK 查询流程已经完成。
