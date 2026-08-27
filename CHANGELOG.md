# 变更记录

本文件记录公开仓库中可安装、可检查的变更。尚未公开的本地实验文件、运行时和资料不属于此记录。

## 0.1.0（候选发布说明）

`v0.1.0` tag 与 GitHub Release 只会在对应提交通过 Python 3.10、3.11、3.12 的 CI 后创建；本节的存在不表示发布已完成。

### 新增

- 可安装的 `pico` 包与 `python -m pico` 命令行入口。
- DeepSeek、OpenAI 兼容、Anthropic 兼容和 Ollama 的本地配置选择与凭据脱敏展示。
- 受工作区边界保护的只读文件列表、读取和文本搜索。
- 应用层 approval policy 下的文件写入、精确补丁和受限 shell 参数数组工具。
- 本地 session、task state、trace、report、checkpoint 与分层记忆模块。
- 独立、可注入的有界控制流示例，以及 `mini-pico` 教学示例。
- Python 3.10、3.11、3.12 的 GitHub Actions 质量矩阵。
- 面向只读工作区 API 的合成、离线、可逐字节复现的回归评测证据。

### 安全与兼容性说明

- 只读路径边界会拒绝工作区外、Windows 绝对路径及不允许的符号链接。
- 受控变更与 shell 拦截属于应用层策略，不构成操作系统级沙箱。
- 命令参数、存储格式和公开 API 仍可能在后续 Alpha 版本中调整。

### 未包含

- 集成式 Agent runtime、真实 Provider API 调用或真实模型任务执行。
- OS 级隔离、生产级多租户安全边界或任意命令执行保证。
- 真实模型质量、成本、延迟或端到端 Agent 成功率的基准。
