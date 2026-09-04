# Pico Benchmark Core Report

我把本轮离线评测拆成 Harness regression、context ablation、working memory ablation 和 recovery ablation 四层，分别记录 runtime 合同、上下文治理、记忆收益和恢复边界。

## Harness Regression

- 固定任务数：12
- pass_rate：100.00%
- within_budget_rate：100.00%
- verifier_pass_rate：100.00%

## Context Ablation

- 配置数：12
- avg_full_prompt_chars：5575.67
- avg_raw_prompt_chars：6994.33
- avg_prompt_compression_ratio：16.36%
- max_prompt_compression_ratio：33.59%
- current_request_preserved_rate：100.00%

## Working Memory Ablation

- memory_on repeated_reads：0
- memory_off repeated_reads：60
- memory_on avg_tool_steps：0.00
- memory_on correct_rate：100.00%
- memory_hit_rate：100.00%

## Recovery / Resume Ablation

- resume_success_rate：90.00%
- stale_reanchor_rate：100.00%
- workspace_drift_detection_rate：100.00%
- resume_false_accept_rate：0.00%

## 口径边界

- Harness regression 只验证 runtime 合同、工具调用和 verifier 结果，不代表 Provider 上限。
- Context、memory、recovery 三层分别验证模块行为，不与 Provider 实验混写。
- 所有数字来自固定 fixture、FakeModelClient 和 mock；变更代码或 fixture 后应重新运行脚本生成报告。
