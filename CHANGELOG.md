# 变更记录

我按实际开发日记录公开仓库中的可安装能力、评测证据和文档变化。未公开的本地实验、运行工件和私有资料不属于本文件。

## 0.2.0-alpha.1（准备中）

当前包版本为 `0.2.0a1`。我已经完成发布材料和离线验证，待 CI 全绿后创建 `v0.2.0-alpha.1` tag 与 GitHub Release。

### 新增

- 我接入了 CLI、Pico runtime、有界 Agent loop、四类 Provider client、工作区工具、approval policy、session、task state、checkpoint、resume、working memory、durable memory 和 run artifacts。
- 我加入了固定 benchmark、fixture、离线 FakeModelClient 评测、上下文/记忆/恢复对照实验及脱敏结果归档。
- 我补齐了 Provider 配置、安全边界、评测复现和 Alpha 使用说明。

### 兼容性与限制

- 我保留 `v0.1.0` tag 与 Release，不改写已发布历史；该版本只代表早期 CLI、Provider 配置和只读工作区能力。
- 工作区边界、工具白名单和 approval policy 属于应用层保护，不构成 OS 级隔离。
- Provider 配置、命令参数、本地存储格式和 Alpha API 仍可能调整。
- 默认测试和 CI 使用 FakeModelClient、fixture 与 mock，不读取真实凭据，也不联网调用 Provider。

## 0.1.0（已发布）

`v0.1.0` 是我保留的早期 Alpha 公开记录，提供可安装 CLI、四类 Provider 配置、只读工作区检查、独立安全与状态模块、`mini-pico` 示例和 GitHub Actions 质量矩阵。它不包含当前完整 Agent runtime，也不代表真实模型质量或端到端 Agent 成功率。
