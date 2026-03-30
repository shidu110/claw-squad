# 🦞 ClawSquad v2.6

> Multi-Agent KI-Worker-Orchestrierungsframework

**ClawSquad** ermöglicht die parallele Koordination mehrerer KI-Worker (Claude Code, Codex, Gemini CLI usw.) für komplexe Softwareentwicklungsaufgaben. Es bietet intelligentes Task-Routing, rollenbasierte Spezialisierung und visuelle Überwachung über tmux.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)
[![tmux](https://img.shields.io/badge/tmux-ready-blue.svg)](https://github.com/tmux/tmux)
[![Multi-Agent](https://img.shields.io/badge/Multi--Agent-Orchestration-purple.svg)](https://arxiv.org/abs/2401.12345)

**Hauptmerkmale:**
- 🤖 25+ spezialisierte KI-Rollen
- 🖥️ Multi-CLI-Unterstützung (Claude/Codex/Gemini)
- 📊 Echtzeit-tmux-Visualisierung
- 🔄 Automatische Rollenzuweisung
- 🎯 Debattenmodus

---

## ✨ Funktionen

| Funktion | Beschreibung |
|---------|-------------|
| **Multi-Worker-Koordination** | Mehrere KI-Worker parallel spawnen und verwalten |
| **Rollenbasierte Spezialisierung** | Architect, Coder, Reviewer, Tester — jede Rolle mit optimiertem Modell |
| **Visuelle Überwachung** | tmux-Integration für Echtzeit-Worker-Ausgabe |
| **Multi-Modell-Unterstützung** | MiniMax, Kimi-K2.5, GLM-5 — verschiedene Modelle für verschiedene Aufgaben |
| **Worker-Pool** | Vorgespawnte, untätige Worker zur Latenzreduzierung |
| **Graceful Shutdown** | Saubere Worker-Bereinigung bei SIGTERM/SIGINT |
| **Auto-Reconnect** | Wiederherstellung nach Bridge-Server-Trennung |
| **Prometheus-Metriken** | Integrierte Metriksammlung |
| **MCP-Integration** | Funktioniert als MCP-Server für OpenClaw |

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw (CEO)                               │
│              Orchestration Layer                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP stdio
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Bridge (v2.6)                              │
├─────────────────────────────────────────────────────────────────┤
│  • Aufgabenkoordination (coordinate_team)                        │
│  • Worker Auto-Spawn + Statusverfolgung                         │
│  • Worker-Pool (vorgespawnte, untätige Worker)                  │
│  • Request-Timeout-Bereinigung                                  │
│  • Bridge-Server Auto-Reconnect                                  │
│  • Graceful Shutdown                                            │
│  • Prometheus-Metriken                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ TCP (Port 9876)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bridge Server (TCP Hub)                        │
├─────────────────────────────────────────────────────────────────┤
│  • CEO ↔ Worker-Nachrichtenweiterleitung                         │
│  • Worker-Registrierung (Rolle, Fähigkeiten)                     │
│  • Aufgabenverfolgung (activeTasks Map)                         │
│  • Debatten-Sitzungen (start_debate)                            │
│  • Status-Broadcast                                             │
└──────┬─────────────────┬──────────────────┬──────────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  architect  │   │    coder   │   │   reviewer  │
│   (GLM-5)  │   │   (GLM-5)  │   │  (Kimi-K2)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 🤖 Rollen → Modell-Zuordnung (25 Rollen)

### 🔧 Engineering (8)

| Rolle | Standard-CLI | Begründung |
|-------|-------------|------------|
| **architect** | claude | Komplexes Reasoning, Langzeitplanung |
| **coder** | claude | Code-Generierung auf Ingenieurniveau |
| **coder-alt** | codex | Vielfältige Lösungsansätze |
| **debugger** | claude | Tiefgehende Analyse, Terminal-Tools |
| **devops** | claude | Schnelle Ausführung, parallele Ops |
| **security** | claude | Tiefgehende Sicherheitsanalyse |
| **performance** | claude | Tiefgehende Optimierungsanalyse |
| **refactorer** | claude | Code-Qualität und Umstrukturierung |

### 🔬 Forschung & Analyse (4)

| Rolle | Standard-CLI | Begründung |
|-------|-------------|------------|
| **researcher** | gemini | 256k-Kontext, paralleles Scraping |
| **analyst** | claude | Datenanalyse und Erkenntnisse |
| **planner** | claude | Aufgabenplanung und -terminierung |
| **advisor** | claude | Technologieauswahl und Entscheidungsunterstützung |

### 🎭 Meta & Debatte (7)

| Rolle | Standard-CLI | Begründung |
|-------|-------------|------------|
| **critic** | claude | Annahmen in Frage stellen und hinterfragen |
| **devils-advocate** | claude | Konsens widersprechen |
| **optimist** | claude | Auf Vorteile fokussieren |
| **pessimist** | claude | Auf Risiken fokussieren |
| **synthesizer** | claude | Synthese und Induktion |
| **facilitator** | claude | Diskussion vorantreiben |
| **guardian** | claude | Grenzen und Risiken prüfen |

---

## 🎙️ Debattenmodus ← Kernfunktion

Der CEO kann das Team zu einer Debattenbesprechung zusammenrufen:

```
CEO auslöst: "debate the microservices architecture?"
       ↓
┌─────────────────────────────────────────────────┐
│            Debate Meeting                        │
│                                                  │
│  Facilitator: "Round 1 - opening statements"    │
│                                                  │
│  Optimist: "Microservices ermöglichen..."        │
│  Pessimist: "Aber es erhöht die Komplexität..." │
│  Critic: "Der Vorschlag hat XX Probleme..."     │
│  Devils-Advocate: "Ich widerspreche, weil..."    │
│                                                  │
│  ... (standardmäßig 3 Runden)                   │
│                                                  │
│  Synthesizer: "Basierend auf allen Perspektiven..." │
│  Endurteil → CEO trifft Entscheidung           │
└─────────────────────────────────────────────────┘
```

**Auslösephrase:** "debate..."、"discuss pros/cons"、"hold a meeting..."、"team evaluation"

---

## 🔄 Workflow: Ausführen → Überprüfen → Verbessern

Jede Aufgabe folgt diesem obligatorischen Ablauf:

```
1. Ausführen → Worker-Team erledigt zugewiesene Aufgaben
2. Überprüfen → reviewer: Qualitätsprüfung | guardian: Grenzprüfung
3. Verbessern → Coder adressiert Überprüfungsfeedback
4. Fertig → Endoutput mit allen Verbesserungen
```

---

## 🚀 Schnellstart

### 1. Installation

```bash
git clone https://github.com/shidu110/claw-squad.git
cd claw-squad
```

### 2. API-Schlüssel konfigurieren

| Anbieter | Umgebungsvariable | Bezugs-URL |
|----------|-------------------|-------------|
| MiniMax | `MINIMAX_API_KEY` | platform.minimaxi.com |
| SiliconFlow | `SILICONFLOW_API_KEY` | console.siliconflow.cn |
| Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com |

### 3. Docker (One-Command-Start)

```bash
docker-compose up -d
```

### 4. Manuelle Starts

```bash
# Terminal 1: Bridge Server starten
cd claw-squad-cli
npm run start:bridge

# Terminal 2: Orchestrator starten
npm run start:orchestrator
```

---

## 📁 Verzeichnisstruktur

```
claw-squad/
├── claw-squad-core/      # Kern: CEO Brain, Team Factory, Rollenkonfiguration
├── claw-squad-cli/       # CLI: Bridge Server, MCP Bridge, Orchestrator
├── claw-squad-backend/   # Backend: API, Zustandsverwaltung
├── claw-squad-mcp/       # MCP Server: OpenClaw-Integration
├── claw-squad-ui/        # Web UI (optional)
├── examples/             # Beispielaufgaben
└── tests/                # Testsuite
```

---

## 🤝 Beitragen

Issues und PRs willkommen!

## 📄 Lizenz

MIT
