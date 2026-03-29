# 🦞 ClawSquad v2.6

> Multi-Agent AI Worker Orchestration Framework

**ClawSquad** enables parallel coordination of multiple AI workers (Claude Code, Codex, Gemini CLI, etc.) for complex software engineering tasks. It provides intelligent task routing, role-based specialization, and visual monitoring via tmux.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)
[![tmux](https://img.shields.io/badge/tmux-ready-blue.svg)](https://github.com/tmux/tmux)
[![Multi-Agent](https://img.shields.io/badge/Multi--Agent-Orchestration-purple.svg)](https://arxiv.org/abs/2401.12345)

**Key Features:**
- 🤖 25+ specialized AI roles
- 🖥️ Multi-CLI support (Claude/Codex/Gemini)
- 📊 Real-time tmux visualization
- 🔄 Auto role assignment
- 🎯 Debate meeting mode

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

## 🤖 Role → Model Mapping (25 roles)

### 🔧 Engineering (8)
| Role | Default CLI | Rationale |
|------|-----|-------|-----------|
| **architect** | claude | Complex reasoning, long-horizon planning |
| **coder** | claude | Engineering-grade code generation |
| **coder-alt** | codex | Alternative model for diverse solutions |
| **debugger** | claude | Deep analysis, terminal tools |
| **devops** | claude | Fast execution, parallel ops |
| **security** | claude | Deep security analysis |
| **performance** | claude | Deep optimization analysis |
| **refactorer** | claude | Code quality and restructuring |

### 🔬 Research & Analysis (4)
| Role | Default CLI | Rationale |
|------|-----|-------|-----------|
| **researcher** | gemini | 256k context, parallel scraping |
| **analyst** | claude | Data analysis and insights |
| **planner** | claude | Task planning and scheduling |
| **advisor** | claude | Strategic recommendations |

### ✅ Quality & Process (5)
| Role | Default CLI | Rationale |
|------|-----|-------|-----------|
| **reviewer** | claude | Code quality and review (auto-added) |
| **tester** | codex | Test generation |
| **qa** | claude | Quality assurance |
| **tech-writer** | claude | Documentation |
| **pm** | claude | Product management |

### 🎭 Meta & Debate (7) ← 特色
| Role | Default CLI | Rationale |
|------|-----|-------|-----------|
| **critic** | claude | Challenges assumptions |
| **devils-advocate** | claude | Argues against consensus |
| **optimist** | claude | Focuses on benefits |
| **pessimist** | claude | Focuses on risks |
| **synthesizer** | claude | Integrates perspectives |
| **facilitator** | claude | Meeting moderation |
| **guardian** | claude | Boundary checking (auto-added) |

### 🛠️ Utility (1)
| Role | Default CLI | Rationale |
|------|-----|-------|-----------|
| **explorer** | claude | Code exploration |

> **Note:** The `utility` role is reserved for future tool integrations.

---

## 💡 Task → Role Auto-Mapping

Each task automatically infers required roles:

| Task Keywords | Inferred Roles | Auto-Added |
|---------------|----------------|------------|
| implement/build/create | architect + coder | reviewer + guardian |
| debug/fix | debugger + reviewer | guardian |
| optimize/refactor | performance + refactorer | reviewer |
| deploy | devops + architect | reviewer |
| security/audit | security + architect | reviewer + guardian |
| research/survey | researcher + analyst | - |
| analyze | analyst + researcher | guardian |
| review | reviewer + critic | guardian |
| test | tester + qa | reviewer |
| discuss/debate | facilitator + optimist + pessimist + critic | synthesizer |

> **Note:** `reviewer` and `guardian` are **mandatory** for every task.

---

## 🎙️ Debate Meeting Mode ← 核心特色

CEO can convene a debate meeting for team discussion:

```
CEO triggers: "debate the microservices architecture?"
       ↓
┌─────────────────────────────────────────────────┐
│            Debate Meeting                        │
│                                                  │
│  Facilitator: "Round 1 - opening statements"     │
│                                                  │
│  Optimist: "Microservices enable independent..." │
│  Pessimist: "But adds complexity..."            │
│  Critic: "The proposal has XX issues..."         │
│  Devils-Advocate: "I oppose because..."          │
│                                                  │
│  ... (3 rounds by default)                       │
│                                                  │
│  Synthesizer: "Based on all perspectives..."     │
│  Final verdict → CEO makes decision              │
└─────────────────────────────────────────────────┘
```

**Trigger phrases:** "debate...", "discuss pros/cons", "hold a meeting...", "team evaluation"

---

## 🔄 Execute → Review → Improve Workflow

Every task follows this mandatory flow:

```
1. Execute   → Worker team completes assigned tasks
2. Review    → reviewer: quality checks | guardian: boundary checks
3. Improve   → Coder addresses review feedback
4. Done      → Final output with all improvements incorporated
```

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/shidu110/claw-squad.git
cd claw-squad
npm install
```

### 2. Prerequisites

| Requirement | Version | Description |
|------------|---------|-------------|
| Node.js | 18+ | JavaScript runtime |
| npm | 10+ | Package manager |
| tmux | 3.0+ | Terminal multiplexer (optional, for visual mode) |

#### Install tmux (optional):

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install tmux
```

**macOS:**
```bash
brew install tmux
```

**Windows (WSL2):**
```bash
sudo apt install tmux
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

### Model Provider Configuration

ClawSquad supports multiple AI model providers. Configure your preferred provider:

#### MiniMax (Recommended for Chinese models)

```bash
# Set your MiniMax API key
export MINIMAX_API_KEY="your-minimax-api-key"
```

#### SiliconFlow (Alternative)

```bash
# Set your SiliconFlow API key
export SILICONFLOW_API_KEY="your-siliconflow-api-key"
```

#### Anthropic (Claude)

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### CLI Tools Setup

#### Claude CLI (Recommended)

```bash
npm install -g @anthropic-ai/claude-code
```

#### Codex CLI (Optional)

```bash
npm install -g @openai/codex@0.57.0
```

#### Gemini CLI (Optional)

```bash
npm install -g @google/gemini-cli
```

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

## 🔍 Troubleshooting

### Bridge Server Won't Start

```
Error: port already in use
```

**Solution:**
```bash
# Find and kill existing process
lsof -i :9876 | grep LISTEN
kill <PID>
```

### tmux Mode Not Creating Windows

```
Error: tmux: unknown command
```

**Solution:**
```bash
# Install tmux
sudo apt install tmux

# Or set sudo permissions for tmux
echo 'shidu10 ALL=(ALL) NOPASSWD: /usr/bin/tmux' | sudo tee /etc/sudoers.d/shidu10-tmux
```

### API Key Not Found

```
Error: MINIMAX_API_KEY is not set
```

**Solution:**
```bash
# Add to your shell profile (~/.bashrc or ~/.zshrc)
export MINIMAX_API_KEY="your-api-key"

# Reload profile
source ~/.bashrc
```

### Worker Spawn Fails

```
Error: Worker exited with code 1
```

**Solution:**
- Check if the CLI tool (claude/codex/gemini) is installed
- Verify API key is valid
- Check worker logs in tmux windows

### Memory Issues

If workers are consuming too much memory:

```bash
# Enable worker pool for reuse
export CLAWSQUAD_POOL=1
export CLAWSQUAD_POOL_MAX=2
```

---

## 💡 Example Use Cases

### 1. Code Review Team

```javascript
// Spawn a review team
coordinate_team({
  roles: ['architect', 'reviewer', 'guardian'],
  task: 'Review the new authentication module'
})
```

### 2. Full-Stack Development

```javascript
// Backend + Frontend + QA
coordinate_team({
  roles: ['architect', 'coder', 'tester', 'reviewer'],
  task: 'Implement user login feature'
})
```

### 3. Bug Investigation

```javascript
// Debug team
coordinate_team({
  roles: ['debugger', 'security', 'reviewer'],
  task: 'Investigate memory leak in production'
})
```

### 4. Architecture Decision

```javascript
// Start a debate
start_debate({
  topic: 'Microservices vs Monolith',
  participants: ['architect', 'critic', 'optimist', 'pessimist', 'synthesizer']
})
```

---

## 📈 Performance Tips

1. **Use Worker Pool** - Pre-spawn idle workers for faster task startup
2. **Enable tmux Mode** - Monitor worker activity in real-time
3. **Set Appropriate Limits** - Don't spawn too many workers at once
4. **Use Role Auto-Mapping** - Let the system infer optimal role combinations

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

Contributions are welcome! Here's how to get started:

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/claw-squad.git
cd claw-squad

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/your-feature

# Make your changes and test
npm test

# Commit and push
git commit -m 'feat: add your feature'
git push origin feature/your-feature
```

### Code Style

- Use ESLint for linting
- Follow existing code conventions
- Add tests for new features
- Update documentation

### Reporting Issues

- Check existing issues before creating new ones
- Provide reproduction steps
- Include system information (OS, Node.js version, etc.)

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file

---

## 🔗 Related Projects

- [OpenClaw](https://github.com/openclaw/openclaw) - The AI agent platform ClawSquad runs on
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - Primary CLI for coding agents
- [OpenAI Codex](https://platform.openai.com/docs/codex) - Code generation CLI
- [Superpowers](https://github.com/obra/superpowers) - Claude Code skills framework
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) - Multi-agent orchestration for Claude Code

---

## 🌍 Ecosystem

```
ClawSquad (Multi-Agent Orchestration)
    ├── OpenClaw (Agent Platform)
    │   ├── MCP Protocol
    │   └── Multi-Model Support
    ├── Claude Code / Codex / Gemini CLI
    │   └── Skills & Plugins
    └── SiliconFlow / MiniMax / Anthropic
        └── AI Model Providers
```

---

<p align="center">
  <strong>ClawSquad</strong> - Multi-Agent Orchestration for Complex Tasks
</p>
