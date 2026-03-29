#!/bin/bash
# Multi-Model Team Example
#
# This demonstrates spawning a team with different models for different roles.
# Each role automatically uses the optimal model.

set -e

echo "=== ClawSquad Multi-Model Team Example ==="
echo ""

# Start Bridge Server
echo "Starting Bridge Server..."
node claw-squad-cli/bridge-server.cjs --port=9876 &
BRIDGE_PID=$!

sleep 1

# Spawn a full team with different roles (automatically mapped to different models)
echo ""
echo "Spawning a full team: architect + coder + reviewer + tester"
echo ""

# The roles will automatically use:
#   architect → GLM-5 (complex reasoning)
#   coder    → GLM-5 (engineering)
#   reviewer → Kimi-K2.5 (parallel review via codex)
#   tester   → Kimi-K2.5 (parallel test via codex)

echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | \
  timeout 3 node claw-squad-mcp/bridge.cjs --port 9876 2>/dev/null | \
  grep -v "^\[MCP-Bridge\]" | head -1

echo ""
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"coordinate_team","arguments":{"task":"Implement a REST API for a todo list with Express.js","roles":["architect","coder","reviewer","tester"]}}}' | \
  timeout 10 node claw-squad-mcp/bridge.cjs --port 9876 2>/dev/null | \
  grep -v "^\[MCP-Bridge\]" | head -3

echo ""
echo "=== Team spawned! ==="
echo "Use tmux mode (CLAWSQUAD_TMUX=1) to monitor workers visually."
echo ""

# Get metrics
echo "Getting metrics..."
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_metrics","arguments":{}}}' | \
  timeout 5 node claw-squad-mcp/bridge.cjs --port 9876 2>/dev/null | \
  grep -v "^\[MCP-Bridge\]"

# Cleanup
kill $BRIDGE_PID 2>/dev/null || true
echo ""
echo "Cleaned up."
