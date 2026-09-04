# Pico 评审材料

## 项目概览

我把 Pico 作为一个面向本地仓库任务的轻量 Coding Agent 来开发。它将模型、工作区上下文、显式工具、状态记录、记忆、运行工件和评测证据组合在一起。

## 架构索引

- `pico.cli` 连接配置、Provider client、工作区上下文和 runtime。
- `pico.runtime.Pico` 协调 Agent 的主控制面。
- `pico.context_manager` 从 prefix、memory、history 和当前请求构建受预算约束的模型上下文。
- `pico.tools` 定义 runtime 使用的显式工具白名单。
- `pico.run_store` 为每次运行写入可复核、可回放的工件。

## 评测证据

我在 benchmark 结果中保留可复现元数据、任务逐行结果、汇总计数和失败类别，以便区分 runtime 回归、任务失败与 Provider 失败。

## 单次运行的工件

- `.pico/runs/<run_id>/task_state.json`
- `.pico/runs/<run_id>/trace.jsonl`
- `.pico/runs/<run_id>/report.json`
