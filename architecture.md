# ClawSquad Architecture v2.3

> Claw (OpenClaw) + Squad (多 CLI Agent 协作)
>
> CEO (OpenClaw) → 动态编排多角色 Worker 团队 + 辩论会议

**新增**: 进度通知 + Session 管理

---

## 核心架构

```
用户 (Telegram / API / CLI)
    ↓
┌─────────────────────────────────────────────────────────────┐
│                    CEO Brain (OpenClaw)                       │
│  • 理解任务                                                  │
│  • 分析 → 确定所需角色                                        │
│  • 动态组建 Worker Team                                      │
│  • 可召开辩论会议 (Debate Meeting)                           │
│  • 通过 Bridge Server 协调                                   │
│  • 收集结果 → 汇总输出                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│               Bridge Server (TCP Hub)                          │
│         port: 9876 | 消息路由 | Worker 间通信                  │
└────┬─────────┬─────────┬─────────┬─────────────────────────────┘
     │         │         │         │
┌────▼────┐┌───▼───┐┌───▼────┐┌───▼────┐
│ Architect││ Coder ││Research││ Critic │
│Claude   ││Claude ││Gemini  ││Claude  │
│ Opus    ││Sonnet ││ Flash  ││ Opus   │
│Anthropic││Anthrop││Google  ││Anthrop │
└─────────┘└───────┘└────────┘└────────┘
     │         │         │         │
┌────▼─────────▼─────────▼─────────▼────┐
│         可选: 辩论会议 (Debate)          │
│  Facilitator 主持，多角色参与讨论          │
└─────────────────────────────────────────┘
```

---

## 角色清单 (26 个角色)

### 🔧 Engineering (8)
| 角色 | CLI | 模型 | 职责 |
|------|-----|------|------|
| **architect** | Claude | opus-4.6 | 系统架构设计 |
| **coder** | Claude | sonnet-4.6 | 主力开发 |
| **coder-alt** | Codex | gpt-5 | 辅助开发 (不同模型) |
| **debugger** | Claude | sonnet-4.6 | 调试专家 |
| **devops** | Claude | haiku-4.5 | 部署运维 |
| **security** | Claude | opus-4.6 | 安全审计 |
| **performance** | Claude | sonnet-4.6 | 性能优化 |
| **refactorer** | Claude | sonnet-4.6 | 重构专家 |

### 🔬 Research & Analysis (4)
| 角色 | CLI | 模型 | 职责 |
|------|-----|------|------|
| **researcher** | Gemini | flash-2.0 | 调研研究员 |
| **analyst** | Claude | sonnet-4.6 | 数据分析师 |
| **planner** | Claude | haiku-4.5 | 规划师 |
| **advisor** | Claude | opus-4.6 | 技术顾问 |

### ✅ Quality & Process (5)
| 角色 | CLI | 模型 | 职责 |
|------|-----|------|------|
| **reviewer** | Claude | haiku-4.5 | 代码审查 |
| **tester** | Codex | o4-mini | 测试工程师 |
| **qa** | Claude | haiku-4.5 | 质量保障 |
| **tech-writer** | Claude | haiku-4.5 | 技术文档 |
| **pm** | Claude | haiku-4.5 | 产品经理 |

### 🎭 Meta & Debate (7) ← 新增
| 角色 | CLI | 模型 | 职责 |
|------|-----|------|------|
| **critic** | Claude | opus-4.6 | 质疑者，挑战假设 |
| **devils-advocate** | Claude | sonnet-4.6 | 魔鬼代言人，反驳共识 |
| **optimist** | Claude | haiku-4.5 | 乐观派，关注收益 |
| **pessimist** | Claude | haiku-4.5 | 悲观派，关注风险 |
| **synthesizer** | Claude | opus-4.6 | 综合者，整合观点 |
| **facilitator** | Claude | sonnet-4.6 | 会议主持 |
| **guardian** | Claude | sonnet-4.6 | 守护者，边界/异常 |

### 🛠️ Utility (2)
| 角色 | CLI | 模型 | 职责 |
|------|-----|------|------|
| **utility** | OpenCode | default | 通用工具 |
| **explorer** | Claude | haiku-4.5 | 代码探索 |

---

## 辩论会议 (Debate Meeting) ← 新增

CEO 可以召开辩论会议，让不同角色的 Agent 对某个提案进行讨论。

### 辩论流程

