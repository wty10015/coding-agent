# Coding Agent：我当前接入的 Agent Harness v1

我在本次迭代把完整的本地 Agent 运行链路接入公开代码：CLI 负责配置与启动，`Pico` 负责会话和工具策略，`AgentLoop` 负责有界的模型—工具回合。

## 运行链路

```text
pico CLI
  -> Provider client / WorkspaceContext
  -> Pico runtime
  -> prompt + context manager
  -> AgentLoop
  -> read/write/patch/shell/delegate tools
  -> session、task state、run artifact、checkpoint 与 memory
```

我保留了工作区边界、审批策略、敏感字段脱敏和本地 `.pico/` 工件隔离。默认测试使用 FakeModelClient；真实 Provider 调用只会在用户显式配置凭据并启动命令时发生。

## 当前 Alpha 限制

- 我仍在补齐公开的离线评测证据和更完整的架构说明。
- Provider 配置、命令参数和本地存储格式仍可能在后续 Alpha 版本中调整。
- shell 与文件变更受本地审批策略保护，不替代容器隔离或人工代码审查。
