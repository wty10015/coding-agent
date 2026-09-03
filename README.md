# Coding Agent

这是我持续开发的本地 Coding Agent 项目。我会在每个开发日完成一个明确的工程目标，并在当天把已经验证的工作提交到 GitHub。

## 当前开发状态

我在 2026-09-01 接入了完整的 Agent 运行链路：命令行会构建工作区上下文、选择 Provider、运行受约束的工具循环，并把会话、运行工件与恢复状态保存在本地 `.pico/`。

当前源码处于 `0.2.0a1` Alpha 开发阶段。已有的 `v0.1.0` tag 与 Release 保留为早期受限能力的公开记录；我会在后续实际开发日继续补齐评测证据和 v0.2 Alpha 发布材料。

## 安装与运行

需要 Python 3.10 或更新版本。

```text
python -m pip install -e ".[dev]"
python -m pico --help
pico "inspect the repository and summarize the test failures"
```

Provider 配置保存在本地 `.env`；仓库只提供不含凭据的 `.env.example`。默认测试与示例使用 FakeModelClient，不会调用真实 Provider。

## 安全与本地数据

我把文件读写、补丁、shell 执行和委派都放在工作区边界与审批策略下。真实凭据、`.env`、`.pico/`、缓存、虚拟环境和运行工件都不会进入版本控制。

## 质量检查

```text
python scripts/check_quality.py
python -m pico --help
```

质量脚本只检查 Git 已跟踪的 Python 文件和测试；测试临时文件写入系统临时目录，不会进入工作区。推送到 `main` 后，GitHub Actions 会在 Python 3.10、3.11、3.12 上重复安装、测试、Ruff 和 CLI 检查。

## 下一步

我会在下一次实际开发日公开离线可复现的 Agent 评测、截图和脱敏证据，然后准备 `v0.2.0-alpha.1`。

本项目采用 MIT License。
