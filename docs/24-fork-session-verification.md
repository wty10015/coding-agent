# forkSession 验证记录

## 实现范围

我依据现有 resume loader、交互式 branch 命令和 JSONL 会话存储实现了公开 `forkSession`。入口支持：

- 按 `dir` 定位已有 session transcript；
- 用 transcript `uuid` 作为 `upToMessageId` 边界，并包含边界消息；
- 为 fork 中的每条消息生成新的 UUID，按物理消息顺序重建 `parentUuid`；
- 复制主会话的 content-replacement 记录并改写 session ID；
- 将可选 `title` 追加为现有 `custom-title` JSONL 记录。

实现位于 `sourcecode/src/utils/forkSessionImpl.ts`，公开入口位于 `sourcecode/src/entrypoints/agentSdkTypes.ts`。实现没有复用依赖当前 bootstrap session 的交互式命令，而是复用其已验证的 transcript 变换规则。

## 验证结果

`bun test scripts/sdk-session-fork.test.mjs` 通过 2 项测试、8 次断言，覆盖：

- UUID 重映射和 `parentUuid` 链；
- `upToMessageId` 截断；
- content-replacement 和标题记录；
- 未知边界拒绝且不写入 fork 文件。

完整 `bun run verify` 也通过：58 项测试、351 次断言，CLI 构建成功，包解析审计返回 `success: true`。

## 边界

本记录只证明 `forkSession` 的 transcript 文件操作。公开 `query()` 的进程适配另见[SDK 查询进程验证记录](30-sdk-query-process-verification.md)；`tool()`、`createSdkMcpServer()` 的完整 MCP 生命周期、V2 session 及真实模型服务不能用本记录替代。
