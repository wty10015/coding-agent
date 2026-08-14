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

## 接下来

下一次开发会加入面向代码仓库的只读检查能力，包括文件列表、文件读取和文本搜索。

每个阶段的完成记录见 [ROADMAP.md](ROADMAP.md)。

## 许可证

本项目采用 [MIT License](LICENSE)。
