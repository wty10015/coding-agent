# SDK MCP 配置验证记录

## 我的实现范围

我依据现有 `McpSdkServerConfig` schema、已经恢复的 `tool()` 定义和 CLI 初始化消息中的 `sdkMcpServers` 字段，实现了 `createSdkMcpServer()` 的配置容器层。

它会：

- 返回 `type: 'sdk'` 和调用者提供的 server 名称；
- 将可选版本保存在 `instance` 中，未提供时保持省略；
- 复制工具数组，避免后续修改调用者数组时改变配置容器；
- 在未提供工具时返回空数组。

现有 `src/cli/print.ts` 只证明 CLI 从初始化消息取得 server 名称，再通过 `mcp_message` 控制请求把 MCP 消息转给 SDK 侧 transport。当前源码没有证明公开工厂应如何创建真实 MCP `Server`、注册 handler、关联请求或执行关闭清理，因此本轮只实现配置层，不把它描述成已连接的 MCP runtime。

## 验证结果

```text
npm exec --yes --package=bun@1.4.4 -- bun run test:sdk-mcp
2 pass
0 fail
4 expect() calls
```

隔离测试覆盖版本保留、工具数组复制和空工具默认值。公开 `query()`、MCP 实例生命周期、真实模型调用和 V2 session 仍按发布审计披露。

## 可复核命令

```powershell
$source = (Resolve-Path .\coding-agent\*\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun run test:sdk-mcp
```
