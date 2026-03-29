# ClawSquad v2.6 Architecture Status

**Last Updated:** 2026-03-29

---

## ✅ Completed Features

| Feature | Status | Since |
|---------|--------|-------|
| Bridge Server (TCP Hub) | ✅ Stable | v2.5 |
| MCP Bridge | ✅ Stable | v2.5 |
| Session Management | ✅ Stable | v2.5 |
| Progress Notifications | ✅ Stable | v2.5 |
| Task Cancellation | ✅ Stable | v2.5 |
| Auto Spawn Workers | ✅ Stable | v2.5 |
| 26 Role Definitions | ✅ Stable | v2.5 |
| tmux Backend | ✅ Stable | v2.6 |
| Worker Pool | ✅ Stable | v2.6 |
| Graceful Shutdown | ✅ Stable | v2.6 |
| Prometheus Metrics | ✅ Stable | v2.6 |
| Multi-Model Assignment | ✅ Stable | v2.6 |
| Bridge Cluster Manager | ✅ Stable | v2.6 |
| Auto-Reconnect | ✅ Stable | v2.6 |

---

## 🏗️ v2.6 Architecture

```
OpenClaw (CEO)
    ↓ MCP stdio
┌─────────────────────────────────────────────────────┐
│ MCP Bridge (v2.6)                                   │
│  ├─ Session Management (TTL 24h, max 100)          │
│  ├─ Worker Auto-Spawn + State Tracking              │
│  ├─ Worker Pool (CLAWSQUAD_POOL=1)                 │
│  ├─ Pending Request Timeout Cleanup                │
│  ├─ Bridge Server Auto-Reconnect                   │
│  ├─ Graceful Shutdown                              │
│  └─ Prometheus Metrics                             │
└────────────────────┬────────────────────────────────┘
                     │ TCP (port 9876)
                     ↓
┌─────────────────────────────────────────────────────┐
│ Bridge Server (TCP Hub)                             │
│  ├─ CEO ↔ Worker Message Routing                   │
│  ├─ Worker Registration                            │
│  ├─ Task Tracking                                  │
│  ├─ Debate Sessions                               │
│  └─ Status Broadcast                               │
└──────┬────────────┬───────────────────────┬──────────┘
       │            │                       │
       ↓            ↓                       ↓
┌───────────┐ ┌───────────┐          ┌───────────┐
│ Architect │ │  Coder    │          │ Reviewer  │
│  (GLM-5)  │ │  (GLM-5)  │          │(Kimi-K2)  │
└───────────┘ └───────────┘          └───────────┘
       │            │                       │
       └────────────┴───────────────────────┘
                    ↓
           tmux (optional): workers in windows
```

---

## 📁 Core Files

| File | Purpose |
|------|---------|
| `claw-squad-mcp/bridge.cjs` | MCP Bridge - OpenClaw ↔ Bridge Server |
| `claw-squad-cli/bridge-server.cjs` | TCP Hub - Message routing |
| `claw-squad-cli/bridge-cluster-manager.cjs` | Multi-bridge cluster |
| `claw-squad-cli/tmux-backend.cjs` | tmux integration |
| `claw-squad-core/ceo-brain.ts` | CEO decision logic |
| `claw-squad-core/role-config.ts` | Role definitions |
| `claw-squad-core/team-factory.ts` | Team/Agent lifecycle |

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAWSQUAD_TMUX` | - | Enable tmux mode |
| `CLAWSQUAD_POOL` | - | Enable worker pool |
| `CLAWSQUAD_POOL_MIN` | 1 | Min idle workers |
| `CLAWSQUAD_POOL_MAX` | 3 | Max idle workers |

### Role → Model Mapping

| Role | Model | CLI |
|------|-------|-----|
| architect | GLM-5 | claude-glm |
| coder | GLM-5 | claude-glm |
| reviewer | Kimi-K2.5 | claude-kimi |
| tester | Kimi-K2.5 | codex-kimi |
| researcher | Kimi-K2.5 | claude-kimi |
| debugger | GLM-5 | claude-glm |
| security | GLM-5 | claude-glm |
| devops | Kimi-K2.5 | claude-kimi |

---

## 📊 Metrics

Access via `get_metrics` tool:

```
Uptime, Tasks completed/failed
Workers spawned/killed, Active/Idle count
Pool size, Pending requests
Timeouts, Reconnect attempts
```

---

## 🚀 Git Log

```
f4f6275 feat(multi-model): assign different models to roles
809410c feat(cluster): multi-bridge cluster manager
8088098 feat(metrics): Prometheus-style metrics
507b9b4 feat(pool+shutdown): worker pool + graceful shutdown
dbc6e7c feat(v2.6): tmux backend
338bcac feat(v2.5): major architecture upgrade
```

---

## 📋 TODO

| Priority | Item | Status |
|----------|------|--------|
| P1 | Unit tests (Vitest) | Pending |
| P1 | Documentation website | Pending |
| P2 | Kubernetes deployment | Pending |
| P2 | Worker health dashboard | Pending |
| P3 | Horizontal scaling (multiple clusters) | Future |

---

## 🔗 Related

- [OpenClaw](https://github.com/openclaw/openclaw)
- [ClawHub](https://clawhub.ai)
