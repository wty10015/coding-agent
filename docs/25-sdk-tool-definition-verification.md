# SDK 工具定义验证记录

## 我的实现范围

我依据现有公开入口签名、Zod 依赖和 MCP 工具 schema 转换器恢复了 `tool()` 的定义层。调用该函数会：

- 将传入的 Zod raw shape 组合为可复用的 Zod object；
- 通过现有 `zodToJsonSchema()` 生成 JSON Schema 投影；
- 保留工具名称、描述、handler 以及 `annotations`、`searchHint` 和 `alwaysLoad` 元数据。

我把 Zod 对象和 JSON Schema 分成两个字段保存。这样 handler 可以继续使用解析后的输入，而未来已经建立生命周期契约的 MCP 适配器可以发布 JSON Schema；本轮没有把这个定义层宣称为已接通的 server runtime。

## 验证结果

```text
npm exec --yes bun@1.4.4 -- bun run test:sdk-tool
2 pass
0 fail
10 expect() calls
```

隔离测试覆盖：

- 名称、描述、handler 引用和可选元数据；
- Zod 输入解析；
- 必填和可选字段在 JSON Schema 中的投影；
- handler 的最小调用结果。

`bun run verify` 仍是仓库级发布检查；它覆盖 CLI 构建、现有源码测试和包解析审计。真实 MCP server 实例注册、控制消息请求关联、关闭清理、公开 `query()` 和 V2 session 仍没有足够的源码级契约，继续按发布审计披露。

## 可复核命令

```powershell
$source = (Resolve-Path .\coding-agent\*\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun run test:sdk-tool
```
