# ClawSquad UI 设计规范
> 版本: 1.0.0 | 日期: 2026-03-27 | 状态: 设计完成

---

## 页面结构

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: [Logo] [⚙️ Settings] [API Config] [Start Competition]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Task Input                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [输入任务...]                                    [开始] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Team Assignment                                               │
│  ┌───────────────────┬───────────────────┐                     │
│  │   Team A          │    Team B         │                     │
│  │   (Subagent)      │    (CLI)          │                     │
│  │  [Agent Cards]    │   [Agent Cards]   │                     │
│  └───────────────────┴───────────────────┘                     │
│                                                                 │
│  Terminal Output                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [Team A Terminal]    │    [Team B Terminal]              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Result Comparison                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🏆 Winner: Team B                                         │  │
│  │ [Quality ████████░░] [Speed ██████░░░░]              │  │
│  │ [View Diff] [Copy] [Save]                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 组件清单

### 1. TaskInput
- 任务输入框 (Textarea)
- 开始竞争按钮
- 状态: idle / running / done

### 2. TeamView
- 团队标题 (Team A / Team B)
- 团队类型标签 (Subagent / CLI)
- Agent 卡片列表

### 3. AgentCard
- 角色名称 (Architect / Coder / Tester)
- 状态指示器 (idle / running / done / error)
- CLI 选择下拉
- 模型选择下拉

### 4. TerminalGrid
- 双栏终端 (Xterm.js)
- Team A / Team B
- 实时输出
- 清空按钮

### 5. ResultPanel
- Winner 徽章
- 评分条形图
- 对比视图
- 操作按钮 (View Diff / Copy / Save)

### 6. SettingsModal
- API Provider 配置区
- Role-CLI 映射区
- Competition 设置区

### 7. APIProviderCard
- Provider 名称
- API Key 输入 (密码)
- Base URL 输入
- Test 按钮
- 启用/禁用开关

### 8. RoleMappingRow
- 角色名称
- CLI 选择下拉
- 模型选择下拉

---

## 配置数据模型

```typescript
interface ClawSquadConfig {
  version: "1.0.0";
  
  // API Providers
  apiProviders: {
    [provider: string]: {
      enabled: boolean;
      apiKey: string;
      baseURL: string;
      models: string[];
    }
  };
  
  // Role → CLI → Model 映射
  roleCliMapping: {
    [role: string]: {
      cli: string;
      model: string;
    }
  };
  
  // 竞争设置
  competition: {
    timeout: number;        // 默认 120s
    maxRetries: number;     // 默认 2
    evaluationMode: "quality" | "speed" | "balanced";
  }
}

// 持久化: localStorage + JSON 导出
```

---

## 支持的 API Providers

| Provider | Base URL | Models |
|----------|----------|--------|
| MiniMax | api.minimaxi.com | MiniMax-M2.7 |
| OpenAI | api.openai.com | gpt-4o, o4-mini |
| Anthropic | api.anthropic.com | claude-sonnet-4, claude-opus-4 |
| Google | generativelanguage.googleapis.com | gemini-2.0-flash, gemini-2.0-pro |
| DeepSeek | api.deepseek.com | deepseek-chat |
| Ollama | localhost:11434 | llama3.1 |

---

## 支持的 CLI

| CLI | Provider |
|-----|----------|
| Claude | Anthropic/MiniMax |
| Codex | OpenAI |
| Gemini | Google |
| OpenCode | OpenSource |
| Qwen | Alibaba |
| DeepSeek | DeepSeek |
| Ollama | Local |

---

## 支持的角色

| 角色 | 默认 CLI | 可选 CLI |
|------|----------|-----------|
| Architect | Claude | Claude, Codex, Gemini |
| Coder | Claude | Claude, Codex, Gemini, DeepSeek |
| Tester | Claude | Claude, Gemini, DeepSeek |
| Reviewer | Claude | Claude, Codex |
| DevOps | Claude | Claude, Codex |
| Researcher | Gemini | Claude, Gemini, Ollama |
| DBA | Claude | Claude |
| Security | Claude | Claude, Codex |

---

## 功能清单

### 核心功能 (MVP)
- [x] 任务输入
- [x] 双团队视图
- [x] 实时终端
- [x] 结果对比
- [x] Winner 揭晓

### 配置功能
- [x] API Provider 管理
- [x] API Key 配置
- [x] Base URL 自定义
- [x] 角色 → CLI 映射
- [x] CLI → 模型 映射
- [x] 配置持久化 (LocalStorage)
- [x] 配置导入/导出
- [x] 配置重置

### 扩展功能 (未来)
- [ ] 团队组装拖拽
- [ ] 竞争历史
- [ ] 实时进度
- [ ] WebSocket 实时更新

---

## 布局响应式

| 断点 | 布局 |
|------|------|
| < 768px | 单列，终端堆叠 |
| 768-1024px | 双列，压缩终端 |
| > 1024px | 双列，完整终端 |

---

## 技术栈

| 组件 | 技术 |
|------|------|
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Terminal | Xterm.js |
| State | Zustand / Context |
| Charts | Recharts |
| Icons | Lucide React |

---

## 更新日志

| 日期 | 版本 | 更新 |
|------|------|------|
| 2026-03-27 | 1.0.0 | 初始设计 |
