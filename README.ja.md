# 🦞 ClawSquad v2.6

> マルチエージェントAI Workerオーケストレーショ framework

**ClawSquad** は、複数のAI Worker（Claude Code、Codex、Gemini CLIなど）の並列協調を実現し、複雑なソフトウェアエンジニアリングタスクを実行します。Intelligentなタスクルーティング、ロールベースのspecialization、tmuxによるvisual monitoringを提供します。

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)
[![tmux](https://img.shields.io/badge/tmux-ready-blue.svg)](https://github.com/tmux/tmux)

**メイン機能：**
- 🤖 25+ specialized AI roles
- 🖥️ Multi-CLI support（Claude/Codex/Gemini）
- 📊 リアルタイムtmux visualization
- 🔄 自動role assignment
- 🎯 Debate meeting mode

---

## ✨ 機能

| 機能 | 説明 |
|------|------|
| **マルチWorker協調** | 複数のAI Workerを並列にspawn、管理 |
| **ロールベースspecialization** | Architect、Coder、Reviewer、Tester — 各roleに最適化model |
| **Visual Monitoring** | tmux統合、リアルタイムWorker出力表示 |
| **マルチモデルサポート** | MiniMax、Kimi-K2.5、GLM-5 — タスクに応じてmodel切替 |
| **Workerプール** | 事前起動アイドルWorkerでlatency削減 |
| **Graceful Shutdown** | SIGTERM/SIGINT時のクリーンWorker清理 |
| **自動再接続** | Bridge Server切断時の自動回復 |
| **Prometheus Metrics** | 内蔵metrics収集 |
| **MCP統合** | OpenClawへのMCP Serverとして接入 |

---

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw (CEO)                               │
│              オーケストレーションLayer                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP stdio
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Bridge (v2.6)                              │
├─────────────────────────────────────────────────────────────────┤
│  • タスク協調 (coordinate_team)                                  │
│  • Worker自動spawn + 状態追跡                                    │
│  • Workerプール（アイドルWorker事前起動）                          │
│  • リクエストタイムアウト清理                                      │
│  • Bridge Server自動再接続                                      │
│  • Graceful shutdown                                            │
│  • Prometheus metrics                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ TCP (port 9876)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bridge Server (TCP Hub)                        │
├─────────────────────────────────────────────────────────────────┤
│  • CEO ↔ Workerメッセージルーティング                            │
│  • Worker登録（role、capabilities）                              │
│  • タスク追跡（activeTasks Map）                                │
│  • Debateセッション（start_debate）                             │
│  • ステータスbroadcast                                           │
└──────┬─────────────────┬──────────────────┬──────────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  architect  │   │    coder   │   │   reviewer  │
│   (GLM-5)   │   │   (GLM-5)  │   │  (Kimi-K2)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 🤖 ロール → モデルマッピング（25 roles）

### 🔧 Engineering（8）

| ロール | デフォルトCLI | 選定理由 |
|--------|--------------|---------|
| **architect** | claude | 複雑推理、長期planning |
| **coder** | claude | Engineering級code生成 |
| **coder-alt** | codex | 多様化解法 |
| **debugger** | claude | 深度分析、terminal工具 |
| **devops** | claude | 高速実行、parallel ops |
| **security** | claude | 深度security分析 |
| **performance** | claude | 深度最適化分析 |
| **refactorer** | claude | code quality、再構築 |

### 🔬 Research & Analysis（4）

| ロール | デフォルトCLI | 選定理由 |
|--------|--------------|---------|
| **researcher** | gemini | 256k context、parallel scraping |
| **analyst** | claude | データ分析、insights |
| **planner** | claude | タスクplanning、scheduling |
| **advisor** | claude | 技術選定、意思決定支援 |

### 🎭 Meta & Debate（7）

| ロール | デフォルトCLI | 選定理由 |
|--------|--------------|---------|
| **critic** | claude | 疑問を呈しassumptionにchallenge |
| **devils-advocate** | claude | 合意に反論 |
| **optimist** | claude | benefitに注目 |
| **pessimist** | claude | リスクに注目 |
| **synthesizer** | claude | 综合归纳 |
| **facilitator** | claude | 討論促進 |
| **guardian** | claude | 境界・リスク检查 |

---

## 🎙️ Debate Meeting Mode ← 核心機能

CEOはチームにdebate meetingを招集できます：

```
CEO起動："debate the microservices architecture?"
       ↓
┌─────────────────────────────────────────────────┐
│            Debate Meeting                        │
│                                                  │
│  Facilitator: "Round 1 - opening statements"    │
│                                                  │
│  Optimist: "Microservicesは独立deploy..."       │
│  Pessimist: "しかし複雑性が増す..."            │
│  Critic: "提案にはXXの問題が..."               │
│  Devils-Advocate: "私が反対理由は..."           │
│                                                  │
│  ...（デフォルト3round）                        │
│                                                  │
│  Synthesizer: "各方の見解を综合..."             │
│  最終裁决 → CEOが意思決定                      │
└─────────────────────────────────────────────────┘
```

**トリガー：** "debate..."、"discuss pros/cons"、"hold a meeting..."、"team evaluation"

---

## 🚀 クイックスタート

### 1. インストール

```bash
git clone https://github.com/shidu110/claw-squad.git
cd claw-squad
```

### 2. API Keys設定

| プロバイダー | 環境変数 | 取得URL |
|------------|---------|---------|
| MiniMax | `MINIMAX_API_KEY` | platform.minimaxi.com |
| SiliconFlow | `SILICONFLOW_API_KEY` | console.siliconflow.cn |
| Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com |

### 3. Docker（一括起動）

```bash
docker-compose up -d
```

### 4. 手動起動

```bash
# ターミナル1: Bridge Server起動
cd claw-squad-cli
npm run start:bridge

# ターミナル2: Orchestrator起動
npm run start:orchestrator
```

---

## 📁 ディレクトリ構造

```
claw-squad/
├── claw-squad-core/      # コア：CEO Brain、Team Factory、role設定
├── claw-squad-cli/        # CLI：Bridge Server、MCP Bridge、Orchestrator
├── claw-squad-backend/    # バックエンド：API、状態管理
├── claw-squad-mcp/        # MCP Server：OpenClaw統合
├── claw-squad-ui/         # Web UI（オプション）
├── examples/              # サンプルタスク
└── tests/                # テストスイート
```

---

## 🤝 コントリビュート

IssueとPR。欢迎您的contributions！

## 📄 License

MIT
