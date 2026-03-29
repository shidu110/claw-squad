# ClawSquad v2.0 Quick Start

## 一键启动 (Docker)

```bash
docker-compose up -d
```

## 手动启动

### 1. 启动 Bridge Server
```bash
cd claw-squad-cli
npm run start:bridge
# 输出: Bridge Server 启动 port=9876
```

### 2. 启动 Orchestrator (另一个终端)
```bash
cd claw-squad-cli
npm run start:orchestrator
# 输出: ClawSquad CLI Orchestrator v2.0
```

### 3. 验证连接
```bash
# 测试 Bridge Server
echo '{"type":"status"}' | nc localhost 9876
# 预期: {"type":"status","workers":0,"ceoConnected":false}
```

## OpenClaw 集成

### 安装 CLI 工具
```bash
# Claude Code
npm install -g @anthropic-ai/claude-code

# Codex
npm install -g @openai/codex

# OpenCode
npm install -g opencode

# Gemini
npm install -g @google/gemini-cli
```

### 配置 openclaw.json
```json
{
  "mcpServers": {
    "clawsquad": {
      "command": "node",
      "args": ["claw-squad-mcp/bridge.js"]
    }
  }
}
```

### 使用 CEO 模式
```
用户: "用两种方式实现排序，对比性能"

OpenClaw (CEO):
  1. 分解 → [快速排序, 归并排序]
  2. Team A: Claude → 快速排序
  3. Team B: Codex → 归并排序
  4. Referee 评分 → 输出 Winner
```

## API Keys

| Provider | 环境变量 | 获取地址 |
|----------|---------|---------|
| Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com |
| OpenAI | `OPENAI_API_KEY` | platform.openai.com |
| Google | `GOOGLE_API_KEY` | aistudio.google.com |

```bash
# 设置 API Keys
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

## 故障排除

### Bridge Server 端口占用
```bash
lsof -i :9876
kill <PID>
```

### Worker 连接不上
```bash
# 检查 Bridge Server 状态
echo '{"type":"status"}' | nc localhost 9876
```

### MCP Bridge 连接失败
```bash
# 确认 Bridge Server 运行中
ps aux | grep bridge-server
```
