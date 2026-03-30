# 🦞 ClawSquad v2.6

> Framework de Orquestación de Workers AI Multi-Agente

**ClawSquad** permite la coordinación en paralelo de múltiples Workers AI (Claude Code, Codex, Gemini CLI, etc.) para tareas complejas de ingeniería de software. Ofrece enrutamiento inteligente de tareas, especialización basada en roles y monitorización visual a través de tmux.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)
[![tmux](https://img.shields.io/badge/tmux-ready-blue.svg)](https://github.com/tmux/tmux)
[![Multi-Agent](https://img.shields.io/badge/Multi--Agent-Orchestration-purple.svg)](https://arxiv.org/abs/2401.12345)

**Características principales:**
- 🤖 25+ roles AI especializados
- 🖥️ Soporte Multi-CLI (Claude/Codex/Gemini)
- 📊 Visualización en tiempo real con tmux
- 🔄 Asignación automática de roles
- 🎯 Modo de reunión de debate

---

## ✨ Características

| Característica | Descripción |
|----------------|-------------|
| **Coordinación Multi-Worker** | Generar y gestionar múltiples Workers AI en paralelo |
| **Especialización por Roles** | Architect, Coder, Reviewer, Tester — cada rol con modelo optimizado |
| **Monitorización Visual** | Integración tmux para ver salida de Workers en tiempo real |
| **Soporte Multi-Modelo** | MiniMax, Kimi-K2.5, GLM-5 — diferente modelo según la tarea |
| **Worker Pool** | Workers inactivos pre-iniciados para reducir latencia |
| **Apagado Graceful** | Limpieza limpia de Workers en SIGTERM/SIGINT |
| **Reconexión Automática** | Recuperación tras desconexión del Bridge Server |
| **Métricas Prometheus** | Recolección de métricas integrada |
| **Integración MCP** | Funciona como MCP Server para OpenClaw |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw (CEO)                               │
│              Capa de Orquestación                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP stdio
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Bridge (v2.6)                              │
├─────────────────────────────────────────────────────────────────┤
│  • Coordinación de tareas (coordinate_team)                      │
│  • Auto-spawn de Workers + seguimiento de estado                 │
│  • Worker Pool (Workers inactivos pre-iniciados)                │
│  • Limpieza de requests en timeout                              │
│  • Reconexión automática al Bridge Server                        │
│  • Apagado graceful                                              │
│  • Métricas Prometheus                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ TCP (puerto 9876)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bridge Server (TCP Hub)                        │
├─────────────────────────────────────────────────────────────────┤
│  • Enrutamiento de mensajes CEO ↔ Worker                        │
│  • Registro de Workers (rol, capabilities)                      │
│  • Seguimiento de tareas (activeTasks Map)                     │
│  • Sesiones de debate (start_debate)                           │
│  • Broadcast de estado                                           │
└──────┬─────────────────┬──────────────────┬──────────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  architect  │   │    coder   │   │   reviewer  │
│   (GLM-5)   │   │   (GLM-5)  │   │  (Kimi-K2)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 🤖 Mapeo de Rol → Modelo (25 roles)

### 🔧 Ingeniería (8)

| Rol | CLI por defecto | Justificación |
|-----|----------------|---------------|
| **architect** | claude | Razonamiento complejo, planificación a largo plazo |
| **coder** | claude | Generación de código de nivel ingeniero |
| **coder-alt** | codex | Soluciones diversas |
| **debugger** | claude | Análisis profundo, herramientas de terminal |
| **devops** | claude | Ejecución rápida, operaciones paralelas |
| **security** | claude | Análisis profundo de seguridad |
| **performance** | claude | Análisis de optimización profunda |
| **refactorer** | claude | Calidad de código y reestructuración |

### 🔬 Investigación y Análisis (4)

| Rol | CLI por defecto | Justificación |
|-----|----------------|---------------|
| **researcher** | gemini | Contexto 256k, scraping paralelo |
| **analyst** | claude | Análisis de datos e insights |
| **planner** | claude | Planificación y programación de tareas |
| **advisor** | claude | Asesoría técnica y toma de decisiones |

### 🎭 Meta y Debate (7)

| Rol | CLI por defecto | Justificación |
|-----|----------------|---------------|
| **critic** | claude | Cuestionar y desafiar supuestos |
| **devils-advocate** | claude | Rebatir el consenso |
| **optimist** | claude | Enfocarse en beneficios |
| **pessimist** | claude | Enfocarse en riesgos |
| **synthesizer** | claude | Síntesis e inducción |
| **facilitator** | claude | Facilitar la discusión |
| **guardian** | claude | Verificación de límites y riesgos |

---

## 🎙️ Modo de Reunión de Debate ← Función Principal

El CEO puede convocar al equipo a una reunión de debate:

```
CEO activa: "debate the microservices architecture?"
       ↓
┌─────────────────────────────────────────────────┐
│            Debate Meeting                        │
│                                                  │
│  Facilitator: "Round 1 - opening statements"     │
│                                                  │
│  Optimist: "Los microservicios permiten..."     │
│  Pessimist: "Pero añade complejidad..."        │
│  Critic: "La propuesta tiene XX problemas..."   │
│  Devils-Advocate: "Me opongo porque..."        │
│                                                  │
│  ... (3 rondas por defecto)                    │
│                                                  │
│  Synthesizer: "Basado en todas las..."         │
│  Veredicto final → CEO toma decisión           │
└─────────────────────────────────────────────────┘
```

**Frases trigger:** "debate..."、"discuss pros/cons"、"hold a meeting..."、"team evaluation"

---

## 🔄 Flujo de Trabajo: Ejecutar → Revisar → Mejorar

Cada tarea sigue este flujo obligatorio:

```
1. Ejecutar → El equipo Worker completa las tareas asignadas
2. Revisar  → reviewer: checks de calidad | guardian: checks de límites
3. Mejorar  → Coder aborda los comentarios de revisión
4. Hecho    → Salida final con todas las mejoras incorporadas
```

---

## 🚀 Inicio Rápido

### 1. Instalación

```bash
git clone https://github.com/shidu110/claw-squad.git
cd claw-squad
```

### 2. Configurar API Keys

| Proveedor | Variable de entorno | URL de obtención |
|-----------|--------------------|--------------------|
| MiniMax | `MINIMAX_API_KEY` | platform.minimaxi.com |
| SiliconFlow | `SILICONFLOW_API_KEY` | console.siliconflow.cn |
| Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com |

### 3. Inicio con Docker

```bash
docker-compose up -d
```

### 4. Inicio Manual

```bash
# Terminal 1: Iniciar Bridge Server
cd claw-squad-cli
npm run start:bridge

# Terminal 2: Iniciar Orchestrator
npm run start:orchestrator
```

---

## 📁 Estructura del Proyecto

```
claw-squad/
├── claw-squad-core/      # Core: CEO Brain, Team Factory, configuración de roles
├── claw-squad-cli/       # CLI: Bridge Server, MCP Bridge, Orchestrator
├── claw-squad-backend/    # Backend: API, gestión de estado
├── claw-squad-mcp/       # MCP Server: Integración OpenClaw
├── claw-squad-ui/        # Web UI (opcional)
├── examples/             # Tareas de ejemplo
└── tests/               # Suite de pruebas
```

---

## 🤝 Contribuir

¡Aceptamos Issues y PRs!

## 📄 Licencia

MIT
