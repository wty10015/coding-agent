# 公开评测证据（v1）

这组评测用于持续验证当前公开的只读工作区能力。它不是模型基准，也不衡量真实模型调用、成本、延迟、端到端 Agent 成功率或安全隔离强度。

## 范围

任务集由 `pico.public_evaluation` 在运行时构造一个很小的合成工作区，并直接调用已发布的 `list_files`、`read_file` 和 `search` 接口。v1 包含六项确定性检查：

- 可见文件列表会隐藏 `.git`、`.pico` 和 `.env`。
- 指定行范围可被正确读取。
- UTF-8 文本搜索只返回可见文件中的匹配行。
- 父目录越界路径会被拒绝。
- Windows 绝对路径会在所有支持的平台上被拒绝。
- 二进制文件不会作为文本读取。

所有输入均为仓库代码构造的合成内容；没有真实仓库、用户数据、API 凭据或 Provider 调用。结果报告不包含时间戳、绝对路径、机器信息或平台相关排序，因此可逐字节重现。

## 复现

在项目根目录运行：

```text
python -m pico.public_evaluation --output docs/evaluation/readonly-workspace-v1.json
python -m pico.public_evaluation --check --output docs/evaluation/readonly-workspace-v1.json
```

第一条命令生成规范化 JSON；第二条命令重新运行任务，并确认已提交报告与新结果完全一致。GitHub Actions 在 Python 3.10、3.11、3.12 上执行第二条命令。

## 数据来源与限制

`readonly-workspace-v1.json` 的 `provenance` 字段标明它来自 `pico.public_evaluation` 的合成 fixtures。这个报告只能证明上述公开 API 在这些固定输入上的回归结果，不能外推到未发布 runtime、真实模型、第三方 Provider 或任意实际代码库。
