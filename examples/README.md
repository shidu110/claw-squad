# ClawSquad Examples

This directory contains examples for different ClawSquad usage scenarios.

## Quick Examples

### 1. Basic Usage
```bash
bash examples/01-basic-usage.sh
```
Demonstrates starting Bridge Server and MCP Bridge, then spawning a basic worker.

### 2. Multi-Model Team
```bash
bash examples/02-multi-model-team.sh
```
Shows how different roles automatically use different models:
- architect → GLM-5
- coder → GLM-5
- reviewer → Kimi-K2.5 (via Codex)
- tester → Kimi-K2.5 (via Codex)

### 3. tmux Mode (Visual Monitoring)
```bash
bash examples/03-tmux-mode.sh
```
Workers spawn in separate tmux windows for real-time visibility.

### 4. Cluster Mode
```bash
bash examples/04-cluster-mode.sh
```
Multi-bridge cluster with automatic model routing.

## Prerequisites

1. Install dependencies:
```bash
npm install
```

2. For tmux examples, ensure tmux is installed:
```bash
sudo apt install tmux  # Ubuntu/Debian
brew install tmux      # macOS
```

## Environment Setup

Copy `.env.example` to `.env` and configure your API keys:

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required environment variables:
- `SILICONFLOW_KIMI_API_KEY` - For Kimi-K2.5
- `SILICONFLOW_GLM_API_KEY` - For GLM-5
- `ANTHROPIC_API_KEY` - For Claude CLI (optional)
- `OPENAI_API_KEY` - For Codex CLI (optional)
