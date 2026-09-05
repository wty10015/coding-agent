# Coding Agent：我当前接入的 Agent Harness v1

我在 2026-09-03 接入了完整的本地 Agent 运行链路，并在 2026-09-04 补齐了离线评测证据。这里记录当前 Alpha 代码的模块边界和一次请求的主要路径。

## 运行链路

```text
pico CLI
  -> provider catalog / Provider client
  -> WorkspaceContext / session store
  -> Pico runtime
  -> prompt prefix + context manager + memory
  -> bounded AgentLoop
  -> tool parser / allowlist / approval policy
  -> list/read/search/write/patch/shell/delegate
  -> task state / checkpoint / resume
  -> run store: task_state.json, trace.jsonl, report.json
```

## 模块职责

- `pico.cli` 解析工作区、Provider、模型、审批和运行预算参数，并构建 Agent。
- `pico.providers.catalog` 解析 DeepSeek、OpenAI 兼容、Anthropic 兼容和 Ollama 的配置；`pico.providers.clients` 将不同响应格式统一为 `complete()`。
- `pico.runtime.Pico` 维护 session、任务状态、记忆、checkpoint 和每次运行的报告。
- `pico.context_manager` 根据 prefix、memory、history 和当前请求构建受预算约束的上下文。
- `pico.agent_loop` 与 `pico.bounded_loop` 负责模型输出解析、工具回合、步数限制和停止条件。
- `pico.tools`、`pico.tool_executor` 和 `pico.workspace` 共同执行工具白名单、参数校验和工作区路径边界。
- `pico.run_store`、`pico.session_store` 与 `pico.task_state` 持久化可恢复的本地状态和运行工件。
- `pico.evaluation` 使用固定 fixture 与 FakeModelClient 运行 benchmark，不把真实 Provider 调用混入测试或 CI。

## 数据与安全边界

我将 session、checkpoint、memory、trace 和 report 写入工作区下的 `.pico/`，并通过 secret 环境变量摘要和文本脱敏避免把凭据写入公开工件。`run_shell` 使用受控环境与审批策略，文件操作要求路径落在工作区内，`delegate` 受到深度和步数限制。

这些是应用层约束，不等同于容器或操作系统级沙箱。使用真实 Provider 时，凭据必须通过本地环境变量提供，测试和 CI 不读取真实凭据。

## 当前 Alpha 限制

- Provider 配置、CLI 参数和本地存储格式仍可能在 Alpha 阶段调整。
- shell 与文件变更需要正确的 approval policy 配置，不能把应用层拦截当成系统级安全保证。
- benchmark 证明固定 fixture 上的 runtime 合同和模块行为，不代表真实模型的质量、成本、延迟或线上成功率。
