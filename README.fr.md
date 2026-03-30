# 🦞 ClawSquad v2.6

> Framework d'Orchestration de Workers AI Multi-Agents

**ClawSquad** permet la coordination parallèle de plusieurs Workers AI (Claude Code, Codex, Gemini CLI, etc.) pour des tâches complexes d'ingénierie logicielle. Il offre un routage intelligent des tâches, une spécialisation basée sur les rôles et une supervision visuelle via tmux.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)
[![tmux](https://img.shields.io/badge/tmux-ready-blue.svg)](https://github.com/tmux/tmux)
[![Multi-Agent](https://img.shields.io/badge/Multi--Agent-Orchestration-purple.svg)](https://arxiv.org/abs/2401.12345)

**Fonctionnalités principales:**
- 🤖 25+ rôles AI spécialisés
- 🖥️ Support Multi-CLI (Claude/Codex/Gemini)
- 📊 Visualisation tmux en temps réel
- 🔄 Attribution automatique des rôles
- 🎯 Mode réunion de débat

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|--------------|-------------|
| **Coordination Multi-Worker** | Générer et gérer plusieurs Workers AI en parallèle |
| **Spécialisation par Rôles** | Architect, Coder, Reviewer, Tester — chaque rôle avec modèle optimisé |
| **Supervision Visuelle** | Intégration tmux pour la sortie en temps réel des Workers |
| **Support Multi-Modèle** | MiniMax, Kimi-K2.5, GLM-5 — modèle différent selon la tâche |
| **Worker Pool** | Workers inactifs pré-démarrés pour réduire la latence |
| **Arrêt Graceful** | Nettoyage propre des Workers en SIGTERM/SIGINT |
| **Reconnexion Auto** | Récupération après déconnexion du Bridge Server |
| **Métriques Prometheus** | Collecte de métriques intégrée |
| **Intégration MCP** | Fonctionne comme MCP Server pour OpenClaw |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw (CEO)                               │
│              Couche d'Orchestration                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP stdio
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Bridge (v2.6)                              │
├─────────────────────────────────────────────────────────────────┤
│  • Coordination de tâches (coordinate_team)                        │
│  • Auto-spawn de Workers + suivi d'état                        │
│  • Worker Pool (Workers inactifs pré-démarrés)                │
│  • Nettoyage des requêtes en timeout                            │
│  • Reconnexion automatique au Bridge Server                       │
│  • Arrêt graceful                                               │
│  • Métriques Prometheus                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ TCP (port 9876)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bridge Server (TCP Hub)                        │
├─────────────────────────────────────────────────────────────────┤
│  • Routage de messages CEO ↔ Worker                             │
│  • Enregistrement Worker (rôle, capacités)                       │
│  • Suivi des tâches (activeTasks Map)                          │
│  • Sessions de débat (start_debate)                            │
│  • Diffusion d'état                                              │
└──────┬─────────────────┬──────────────────┬──────────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  architect  │   │    coder   │   │   reviewer  │
│   (GLM-5)  │   │   (GLM-5)  │   │  (Kimi-K2)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 🤖 Mapping Rôle → Modèle (25 rôles)

### 🔧 Ingénierie (8)

| Rôle | CLI par défaut | Justification |
|------|----------------|---------------|
| **architect** | claude | Raisonnement complexe, planification à long terme |
| **coder** | claude | Génération de code de niveau ingénieur |
| **coder-alt** | codex | Solutions diverses |
| **debugger** | claude | Analyse approfondie, outils terminal |
| **devops** | claude | Exécution rapide, opérations parallèles |
| **security** | claude | Analyse de sécurité approfondie |
| **performance** | claude | Analyse d'optimisation approfondie |
| **refactorer** | claude | Qualité du code et refactorisation |

### 🔬 Recherche & Analyse (4)

| Rôle | CLI par défaut | Justification |
|------|----------------|---------------|
| **researcher** | gemini | Contexte 256k, scraping parallèle |
| **analyst** | claude | Analyse de données et insights |
| **planner** | claude | Planification et ordonnancement des tâches |
| **advisor** | claude | Conseil technique et aide à la décision |

### 🎭 Méta & Débat (7)

| Rôle | CLI par défaut | Justification |
|------|----------------|---------------|
| **critic** | claude | Remettre en question et contester les hypothèses |
| **devils-advocate** | claude | Contester le consensus |
| **optimist** | claude | Se concentrer sur les bénéfices |
| **pessimist** | claude | Se concentrer sur les risques |
| **synthesizer** | claude | Synthèse et induction |
| **facilitator** | claude | Animer la discussion |
| **guardian** | claude | Vérification des limites et des risques |

---

## 🎙️ Mode Réunion de Débat ← Fonction Principale

Le CEO peut convoquer l'équipe à une réunion de débat:

```
CEO déclenche: "debate the microservices architecture?"
       ↓
┌─────────────────────────────────────────────────┐
│            Debate Meeting                        │
│                                                  │
│  Facilitator: "Round 1 - opening statements"   │
│                                                  │
│  Optimist: "Les microservices permettent..."     │
│  Pessimist: "Mais cela ajoute de la complexité..." │
│  Critic: "La proposition a XX problèmes..."      │
│  Devils-Advocate: "Je m'oppose parce que..."     │
│                                                  │
│  ... (3 tours par défaut)                      │
│                                                  │
│  Synthesizer: "Basé sur toutes les..."        │
│  Verdict final → CEO prend la décision         │
└─────────────────────────────────────────────────┘
```

**Phrases déclencheuses:** "debate..."、"discuss pros/cons"、"hold a meeting..."、"team evaluation"

---

## 🔄 Flux de Travail: Exécuter → Réviser → Améliorer

Chaque tâche suit ce flux obligatoire:

```
1. Exécuter → L'équipe Worker termine les tâches assignées
2. Réviser  → reviewer: contrôles qualité | guardian: contrôles limites
3. Améliorer → Coder traite les commentaires de révision
4. Terminé  → Résultat final avec toutes les améliorations
```

---

## 🚀 Démarrage Rapide

### 1. Installation

```bash
git clone https://github.com/shidu110/claw-squad.git
cd claw-squad
```

### 2. Configurer les clés API

| Fournisseur | Variable d'environnement | URL d'obtention |
|------------|--------------------------|-----------------|
| MiniMax | `MINIMAX_API_KEY` | platform.minimaxi.com |
| SiliconFlow | `SILICONFLOW_API_KEY` | console.siliconflow.cn |
| Anthropic | `ANTHROPIC_API_KEY` | console.anthropic.com |

### 3. Docker (démarrage en une commande)

```bash
docker-compose up -d
```

### 4. Démarrage Manuel

```bash
# Terminal 1: Démarrer Bridge Server
cd claw-squad-cli
npm run start:bridge

# Terminal 2: Démarrer Orchestrator
npm run start:orchestrator
```

---

## 📁 Structure du Projet

```
claw-squad/
├── claw-squad-core/      # Core: CEO Brain, Team Factory, config des rôles
├── claw-squad-cli/       # CLI: Bridge Server, MCP Bridge, Orchestrator
├── claw-squad-backend/    # Backend: API, gestion d'état
├── claw-squad-mcp/      # MCP Server: Intégration OpenClaw
├── claw-squad-ui/       # Web UI (optionnel)
├── examples/            # Exemples de tâches
└── tests/               # Suite de tests
```

---

## 🤝 Contribuer

Issues et PRs bienvenus!

## 📄 Licence

MIT
