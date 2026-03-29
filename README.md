# ClawSquad v2.0

> Claw (OpenClaw) + Squad (多 CLI Agent 协作)
>
> CEO (OpenClaw) → 多 CLI Worker 竞争协作框架

## 核心能力

- **CEO Brain**: OpenClaw 作为大脑，分解任务、协调团队
- **Multi-CLI Workers**: Claude Code / Codex / OpenCode / Gemini 并行执行
- **Bridge Server**: Worker 间消息路由，支持 Team A vs Team B 对抗
- **Referee**: 方案对比、质量评分、胜者选择

## 架构图

```
用户 → CEO Brain (OpenClaw) → Team Factory
                                  ↓
                    ┌─────────────┴─────────────┐
                    ↓                           ↓
              ┌──────────┐               ┌──────────┐
              │  Team A  │               │  Team B  │
              │ Claude   │               │  Codex   │
              │ Workers  │               │  Workers │
              └────┬─────┘               └────┬─────┘
                   │                           │
              Bridge Server (TCP Hub) ←───┼─────→
                   │                       │
              ┌────▼────────────────────────▼────┐
              │         Referee (评分)            │
              │   Team A vs B → Winner 选择       │
              └──────────────────────────────────┘
```

## 快速开始

### 1. 启动 Bridge Server
```bash
cd claw-squad-cli
node bridge-server.ts --port 9876
```

### 2. 启动 Orchestrator
```bash
cd claw-squad-cli
npx ts-node orchestrator.ts
```

### 3. 启动 MCP Bridge (连接 OpenClaw)
```bash
cd claw-squad-mcp
npx ts-node bridge.ts
```

### 4. 配置 OpenClaw MCP
在 `openclaw.json` 中添加:
```json
{
  "mcpServers": {
    "clawsquad": {
      "command": "npx",
      "args": ["ts-node", "bridge.ts"]
    }
  }
}
```

## 支持的 CLI Workers

| Worker | 命令 | 模型 | API |
|--------|------|------|-----|
| Claude | `claude --print` | opus-4.6 / sonnet-4.6 | Anthropic |
| Codex | `codex --full-auto` | gpt-5 / o4-mini / o3 | OpenAI |
| OpenCode | `opencode run` | default | 灵活 |
| Gemini | `gemini` | gemini-2.0 | Google |

## MCP 工具

| 工具 | 用途 |
|------|------|
| `send_task` | 发送任务给指定 Worker |
| `broadcast` | 向所有 Worker 广播消息 |
| `get_workers` | 获取 Worker 状态 |
| `competition_start` | 启动 Team A vs Team B 竞争 |

## 示例

### 竞争模式
```
CEO: 分析任务 "实现一个 REST API"
Team A (Claude): 实现方案 A
Team B (Codex): 实现方案 B
Referee: 对比评分 → 输出 Winner
```

### 协作模式
```
CEO: 分解任务 [模块1, 模块2, 模块3]
Worker-1 → 模块1, Worker-2 → 模块2, Worker-3 → 模块3
CEO 收集汇总 → 返回用户
```

## 模块

| 模块 | 路径 | 职责 |
|------|------|------|
| claw-squad-core | `ceo-brain.ts` | CEO Brain |
| claw-squad-core | `team-factory.ts` | Team/Agent 管理 |
| claw-squad-cli | `orchestrator.ts` | CLI Worker 生命周期 |
| claw-squad-cli | `bridge-server.ts` | TCP Hub |
| claw-squad-mcp | `bridge.ts` | OpenClaw 桥接 |
| claw-squad-competition | `referee.ts` | 评分裁判 |

## License

MIT
