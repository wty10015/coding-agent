# Coding Agent

这是我持续开发的本地 Coding Agent 项目。我按开发日拆分工程目标，每次只提交当天完成并验证过的一组改动。

## 当前状态

我在 2026-09-03 接入了完整的 Agent 运行链路：CLI 会构建工作区上下文、选择 Provider、运行受约束的工具循环，并把会话、任务状态、运行工件和恢复状态保存在本地 `.pico/`。我在 2026-09-04 补齐了离线 benchmark、fixture、评测脚本、测试和脱敏结果，并在 2026-09-05 发布了 `v0.2.0-alpha.1`。今天（2026-09-08）我重新核对了发布事实和主运行时的安全边界。

当前包版本是 `0.2.0a1`，仍处于可安装 Alpha 阶段。`v0.1.0` tag 与 GitHub Release 已保留，代表早期的 CLI、Provider 配置和只读工作区能力；`v0.2.0-alpha.1` tag 与 GitHub Release 已在 2026-09-05 发布。

## 已接入能力

- `pico` CLI 与 `python -m pico` 模块入口。
- DeepSeek、OpenAI 兼容、Anthropic 兼容和 Ollama 四类 Provider 配置。
- `pico.tools` 中的 `list_files`、`read_file`、`search`、`write_file`、`patch_file`、`run_shell` 和受限 `delegate` 工具；文件工具会校验目标路径位于工作区内。
- 有界 Agent loop、prompt/context 管理、session、task state、checkpoint、resume、working memory、durable memory、trace 和 report 工件。
- 使用 FakeModelClient、fixture 和 mock 的离线回归评测及可复现实验结果。

## 安装与运行

需要 Python 3.10 或更新版本。

```text
python -m pip install -e ".[dev]"
python -m pico --help
pico "inspect the repository and summarize the test failures"
```

Provider 配置保存在本地 `.env`；仓库只提供不含凭据的 `.env.example`。默认测试和示例使用 FakeModelClient，不会调用真实 Provider。真实 Provider 运行必须由我显式选择 Provider，并在本地环境变量中提供对应凭据。

## 安全边界与 Alpha 限制

主 CLI 会通过 `pico.tools` 的工具白名单、参数校验和 approval policy 调用高风险工具。文件读写与补丁会校验目标路径位于工作区内；`run_shell` 以过滤后的环境变量和超时限制在工作区根目录启动宿主 shell，当前仍使用 `shell=True`，因此命令的实际权限与宿主进程一致，不能视为工作区或操作系统级沙箱。

`pico.guarded_workspace` 提供参数数组执行、高风险命令拦截和额外审批检查，但它目前是独立模块，尚未接入主 CLI/runtime 的工具路径。我不会把这套独立保护描述为主运行时默认生效的能力。Provider 配置、命令参数和本地存储格式仍可能在 Alpha 阶段调整。

真实凭据、`.env`、`.pico/`、缓存、虚拟环境、临时目录和私有资料不会进入版本控制。安全反馈方式见 [SECURITY.md](SECURITY.md)。

## 质量检查

```text
python scripts/check_quality.py
python -m pico --help
python -m pico.public_evaluation --check --output docs/evaluation/readonly-workspace-v1.json
```

质量脚本只检查 Git 已跟踪的 Python 文件和测试，测试临时文件写入系统临时目录。推送到 `main` 后，GitHub Actions 会在 Python 3.10、3.11、3.12 上重复安装、测试、Ruff、CLI help 和公开评测检查。

## 文档索引

- [架构说明](docs/architecture/agent-harness-v1-overview.md)
- [评测说明](docs/evaluation/README.md)
- [评测数据来源与复现](benchmarks/results/main-resume-repro-2026-06-07/DATA_PROVENANCE.md)
- [路线图](docs/ROADMAP.md)
- [v0.2.0-alpha.1 发布说明](docs/releases/v0.2.0-alpha.1.md)

本项目采用 MIT License。
