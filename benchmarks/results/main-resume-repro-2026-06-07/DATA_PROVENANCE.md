# Benchmark 数据来源与复现说明

我把本目录作为 Coding Agent 的离线评测归档，用来复核 agent harness 的运行行为与关键模块边界。这里的结果来自本地 fixture、FakeModelClient 和 mock，不代表线上流量或真实 Provider 的服务质量。

## 目录内容

| 文件 | 用途 |
| --- | --- |
| `harness-regression-v2.json` | 固定 harness 回归任务的逐题结果 |
| `context-ablation-v2.json` | 长上下文治理对照实验 |
| `memory-ablation-v2.json` | 工作记忆对照实验 |
| `recovery-ablation-v2.json` | checkpoint / resume 恢复实验 |
| `pico-benchmark-core-report.md` | 自动生成的核心汇总 |

我只提交可复核的 JSON/Markdown 结果，不提交临时 workspace 副本。每个任务的摘要、verifier、状态和运行工件路径都记录在 `harness-regression-v2.json` 中。

## 复现命令

在仓库根目录执行：

```bash
uv run python - <<'PY'
from pathlib import Path
from pico.evaluation.evaluator import run_harness_regression_v2
from pico.evaluation.metrics import (
    run_context_ablation_v2,
    run_memory_ablation_v2,
    run_recovery_ablation_v2,
    write_benchmark_core_report,
)

out = Path("benchmarks/results/main-resume-repro-2026-06-07")
run_harness_regression_v2(
    benchmark_path=Path("benchmarks/coding_tasks.json"),
    artifact_path=out / "harness-regression-v2.json",
    workspace_root=Path("/tmp/pico-benchmark-workspaces"),
)
run_context_ablation_v2(out / "context-ablation-v2.json", repetitions=5)
run_memory_ablation_v2(out / "memory-ablation-v2.json", repetitions=5)
run_recovery_ablation_v2(out / "recovery-ablation-v2.json", repetitions=3)
write_benchmark_core_report(
    report_path=out / "pico-benchmark-core-report.md",
    harness_artifact_path=out / "harness-regression-v2.json",
    context_artifact_path=out / "context-ablation-v2.json",
    memory_artifact_path=out / "memory-ablation-v2.json",
    recovery_artifact_path=out / "recovery-ablation-v2.json",
)
PY
```

评测默认离线运行。如果要进行真实 Provider 实验，必须显式选择实验模式并通过环境变量提供凭据；测试和 CI 不读取凭据，也不会因缺少凭据而联网。

## 指标口径

### Harness 回归

`run_harness_regression_v2()` 读取 `benchmarks/coding_tasks.json`，为每个任务复制独立 fixture workspace，用确定性的 scripted model output 驱动 agent，再执行任务自己的 verifier。通过率、预算内完成率和 verifier 通过率分别记录在汇总字段中；最终工作区和 run artifacts 都会参与判定。

### 上下文治理

`run_context_ablation_v2()` 固定生成 12 组 history、note 和 request 配置，比较治理前后的 prompt 字符数，并检查当前请求是否被保留。模板或工具说明发生变化时，字符数可能随之变化，但实验仍验证同一压缩与保留机制。

### 工作记忆

`run_memory_ablation_v2(repetitions=5)` 构造 12 个依赖既有事实的任务，分别运行 `memory_off`、`memory_irrelevant` 和 `memory_on`。我通过 follow-up 阶段的工具步数与重复读次数，观察记忆注入是否减少不必要的文件读取，同时记录正确率和命中率。

### 恢复与漂移

`run_recovery_ablation_v2(repetitions=3)` 覆盖 checkpoint resume、部分过期、workspace mismatch、schema mismatch 和部分成功恢复等场景。报告区分恢复成功率、stale re-anchor、workspace 漂移检测和 false accept；漂移检测率只针对漂移子场景计算。

### 工具安全与运行工件

固定任务覆盖 README 修改、无效 patch 恢复、路径逃逸拦截、重复读取恢复、上下文 checkpoint、文件新鲜度重锚定、workspace 漂移和 durable memory promotion。每次运行都会落盘 `task_state.json`、`trace.jsonl` 与 `report.json`，因此结果不只依赖模型最终回答。

## 结果边界

- Harness 回归用于验证 runtime 合同和工具边界，不代表任一 Provider 的能力上限。
- Context、memory、recovery 实验分别证明对应模块在固定任务上的行为，不应合并为线上效果结论。
- 结果文件中的时间、提交 SHA、fixture snapshot 和模型配置用于复现定位；更换代码、模板或 fixture 后应重新生成结果。
