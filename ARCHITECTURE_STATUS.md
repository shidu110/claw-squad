# ClawSquad 架构状态报告
## v2.5.0 | 2026-03-29

---

## 已完成 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| Bridge Server | ✅ | TCP Hub，消息路由 |
| MCP Bridge | ✅ | OpenClaw ↔ Bridge Server |
| Session 管理 | ✅ | 创建/列表/重置 |
| 进度通知 | ✅ | Progress notifications |
| 任务取消 | ✅ | cancel_task, cancel_all |
| Worker Cancel 处理 | ✅ | Orchestrator kill 进程 |
| **自动 Spawn Worker** | ✅ | **MCP Bridge 直接 spawn** |
| 26 角色定义 | ✅ | Engineering/Research/Meta/Utility |
| Execute→Review→Improve | ✅ | CEO Brain 三阶段 |
| 辩论会议结构 | ✅ | facilitator + 参与者 |

---

## v2.5 架构图

```
OpenClaw (用户)
    ↓ MCP stdio
┌─────────────────────────────────────────────────────┐
│ MCP Bridge (v2.5)                                   │
│  • 任务协调 (coordinate_team)                        │
│  • Worker 自动 spawn (getOrCreateWorker)            │
│  • Session 管理                                     │
│  • 进度通知                                         │
└────────────────────┬────────────────────────────────┘
                     │ TCP (Bridge Server)
                     ↓
┌─────────────────────────────────────────────────────┐
│ Bridge Server (TCP Hub)                             │
│  • 消息路由 (CEO ↔ Worker)                         │
│  • 任务追踪 (activeTasks)                          │
│  • 取消处理                                         │
└────┬────────────┬───────────────────────────────┬────┘
     │            │                               │
     ↓            ↓                               ↓
┌─────────┐ ┌──────────┐ ┌──────────────┐
│ coder-1 │ │ tester-2 │ │ reviewer-3  │
│(spawned)│ │(spawned) │ │ (spawned)    │
└─────────┘ └──────────┘ └──────────────┘
     │            │               │
     ↓            ↓               ↓
Claude Code   Codex CLI      Claude Code
```

---

## 消息流

### 1. coordinate_team (自动 Spawn)
```
用户 → MCP Bridge: coordinate_team { roles: ["coder", "reviewer"] }
                                    ↓
                    getOrCreateWorker("coder") → spawn Claude Code
                    getOrCreateWorker("reviewer") → spawn Claude Code
                                    ↓
                    Bridge Server: 任务路由到 coder-1, reviewer-2
```

### 2. cancel_all_tasks
```
用户 → MCP Bridge: cancel_all_tasks
                   ↓
        Bridge Server: cancel_all (取消所有任务)
                   ↓
        MCP Bridge: killAllWorkers() (Kill 所有 CLI 进程)
                   ↓
        返回: "✓ Cancelled N tasks, Killed M workers"
```

---

## 核心文件

```
ClawSquad/
├── claw-squad-mcp/bridge.cjs        # v2.5 ✅ (自动 spawn)
├── claw-squad-cli/bridge-server.cjs # v2.5 ✅ (TCP Hub)
├── claw-squad-cli/orchestrator.ts   # v2.1 ✅ (CLI 工具)
├── claw-squad-core/ceo-brain.ts      # v2.2 ✅ (CEO 逻辑)
└── ARCHITECTURE_STATUS.md           # 本文件
```

---

## 待完成 (非紧急)

| 功能 | 优先级 | 说明 |
|------|--------|------|
| CEO Brain debate 逻辑 | P1 | 辩论会议真正执行 |
| Worker 池 (预启动) | P2 | 性能优化 |
| Worker 生命周期管理 | P2 | 重连、状态监控 |
| MCP Bridge ↔ Bridge Server 重连 | P2 | 网络恢复 |

---

## 使用方式

### 启动
```bash
# 1. 启动 Bridge Server
cd /home/shidu10/ClawSquad/claw-squad-cli
node bridge-server.cjs --port=9876

# 2. MCP Bridge (通过 OpenClaw 自动调用)
# 不需要手动启动，由 OpenClaw 管理
```

### 通过 OpenClaw 使用
```
用户: "用 ClawSquad 实现 REST API"

OpenClaw → MCP Bridge:
  coordinate_team({
    task: "实现 REST API",
    roles: ["architect", "coder", "reviewer", "guardian"]
  })

MCP Bridge:
  → 自动 spawn architect-1 (Claude)
  → 自动 spawn coder-1 (Claude)
  → 自动 spawn reviewer-1 (Claude)
  → 自动 spawn guardian-1 (Claude)
  → 通过 Bridge Server 分发任务
```
