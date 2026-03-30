# 🦞 ClawSquad v2.6

> Framework de Orquestração de Workers AI Multi-Agente

**ClawSquad** permite a coordenação paralela de múltiplos Workers AI (Claude Code, Codex, Gemini CLI, etc.) para tarefas complexas de engenharia de software. Oferece roteamento inteligente de tarefas, especialização baseada em funções e monitoramento visual via tmux.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)
[![tmux](https://img.shields.io/badge/tmux-ready-blue.svg)](https://github.com/tmux/tmux)
[![Multi-Agent](https://img.shields.io/badge/Multi--Agent-Orchestration-purple.svg)](https://arxiv.org/abs/2401.12345)

**Principais características:**
- 🤖 25+ funções AI especializadas
- 🖥️ Suporte Multi-CLI (Claude/Codex/Gemini)
- 📊 Visualização tmux em tempo real
- 🔄 Atribuição automática de funções
- 🎯 Modo de reunião de debate

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---------------|-----------|
| **Coordenação Multi-Worker** | Gerar e gerenciar múltiplos Workers AI em paralelo |
| **Especialização por Funções** | Architect, Coder, Reviewer, Tester — cada função com modelo otimizado |
| **Monitoramento Visual** | Integração tmux para saída em tempo real dos Workers |
| **Suporte Multi-Modelo** | MiniMax, Kimi-K2.5, GLM-5 — modelo diferente conforme a tarefa |
| **Worker Pool** | Workers ociosos pré-iniciados para reduzir latência |
| **Graceful Shutdown** | Limpeza limpa de Workers em SIGTERM/SIGINT |
| **Reconexão Automática** | Recuperação após desconexão do Bridge Server |
| **Métricas Prometheus** | Coleta de métricas integrada |
| **Integração MCP** | Funciona como MCP Server para OpenClaw |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw (CEO)                               │
│              Camada de Orquestração                               │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP stdio
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Bridge (v2.6)                              │
├─────────────────────────────────────────────────────────────────┤
│  • Coordenação de tarefas (coordinate_team)                        │
│  • Auto-spawn de Workers + rastreamento de estado                │
│  • Worker Pool (Workers ociosos pré-iniciados)                  │
│  • Limpeza de requests em timeout                                │
│  • Reconexão automática ao Bridge Server                          │
│  • Shutdown graceful                                              │
│  • Métricas Prometheus                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ TCP (porta 9876)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bridge Server (TCP Hub)                         │
├─────────────────────────────────────────────────────────────────┤
│  • Roteamento de mensagens CEO ↔ Worker                          │
│  • Registro de Worker (função, capacidades)                      │
│  • Rastreamento de tarefas (activeTasks Map)                   │
│  • Sessões de debate (start_debate)                            │
│  • Broadcast de estado                                             │
└──────┬─────────────────┬──────────────────┬──────────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  architect  │   │    coder   │   │   reviewer  │
│   (GLM-5)  │   │   (GLM-5)  │   │  (Kimi-K2)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 🤖 Mapeamento Função → Modelo (25 funções)

### 🔧 Engenharia (8)

| Função | CLI padrão | Justificativa |
|--------|-----------|---------------|
| **architect** | claude | Raciocínio complexo, planejamento de longo prazo |
| **coder** | claude | Geração de código de nível engenharia |
| **coder-alt** | codex | Soluções diversas |
| **debugger** | claude | Análise profunda, ferramentas de terminal |
| **devops** | claude | Execução rápida, ops paralelas |
| **security** | claude | Análise profunda de segurança |
| **performance** | claude | Análise profunda de otimização |
| **refactorer** | claude | Qualidade do código e reestruturação |

### 🔬 Pesquisa & Análise (4)

| Função | CLI padrão | Justificativa |
|--------|-----------|---------------|
| **researcher** | gemini | Contexto 256k, scraping paralelo |
| **analyst** | claude | Análise de dados e insights |
| **planner** | claude | Planejamento e agendamento de tarefas |
| **advisor** | claude | Assessoria técnica e suporte à decisão |

### 🎭 Meta & Debate (7)

| Função | CLI padrão | Justificativa |
|--------|-----------|---------------|
| **critic** | claude | Questionar e desafiar premissas |
| **devils-advocate** | claude | Contestar o consenso |
| **optimist** | claude | Focar nos benefícios |
| **pessimist** | claude | Focar nos riscos |
| **synthesizer** | claude | Síntese e indução |
| **facilitator** | claude | Facilitar a discussão |
| **guardian** | claude | Verificação de limites e riscos |

---

## 🎙️ Modo Reunião de Debate ← Função Principal

O CEO pode convocá-lo para uma reunião de debate:

```
CEO dispara: "debate the microservices architecture?"
       ↓
┌─────────────────────────────────────────────────┐
│            Debate Meeting                        │
│                                                  │
│  Facilitator: "Round 1 - opening statements"    │
│                                                  │
│  Optimist: "Microservices permitem..."           │
│  Pessimist: "Mas adiciona complexidade..."       │
│  Critic: "A proposta tem XX problemas..."        │
│  Devils-Advocate: "Me oppo porque..."           │
│                                                  │
│  ... (3 rodadas por padrão)                    │
│                                                  │
│  Synthesizer: "Baseado em todas as..."         │
│  Veredicto final → CEO toma decisão            │
└─────────────────────────────────────────────────┘
```

**Frases-gatilho:** "debate..."、"discuss pros/cons"、"hold a meeting..."、"team evaluation"

---

## 🔄 Fluxo de Trabalho: Executar → Revisar → Melhorar

Cada tarefa segue este fluxo obrigatório:

```
1. Executar → Equipe Worker conclui tarefas atribuídas
2. Revisar  → reviewer: checks de qualidade | guardian: checks de limites
3. Melhorar → Coder aborda comentários de revisão
4. Feito    → Saída final com todas as melhorias incorporadas
```

---

## 🚀 Início Rápido

### 1. Instalação

```bash
git clone https://github.com/shidu110/claw-squad.git
cd claw-squad
```

### 2. Configurar as chaves de API

| Provedor | Variável de ambiente | URL de obtenção |
|----------|----------------------|------------------|
| MiniMax | `MINIMAX_API_KEY` | platform.minimaxi.com |
| SiliconFlow | `SILICONFLOW_API_KEY` | console.siliconflow.cn |
| Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com |

### 3. Docker (início em um comando)

```bash
docker-compose up -d
```

### 4. Início Manual

```bash
# Terminal 1: Iniciar Bridge Server
cd claw-squad-cli
npm run start:bridge

# Terminal 2: Iniciar Orchestrator
npm run start:orchestrator
```

---

## 📁 Estrutura do Projeto

```
claw-squad/
├── claw-squad-core/      # Core: CEO Brain, Team Factory, config de funções
├── claw-squad-cli/       # CLI: Bridge Server, MCP Bridge, Orchestrator
├── claw-squad-backend/    # Backend: API, gerenciamento de estado
├── claw-squad-mcp/       # MCP Server: Integração OpenClaw
├── claw-squad-ui/        # Web UI (opcional)
├── examples/            # Exemplos de tarefas
└── tests/              # Suite de testes
```

---

## 🤝 Contribuir

Issues e PRs são bem-vindos!

## 📄 Licença

MIT
