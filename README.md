# 🦞 ClawSquad v2.6

> 多智能体 AI Worker 编排框架

**ClawSquad** 支持多 AI Worker（Claude Code、Codex、Gemini CLI 等）的并行协作，可完成复杂软件工程任务。提供智能任务路由、角色化专业分工，以及基于 tmux 的可视化监控。

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)
[![tmux](https://img.shields.io/badge/tmux-ready-blue.svg)](https://github.com/tmux/tmux)
[![Multi-Agent](https://img.shields.io/badge/Multi--Agent-Orchestration-purple.svg)](https://arxiv.org/abs/2401.12345)

**核心特性：**
- 🤖 25+ 专业 AI 角色
- 🖥️ 多 CLI 支持（Claude/Codex/Gemini）
- 📊 实时 tmux 可视化
- 🔄 自动角色分配
- 🎯 辩论会议模式

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| **多 Worker 协作** | 并行生成和管理多个 AI Worker |
| **角色化专业分工** | Architect、Coder、Reviewer、Tester — 每个角色匹配最优模型 |
| **可视化监控** | 集成 tmux，实时查看 Worker 输出 |
| **多模型支持** | MiniMax、Kimi-K2.5、GLM-5 — 不同任务匹配不同模型 |
| **Worker 池** | 预启动空闲 Worker，降低延迟 |
| **优雅关闭** | SIGTERM/SIGINT 时自动清理 Worker |
| **自动重连** | Bridge Server 断开后自动恢复 |
| **Prometheus 监控** | 内置指标收集 |
| **MCP 集成** | 作为 MCP Server 接入 OpenClaw |

---

## 🏗️ 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw (CEO)                               │
│              编排层（由你控制）                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP stdio
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Bridge (v2.6)                              │
├─────────────────────────────────────────────────────────────────┤
│  • 任务协调 (coordinate_team)                                    │
│  • Worker 自动生成 + 状态追踪                                    │
│  • Worker 池（预启动空闲 Worker）                                │
│  • 待处理请求超时清理                                            │
│  • Bridge Server 自动重连                                        │
│  • 优雅关闭                                                     │
│  • Prometheus 指标                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ TCP (port 9876)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bridge Server (TCP Hub)                        │
├─────────────────────────────────────────────────────────────────┤
│  • CEO ↔ Worker 消息路由                                        │
│  • Worker 注册（角色、能力）                                     │
│  • 任务跟踪（activeTasks Map）                                 │
│  • 辩论会话（start_debate）                                     │
│  • 状态广播                                                     │
└──────┬─────────────────┬──────────────────┬──────────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  architect  │   │    coder   │   │   reviewer  │
│   (GLM-5)  │   │   (GLM-5)  │   │  (Kimi-K2)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 🤖 角色 → 模型 映射（25 个角色）

### 🔧 工程类（8 个）

| 角色 | 默认 CLI | 选型理由 |
|------|---------|---------|
| **architect** | claude | 复杂推理、长周期规划 |
| **coder** | claude | 工程级代码生成 |
| **coder-alt** | codex | 多样化解法 |
| **debugger** | claude | 深度分析、终端工具 |
| **devops** | claude | 快速执行、并行操作 |
| **security** | claude | 深度安全分析 |
| **performance** | claude | 深度优化分析 |
| **refactorer** | claude | 代码质量与重构 |

### 🔬 研究与分析（4 个）

| 角色 | 默认 CLI | 选型理由 |
|------|---------|---------|
| **researcher** | gemini | 256k 上下文、并行抓取 |
| **analyst** | claude | 数据分析与洞察 |
| **planner** | claude | 任务规划与调度 |
| **advisor** | claude | 技术选型与决策建议 |

### 🏛️ 质量与流程（7 个）

| 角色 | 默认 CLI | 选型理由 |
|------|---------|---------|
| **reviewer** | kimi | 快速代码审查 |
| **tester** | claude | 测试用例生成 |
| **qa** | kimi | 质量保证 |
| **guardian** | claude | 边界与风险检查 |
| **tech-writer** | kimi | 文档撰写 |
| **pm** | claude | 项目管理与协调 |
| **facilitator** | claude | 会议主持与推进 |

### 🎭 元类与辩论（7 个）

| 角色 | 默认 CLI | 选型理由 |
|------|---------|---------|
| **critic** | claude | 质疑挑战假设 |
| **devils-advocate** | claude | 反驳共识 |
| **optimist** | claude | 关注收益 |
| **pessimist** | claude | 关注风险 |
| **synthesizer** | claude | 综合归纳 |
| **facilitator** | claude | 推进讨论 |
| **guardian** | claude | 边界风险 |

---

## 🎙️ 辩论会议模式 ← 核心特色

CEO 可召集团队进行辩论会议：

```
CEO 触发："debate the microservices architecture?"
       ↓
┌─────────────────────────────────────────────────┐
│            辩论会议                               │
│                                                  │
│  Facilitator: "Round 1 - 开场陈述"               │
│                                                  │
│  Optimist: "微服务实现独立部署..."                │
│  Pessimist: "但增加了复杂度..."                  │
│  Critic: "方案有XX个问题..."                      │
│  Devils-Advocate: "我反对是因为..."              │
│                                                  │
│  ...（默认 3 轮）                                │
│                                                  │
│  Synthesizer: "综合各方观点..."                   │
│  最终裁决 → CEO 决策                             │
└─────────────────────────────────────────────────┘
```

**触发词：** "debate..."、"discuss pros/cons"、"hold a meeting..."、"team evaluation"

---

## 🔄 执行 → 审查 → 改进 工作流

每个任务遵循强制流程：

```
1. 执行   → Worker 团队完成任务
2. 审查   → reviewer 质量检查 | guardian 边界检查
3. 改进   → Coder 处理审查反馈
4. 完成   → 最终输出，包含所有改进
```

---

## 🚀 快速开始

### 1. 安装

```bash
git clone https://github.com/shidu110/claw-squad.git
cd claw-squad
```

### 2. 配置 API Keys

| 提供商 | 环境变量 | 获取地址 |
|--------|---------|---------|
| MiniMax | `MINIMAX_API_KEY` | platform.minimaxi.com |
| SiliconFlow | `SILICONFLOW_API_KEY` | console.siliconflow.cn |
| Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com |

### 3. 一键启动（Docker）

```bash
docker-compose up -d
```

### 4. 手动启动

```bash
# 终端 1: 启动 Bridge Server
cd claw-squad-cli
npm run start:bridge

# 终端 2: 启动 Orchestrator
npm run start:orchestrator
```

---

## 📁 目录结构

```
claw-squad/
├── claw-squad-core/      # 核心：CEO Brain、Team Factory、角色配置
├── claw-squad-cli/        # CLI：Bridge Server、MCP Bridge、Orchestrator
├── claw-squad-backend/    # 后端：API、状态管理
├── claw-squad-mcp/        # MCP Server：OpenClaw 集成
├── claw-squad-ui/         # Web UI（可选）
├── examples/              # 示例任务
└── tests/                # 测试套件
```

---

## 🛠️ API Keys 配置（Claude CLI）

编辑 `~/.claude/settings.json`：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.minimaxi.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "your-minimax-api-key",
    "ANTHROPIC_MODEL": "MiniMax-M2.7"
  }
}
```

---

## 📊 路线图

- [x] 多 Worker 并行协作
- [x] 角色化专业分工
- [x] tmux 可视化
- [x] 辩论会议模式
- [x] Worker 池
- [x] Prometheus 监控
- [x] MCP Bridge 集成
- [ ] Web UI 面板
- [ ] GitHub Actions 集成
- [ ] 多团队协调

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 License

MIT
