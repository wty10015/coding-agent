# Coding Agent

一个从零开始制作的本地 Coding Agent 项目。

我会在每个开发日完成一个清晰的小目标，并在当天把这部分工作提交到 GitHub。项目会围绕代码仓库上下文、工具调用、会话状态、恢复能力和评测逐步搭建起来。

## 今天完成

- 创建项目仓库与 MIT 许可证
- 整理首版 README 和开发记录
- 建立 Python 项目的本地忽略规则
- 加入可安装的 Python 命令行包，提供 `pico` 和 `python -m pico` 两种入口
- 配置 DeepSeek、OpenAI 兼容、Anthropic 兼容和 Ollama 的基础参数，并提供不含凭据的环境变量模板
- 锁定开发依赖，补充命令行帮助和配置脱敏测试
- 加入只读工作区检查：`pico --cwd <仓库路径> --list-files`、`--read-file` 和 `--search` 均在工作区边界内执行
- 加入受控变更模块：文件写入和精确补丁需要 approval policy，shell 仅执行显式批准的参数数组，并硬拦截破坏性命令和 shell 解释器
- 加入本地 session、task state、trace 和 report 存储，使用原子 JSON 写入与敏感字段脱敏
- 加入独立的有界 execution loop，支持上下文字符预算、工具输出解析、工具回合和停止条件测试
- 加入 checkpoint 与 resume 决策，记录任务摘要、关键文件 freshness 和工作区指纹

## 接下来

下一次开发会开始加入持久化工作记忆和长期记忆。

每个阶段的完成记录见 [ROADMAP.md](ROADMAP.md)。

## 许可证

本项目采用 [MIT License](LICENSE)。
