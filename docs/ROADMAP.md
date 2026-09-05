# Coding Agent 路线图

我按实际开发日推进公开仓库，每个工作日只提交一个已经完成并验证过的主题。

## 已完成

- [x] `v0.1.0`：发布可安装 CLI、Provider 配置和只读工作区检查。
- [x] `v0.2.0a1` 运行时：接入 Pico runtime、有界 Agent loop、四类 Provider、工具白名单、审批、session、任务状态、checkpoint、resume、memory 和 run artifacts。
- [x] `v0.2.0a1` 评测：加入固定 benchmark、fixture、FakeModelClient、上下文/记忆/恢复对照实验和脱敏结果。
- [x] `v0.2.0-alpha.1` 文档准备：补齐架构、Provider 配置、安全边界、Alpha 限制、变更记录和发布说明。

## 发布前检查

- [ ] 在 Python 3.10、3.11、3.12 的 GitHub Actions 上通过安装、测试、Ruff、CLI help 和公开评测检查。
- [ ] 复核公开文件不包含 `.env`、真实凭据、`.pico/`、缓存、虚拟环境、临时目录或私有资料。
- [ ] CI 全绿并完成发布前的 tag 与 Release 校验后，创建 annotated `v0.2.0-alpha.1` tag 和 GitHub Release。

## 后续方向

- 我会继续收集跨平台运行反馈，稳定 Provider 配置和错误提示。
- 我会在不牺牲工作区边界的前提下补充更多离线任务与回归场景。
- 我会根据实际使用反馈决定是否调整本地存储格式、工具协议和恢复 API。