```
CEO 召开辩论: "是否采用微服务架构?"
       ↓
┌─────────────────────────────────────────────────┐
│          Debate Meeting (实时讨论)                 │
│                                                  │
│  Facilitator (主持): "现在开始第一轮讨论"          │
│                                                  │
│  Optimist: "微服务可以独立部署..."               │
│  Pessimist: "但会增加复杂度..."                 │
│  Critic: "这个方案有 XX 问题..."                  │
│  Devils-Advocate: "我反对，因为..."               │
│  Synthesizer: "综合以上，我认为..."              │
│                                                  │
│  Facilitator: "进入第二轮..."                     │
│  ...                                            │
│                                                  │
│  最终 → Synthesizer 综合各方观点 → 结论          │
└─────────────────────────────────────────────────┘
       ↓
  CEO 根据结论做决策
```

### 辩论配置

```typescript
interface DebateConfig {
  topic: string;           // 辩论主题
  participants: Role[];    // 参与者: ['optimist', 'pessimist', 'critic', 'devils-advocate', 'synthesizer']
  moderator: 'facilitator'; // 主持人
  rounds: number;          // 轮数 (默认 3)
  timePerRound: number;    // 每轮时间 (秒)
}
```

### CEO 召开辩论的触发词

- "辩论一下..." / "debate..."
- "讨论一下利弊" / "discuss pros and cons"
- "召开会议讨论..."
- "让团队评估..."

---

## 任务 → 角色映射

| 任务关键词 | 自动推断角色 | 必加角色 |
|-----------|------------|---------|
| implement/build/create | architect + coder | reviewer + guardian |
| debug/fix | debugger + reviewer | guardian |
| optimize/refactor | performance + refactorer | reviewer |
| deploy | devops + architect | reviewer |
| security/audit | security + architect | reviewer + guardian |
| research/survey | researcher + analyst | - |
| analyze | analyst + researcher | guardian |
| review | reviewer + critic | guardian |
| test | tester + qa | reviewer |
| document/write | tech-writer | reviewer |
| discuss/debate | facilitator + optimist + pessimist + critic | synthesizer |
| critique | critic + devils-advocate | guardian |

> **注意**: `reviewer` 和 `guardian` 是**必选角色**，，每个任务都会自动加入。

---

## 完整工作流: Execute → Review → Improve

```
1. 执行阶段 (Execute)
   - 各 Agent 完成自己的任务
   - 例如: architect 设计, coder 实现, tester 测试

2. 审查阶段 (Review) ← 每次必执行
   - reviewer: 审查代码质量、规范、改进建议
   - guardian: 检查边界条件、异常处理、潜在风险
   - 输出: 审查意见

3. 改进阶段 (Improve)
   - 根据审查意见，分配改进任务给 coder
   - coder 根据反馈改进代码
   - 输出: 改进后的代码

4. 完成 → 最终输出 (执行 + 审查 + 改进)
```

---

## CEO 动态组队示例

### 示例 1: 新功能开发
```
任务: "实现用户认证模块"

CEO 推断: implement → [architect, coder]
必加: [reviewer, guardian]

组建:
  architect-1: Claude Opus (Anthropic) → 系统设计
  coder-1:    Claude Sonnet (Anthropic) → 核心实现
  reviewer-1:  Claude Haiku (Anthropic) → 代码审查 ← 必加
  guardian-1: Claude Sonnet (Anthropic) → 边界检查 ← 必加

流程:
  Execute → Review → Improve → 完成
```

### 示例 2: 技术选型辩论
```
任务: "是否采用微服务架构?"

CEO 推断: decide → [advisor, critic, guardian]
CEO 决定召开辩论会议:
  主题: "是否采用微服务架构?"
  参与者: [optimist, pessimist, critic, devils-advocate, synthesizer]
  主持: facilitator

辩论结论 → CEO 决策
```

### 示例 3: 代码重构
```
任务: "重构订单模块以提高性能"

CEO 推断: refactor + optimize → [performance, refactorer, reviewer, guardian]
组建:
  performance-1:  Claude Sonnet (Anthropic) → 性能分析
  refactorer-1:  Claude Sonnet (Anthropic) → 重构
  reviewer-1:    Claude Haiku (Anthropic) → 审查
  guardian-1:    Claude Sonnet (Anthropic) → 边界检查
```

---

## 模块

| 模块 | 文件 | 职责 |
|------|------|------|
| **claw-squad-core** | `ceo-brain.ts` | CEO Brain: 任务分析、辩论会议 |
| **claw-squad-core** | `team-factory.ts` | Team/Agent 生命周期 |
| **claw-squad-core** | `role-config.ts` | 26 角色定义、CLI/API 映射 |

---

## Bridge Server 消息协议

```typescript
// 注册
{ "type": "register", "agentId": "coder-1", "role": "coder", "cli": "claude" }

// 任务分发
{ "type": "task", "taskId": "t1", "to": "coder-1", "message": "..." }

// 辩论消息
{ "type": "debate", "round": 1, "from": "optimist", "message": "微服务的好处是..." }

// 响应
{ "type": "response", "taskId": "t1", "from": "coder-1", "message": "完成" }
```
