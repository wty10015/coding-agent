# Coding Agent：当前公开架构与 Alpha 指南

本文只描述当前仓库已经公开、可由测试验证的能力。它是一个本地 Python 命令行项目，适合先对代码仓库做受限检查，再逐步组合工具、状态与恢复能力。

## 安装与第一条命令

需要 Python 3.10 或更新版本。克隆仓库后，可用 pip 安装开发依赖：

```text
python -m pip install -e ".[dev]"
python -m pico --help
```

运行全部已发布检查：

```text
python scripts/check_quality.py
```

该命令只收集 Git 已跟踪的 Python 文件和测试；pytest 临时目录写入被忽略的 `.pytest-tmp/`。

## 当前模块关系

```text
命令行（pico.bootstrap）
  ├─ Provider 配置（pico.config / pico.providers.catalog）
  └─ 只读检查（pico.readonly_workspace）

受控变更（pico.guarded_workspace）
  └─ 本地 approval policy

本地状态（session_store / task_state / run_store）
  ├─ checkpoint
  └─ 分层记忆（pico.features.memory）

独立控制流（pico.bounded_loop）
```

- `readonly_workspace` 把 `list_files`、`read_file`、`search` 限制在 `--cwd` 工作区内，跳过 `.git`、`.pico`、`.env`、缓存与虚拟环境。
- `guarded_workspace` 的 `write_file`、`patch_file` 要经过本地 approval policy；`run_shell` 只接收参数数组，并拦截 shell 解释器、删除和高风险 Git 命令。
- `session_store`、`task_state`、`run_store` 使用受限 ID、原子 JSON 写入和敏感字段遮蔽保存本地工件。
- `checkpoint` 比较任务/运行 ID、关键文件 SHA-256 和工作区指纹，给出可恢复、文件过期或工作区不一致等结果。
- `features.memory` 提供任务摘要、最近文件、短期笔记、文件摘要 freshness 和有限主题的长期记忆；长期记忆保存在 `.pico/memory/`，不应提交到 Git。
- `bounded_loop` 是可注入模型和工具函数的有界控制流示例，负责字符预算、工具输出解析和停止条件；它尚未连接真实 Provider 或完整运行时。

## 四个 Provider 配置入口

复制 `.env.example` 为本地 `.env`，只填写实际使用的凭据。CLI 目前提供 DeepSeek、OpenAI 兼容、Anthropic 兼容和 Ollama 的配置选择与脱敏展示：

```text
python -m pico --provider deepseek --show-config
python -m pico --provider openai --show-config
python -m pico --provider anthropic --show-config
python -m pico --provider ollama --show-config
```

`--show-config` 不显示凭据。当前公开命令行只验证配置与只读检查流程；本版本没有把真实模型 API 调用接入公开 runtime，因此不要把它当作可直接执行模型任务的客户端。

## 安全边界与本地数据

- `.env`、`.pico/`、缓存、虚拟环境和生成目录被忽略，不应提交。
- 文件与路径检查会拒绝工作区外路径和不允许的符号链接；这不是操作系统级沙箱。
- `run_shell` 的防护策略不等同于安全执行任意命令。它仍需用户的本地 approval，且不替代容器、权限隔离或代码审查。
- trace 与 report 会遮蔽常见敏感字段，但不要把真实凭据写入任何输入、日志或示例文本。

## mini-pico 示例

[`examples/mini-pico`](../../examples/mini-pico) 是一个自包含的教学示例：它使用假的模型客户端展示“工具调用 → 结果写入 prompt → 最终回答”的最小循环，不调用网络或真实 Provider。

```text
cd examples/mini-pico
uv run --group dev python scripts/check_quality.py
uv run --group dev python -m mini_pico --help
```

它有自己的包、测试和状态目录 `.mini-pico/`，用来理解结构，而不是替代主项目的安全边界或完整功能。

## Alpha 限制

- API 调用、完整 runtime、评测模块和发布版交互界面还在后续开发中。
- 当前 CI 覆盖 Python 3.10、3.11、3.12 上的安装、已发布测试、Ruff 和 CLI help。
- 接口、存储格式与命令参数仍可能调整；使用前请先阅读 `--help` 和对应测试。
