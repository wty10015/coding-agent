# Coding Agent 开发记录

## 2026-08-13

今天完成项目初始化：创建 Git 仓库、补充 MIT 许可证、整理 README，并配置 Python 开发过程中需要忽略的本地文件。

## 2026-08-14

今天完成可安装的命令行包：通过 `pico` 或 `python -m pico` 可以查看帮助，并在不调用模型的情况下检查 Provider 配置。

为 DeepSeek、OpenAI 兼容、Anthropic 兼容和 Ollama 保留了统一配置入口；`.env.example` 只提供字段和示例地址，不包含真实凭据。开发依赖已锁定，并补上命令行与配置脱敏测试。

## 2026-08-15

今天加入工作区边界、文件列表、文件读取和文本搜索。三个命令只解析 `--cwd` 指定的目录；越界路径、指向边界外的符号链接、`.env` 和本地运行目录都会被拒绝或跳过，二进制和过大文件不会被读取。

可用 `pico --cwd <仓库路径> --list-files` 查看文件，使用 `--read-file <路径>` 读取行号范围，或用 `--search <文本>` 搜索 UTF-8 文本。实现与测试保持独立于模型调用和后续 runtime。

## 2026-08-16

今天加入受控变更模块。`write_file` 和 `patch_file` 经过 approval policy 后才会执行，并且使用原子替换写入；路径越界、最终文件或父目录中的符号链接都会被拒绝。

`run_shell` 只接收参数数组，不通过 shell 解释命令。它先拦截 shell 解释器、删除、格式化和高风险 Git 命令，再要求 approval callback 显式批准；运行时只传递必要的系统环境变量。这是本地策略边界，不替代操作系统级隔离。

## 2026-08-17

今天加入本地 session、task state、trace 和 report 存储。所有 session、task 和 run ID 都经过格式校验；JSON 通过临时文件和原子替换落盘，`.pico` 目录会校验仍在工作区内。

trace 与 report 会遮蔽常见的 API key、token、password、cookie 和 Authorization 字段。这一阶段只提供数据工件，不包含任务恢复或模型执行循环。

## 下一次

1. 加入有边界的 agent 执行循环。
2. 继续完善会话恢复、上下文管理和评测。

后续会随着每天实际完成的内容更新这份记录。
