# 🦞 ClawSquad v2.6

> Multi-Agent AI Worker Orchestration Framework

**ClawSquad** enables parallel coordination of multiple AI workers (Claude Code, Codex, etc.) for complex software engineering tasks. It provides intelligent task routing, role-based specialization, and visual monitoring via tmux.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Multi-Worker Coordination** | Spawn and manage multiple AI workers in parallel |
| **Role-Based Specialization** | Architect, Coder, Reviewer, Tester - each with optimized model assignment |
| **Visual Monitoring** | tmux integration for real-time worker output visibility |
| **Multi-Model Support** | MiniMax, Kimi-K2.5, GLM-5 - different models for different tasks |
| **Worker Pool** | Pre-spawned idle workers for reduced latency |
| **Graceful Shutdown** | Clean worker cleanup on SIGTERM/SIGINT |
| **Auto-Reconnect** | Bridge Server disconnection recovery |
| **Prometheus Metrics** | Built-in metrics for monitoring |
| **MCP Integration** | Works as an MCP server for OpenClaw |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw (CEO)                               │
│              Orchestration Layer (You)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP stdio
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Bridge (v2.6)                              │
├─────────────────────────────────────────────────────────────────┤
│  • Task coordination (coordinate_team)                           │
│  • Worker auto-spawn + state tracking                           │
│  • Worker Pool (pre-spawned idle workers)                       │
│  • Pending request timeout cleanup                              │
│  • Bridge Server auto-reconnect                                 │
│  • Graceful shutdown                                             │
│  • Prometheus metrics                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ TCP (port 9876)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bridge Server (TCP Hub)                        │
├─────────────────────────────────────────────────────────────────┤
│  • CEO ↔ Worker message routing                                 │
│  • Worker registration (role, capabilities)                     │
│  • Task tracking (activeTasks Map)                             │
│  • Debate sessions (start_debate)                              │
│  • Status broadcast                                             │
└──────┬─────────────────┬──────────────────┬──────────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  architect  │   │    coder   │   │   reviewer  │
│   (GLM-5)   │   │   (GLM-5)  │   │  (Kimi-K2)  │
└─────────────┘   └─────────────┘   └─────────────┘
       │                 │                  │
       └─────────────────┴──────────────────┘
                    tmux mode: workers in windows
```

---

## 🤖 Role → Model Mapping

| Role | Model | Rationale |
|------|-------|-----------|
| **architect** | GLM-5 | Complex reasoning, long-horizon planning |
| **coder** | GLM-5 | Engineering-grade code generation |
| **reviewer** | Kimi-K2.5 | Parallel multi-task review |
| **tester** | Kimi-K2.5 | Parallel test generation |
| **researcher** | Kimi-K2.5 | 256k context, parallel scraping |
| **debugger** | GLM-5 | Deep analysis, terminal tools |
| **security** | GLM-5 | Deep security analysis |
| **performance** | GLM-5 | Deep optimization analysis |
| **devops** | Kimi-K2.5 | Fast execution, parallel ops |
| **default** | MiniMax | General tasks |

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/clawsquad/claw-squad.git
cd claw-squad
npm install
```

### 2. Start Bridge Server

```bash
# Terminal 1: Start Bridge Server
node claw-squad-cli/bridge-server.cjs --port=9876
```

### 3. Start MCP Bridge

```bash
# Terminal 2: Start MCP Bridge (connects to Bridge Server)
node claw-squad-mcp/bridge.cjs --port=9876
```

### 4. Use with OpenClaw

Configure in your OpenClaw `openclaw.json`:

```json
{
  "mcpServers": {
    "clawsquad": {
      "command": "node",
      "args": ["/path/to/claw-squad/claw-squad-mcp/bridge.cjs"],
      "env": {
        "BRIDGE_HOST": "127.0.0.1",
        "BRIDGE_PORT": "9876"
      }
    }
  }
}
```

### 5. tmux Mode (Visual Monitoring)

```bash
CLAWSQUAD_TMUX=1 node claw-squad-mcp/bridge.cjs --port=9876
```

Workers will spawn in tmux windows for real-time monitoring.

---

## 📋 Available Tools

| Tool | Description |
|------|-------------|
| `coordinate_team` | Spawn a team of workers by role |
| `send_task` | Send task to specific worker |
| `broadcast` | Broadcast message to all workers |
| `get_workers` | List all active workers |
| `get_active_tasks` | List running tasks |
| `cancel_task` | Cancel specific task |
| `cancel_all_tasks` | Cancel all tasks |
| `start_debate` | Start a debate session |
| `get_metrics` | Prometheus-style metrics |
| `create_session` | Create session |
| `list_sessions` | List sessions |
| `reset_session` | Reset session |

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAWSQUAD_TMUX` | - | Set to `1` for tmux mode |
| `CLAWSQUAD_POOL` | - | Set to `1` to enable worker pool |
| `CLAWSQUAD_POOL_MIN` | `1` | Min idle workers per role |
| `CLAWSQUAD_POOL_MAX` | `3` | Max idle workers per role |
| `BRIDGE_HOST` | `127.0.0.1` | Bridge Server host |
| `BRIDGE_PORT` | `9876` | Bridge Server port |

### Multi-Bridge Cluster

```bash
# Start cluster manager (manages multiple Bridge instances)
node claw-squad-cli/bridge-cluster-manager.cjs --config=claw-squad-cli/bridge-cluster-config.js
```

---

## 📊 Metrics

```
=== ClawSquad Metrics ===
Uptime: 45s
Tasks: 12 completed, 0 failed
Workers: 5 spawned, 2 killed
Active: 2 busy, 3 idle
Pool: 1 pooled workers
Pending: 0 requests
Timeouts: 0 timed out
Reconnects: 0 attempts
```

---

## 🧪 Testing

```bash
# Run stress test
node stress-test.cjs
```

---

## 📁 Project Structure

```
claw-squad/
├── claw-squad-mcp/          # MCP Bridge (OpenClaw ↔ Bridge Server)
│   └── bridge.cjs           # Main MCP bridge with worker management
├── claw-squad-cli/          # CLI tools
│   ├── bridge-server.cjs    # TCP Hub (CEO ↔ Worker routing)
│   ├── bridge-cluster-manager.cjs  # Multi-bridge cluster
│   └── tmux-backend.cjs     # tmux integration
├── claw-squad-core/          # Core logic
│   ├── ceo-brain.ts         # CEO decision logic
│   ├── role-config.ts       # Role definitions
│   └── team-factory.ts      # Team/Agent management
├── claw-squad-api/          # API definitions
├── claw-squad-ui/           # UI components
└── stress-test.cjs          # Load testing
```

---

## 🛡️ Architecture Highlights

### Memory Leak Prevention
- `pendingRequestCreatedAt` Map tracks request age
- setInterval cleanup every 30s for requests > 60s old

### Fault Tolerance
- Bridge Server auto-reconnect with exponential backoff
- Max 10 reconnect attempts
- Worker health monitoring

### Graceful Shutdown
- SIGTERM/SIGINT handling
- Wait for active tasks (max 10s)
- Clean resource cleanup

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'feat: add amazing'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file

---

## 🔗 Related

- [OpenClaw](https://github.com/openclaw/openclaw) - The AI agent platform ClawSquad runs on
- [Absorbi](https://github.com/your-repo/absorbi) - Self-evolving AI framework

---

<p align="center">
  <strong>ClawSquad</strong> - Multi-Agent Orchestration for Complex Tasks
</p>
