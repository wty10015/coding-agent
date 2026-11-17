# Coding Agent

这是我主导开发的 AI 辅助编程项目。我在现有源码和可复现构建基础上，整理出一个面向终端的 Coding Agent：它能够理解项目上下文，调用模型完成多轮任务，并通过工具读取、修改和验证代码。

项目适合用于学习和实践 Coding Agent 的完整工程链路，包括上下文管理、工具调用、会话记录、权限控制、MCP 集成、任务编排和终端交互。我负责项目定位、结构整理、实现取舍、代码审阅与验证，AI 只作为开发辅助。

## 主要能力

- 交互式终端会话和非交互式脚本模式
- JSON、NDJSON 和流式输出，便于接入自动化流程
- 文件编辑、命令执行、搜索、会话恢复与分支会话
- 权限模式、工具选择、任务列表和可取消的后台事件流
- MCP 工具定义、工具发现、工具调用及 SDK 查询适配
- 本地夹具驱动的核心 coding 流程验证

## 目录结构

```text
agent/
├─ sourcecode/   # TypeScript 源码、构建脚本和验证套件
├─ docs/         # 架构、模块和实现说明
└─ runtime/      # 随包运行材料与许可文件
```

## Windows 安装与验证

需要安装 Node.js 和 npm。下面的命令会临时使用固定版本的 Bun，不要求全局安装 Bun：

```powershell
git clone https://github.com/wty10015/coding-agent.git
$source = (Resolve-Path .\coding-agent\agent\sourcecode).Path
cd $source
npm exec --yes --package=bun@1.4.4 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.4.4 -- bun run verify
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --version
npm exec --yes --package=bun@1.4.4 -- bun .\dist\cli.js --help
```

`verify` 会构建 CLI，运行源码测试，并检查源码依赖的模块解析。测试使用本地模型夹具，不发送真实模型请求。使用真实服务时，请在本机配置凭证，不要将密钥或个人配置提交到仓库。

## 开发方式

我以源码和可复现构建为主线推进项目：先阅读现有实现，再进行小范围改动，通过测试和实际运行结果确认行为，最后提交可追溯的变更。架构和模块说明位于 [`agent/docs`](agent/docs)，源码与脚本位于 [`agent/sourcecode`](agent/sourcecode)。

## 许可

运行材料中的许可和版权声明保留在 [`agent/runtime`](agent/runtime)。使用、修改和再发布前，请阅读其中的完整条款，并遵守依赖包各自的许可要求。
