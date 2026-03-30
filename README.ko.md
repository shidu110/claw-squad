# 🦞 ClawSquad v2.6

> 멀티 에이전트 AI Worker 오케스트레이션 프레임워크

**ClawSquad**는 Claude Code, Codex, Gemini CLI 등 여러 AI Worker의 병렬 협업을 가능하게 하여 복잡한 소프트웨어 엔지니어링 작업을 수행합니다. 지능형 작업 라우팅, 역할 기반 전문화, tmux를 통한 시각적 모니터링을 제공합니다.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)
[![tmux](https://img.shields.io/badge/tmux-ready-blue.svg)](https://github.com/tmux/tmux)

**주요 기능:**
- 🤖 25+ 전문 AI 역할
- 🖥️ Multi-CLI 지원 (Claude/Codex/Gemini)
- 📊 실시간 tmux 시각화
- 🔄 자동 역할 할당
- 🎯 토론 회의 모드

---

## ✨ 기능

| 기능 | 설명 |
|------|------|
| **멀티 Worker 협업** | 여러 AI Worker를 병렬로 생성 및 관리 |
| **역할 기반 전문화** | Architect, Coder, Reviewer, Tester — 각 역할에 최적화된 모델 |
| **시각적 모니터링** | tmux 통합, 실시간 Worker 출력 표시 |
| **멀티 모델 지원** | MiniMax, Kimi-K2.5, GLM-5 — 작업에 맞는 모델 선택 |
| **Worker 풀** | 사전 시작 유휴 Worker로 지연 시간 감소 |
| **Graceful Shutdown** | SIGTERM/SIGINT 시 깨끗한 Worker 정리 |
| **자동 재연결** | Bridge Server断开 시 자동恢复 |
| **Prometheus 메트릭스** | 내장된 메트릭스 수집 |
| **MCP 통합** | OpenClaw의 MCP Server로接入 |

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw (CEO)                               │
│              오케스트레이션 Layer                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP stdio
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Bridge (v2.6)                              │
├─────────────────────────────────────────────────────────────────┤
│  • 작업 조정 (coordinate_team)                                   │
│  • Worker 자동 생성 + 상태 추적                                   │
│  • Worker 풀 (사전 시작 유휴 Worker)                             │
│  • 요청 타임아웃 정리                                            │
│  • Bridge Server 자동 재연결                                     │
│  • Graceful shutdown                                            │
│  • Prometheus 메트릭스                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ TCP (port 9876)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bridge Server (TCP Hub)                        │
├─────────────────────────────────────────────────────────────────┤
│  • CEO ↔ Worker 메시지 라우팅                                    │
│  • Worker 등록 (role, capabilities)                            │
│  • 작업 추적 (activeTasks Map)                                  │
│  • 토론 세션 (start_debate)                                     │
│  • 상태 브로드캐스트                                             │
└──────┬─────────────────┬──────────────────┬──────────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  architect  │   │    coder   │   │   reviewer  │
│   (GLM-5)   │   │   (GLM-5)  │   │  (Kimi-K2)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 🤖 역할 → 모델 매핑 (25개 역할)

### 🔧 엔지니어링 (8개)

| 역할 | 기본 CLI | 선택 이유 |
|------|---------|---------|
| **architect** | claude | 복잡한 추론, 장기 planning |
| **coder** | claude | 엔지니어링급 code 생성 |
| **coder-alt** | codex | 다양한 solutions |
| **debugger** | claude | 깊이 있는 분석, terminal 도구 |
| **devops** | claude | 빠른 실행, parallel ops |
| **security** | claude | 깊이 있는 security 분석 |
| **performance** | claude | 깊이 있는 최적화 분석 |
| **refactorer** | claude | code quality 및 재구성 |

### 🔬 리서치 및 분석 (4개)

| 역할 | 기본 CLI | 선택 이유 |
|------|---------|---------|
| **researcher** | gemini | 256k context, parallel scraping |
| **analyst** | claude | 데이터 분석 및 인사이트 |
| **planner** | claude | 작업 planning 및 scheduling |
| **advisor** | claude | 기술 선정 및 의사결정 지원 |

### 🎭 메타 및 토론 (7개)

| 역할 | 기본 CLI | 선택 이유 |
|------|---------|---------|
| **critic** | claude | 질문하고 가정에 도전 |
| **devils-advocate** | claude | 합의에 반론 |
| **optimist** | claude | 이점에 주목 |
| **pessimist** | claude | 리스크에 주목 |
| **synthesizer** | claude | 종합 및 귀납 |
| **facilitator** | claude | 토론 촉진 |
| **guardian** | claude | 경계 및 리스크 점검 |

---

## 🎙️ 토론 회의 모드 ← 핵심 기능

CEO는 팀에 토론 회의를 소집할 수 있습니다:

```
CEO 촉발: "debate the microservices architecture?"
       ↓
┌─────────────────────────────────────────────────┐
│            Debate Meeting                        │
│                                                  │
│  Facilitator: "Round 1 - opening statements"   │
│                                                  │
│  Optimist: "Microservices는 독립..."             │
│  Pessimist: "그러나 복잡성 증가..."            │
│  Critic: "제안에는 XX문제..."                  │
│  Devils-Advocate: "제가 반대하는 이유는..."      │
│                                                  │
│  ... (기본 3라운드)                            │
│                                                  │
│  Synthesizer: "각 관점을 종합..."              │
│  최종 판결 → CEO가 의사결정                    │
└─────────────────────────────────────────────────┘
```

**트리거:** "debate..."、"discuss pros/cons"、"hold a meeting..."、"team evaluation"

---

## 🚀 빠른 시작

### 1. 설치

```bash
git clone https://github.com/shidu110/claw-squad.git
cd claw-squad
```

### 2. API Keys 설정

| 프로바이더 | 환경 변수 | 획득 URL |
|----------|---------|---------|
| MiniMax | `MINIMAX_API_KEY` | platform.minimaxi.com |
| SiliconFlow | `SILICONFLOW_API_KEY` | console.siliconflow.cn |
| Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com |

### 3. Docker (一键起動)

```bash
docker-compose up -d
```

### 4. 수동起動

```bash
# 터미널 1: Bridge Server起動
cd claw-squad-cli
npm run start:bridge

# 터미널 2: Orchestrator起動
npm run start:orchestrator
```

---

## 📁 디렉토리 구조

```
claw-squad/
├── claw-squad-core/      # 코어: CEO Brain, Team Factory, 역할 설정
├── claw-squad-cli/        # CLI: Bridge Server, MCP Bridge, Orchestrator
├── claw-squad-backend/    # 백엔드: API, 상태 관리
├── claw-squad-mcp/        # MCP Server: OpenClaw 통합
├── claw-squad-ui/         # Web UI (선택)
├── examples/              # 샘플 작업
└── tests/                # 테스트 스위트
```

---

## 🤝 기여

Issue와 PR을 환영합니다!

## 📄 License

MIT
