#!/bin/bash
# tmux Mode Example
#
# This demonstrates visual monitoring with tmux.
# Workers spawn in separate tmux windows for real-time visibility.

set -e

echo "=== ClawSquad tmux Mode Example ==="
echo ""

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
    echo "Error: tmux is not installed."
    echo "Install with: sudo apt install tmux"
    exit 1
fi

# Kill any existing tmux sessions for cleanliness
tmux kill-server 2>/dev/null || true

# Start Bridge Server
echo "Step 1: Starting Bridge Server..."
node claw-squad-cli/bridge-server.cjs --port=9876 &
BRIDGE_PID=$!

sleep 1

# Start MCP Bridge in tmux mode
echo "Step 2: Starting MCP Bridge in tmux mode..."
echo "Workers will spawn in tmux windows."
echo ""

# Launch MCP Bridge with tmux mode
tmux new-session -d -s clawsquad-test "CLAWSQUAD_TMUX=1 node claw-squad-mcp/bridge.cjs --port=9876; read"

sleep 2

echo "Step 3: Spawning a team..."
echo ""

# Spawn team
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | \
  timeout 3 node claw-squad-mcp/bridge.cjs --port 9876 2>/dev/null | \
  grep -v "^\[MCP-Bridge\]" | head -1

echo ""
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"coordinate_team","arguments":{"task":"Build a simple calculator CLI","roles":["coder","tester"]}}}' | \
  timeout 8 node claw-squad-mcp/bridge.cjs --port 9876 2>/dev/null | \
  grep -v "^\[MCP-Bridge\]" | head -2

echo ""
echo "=== Check tmux session ==="
echo "Run: tmux attach-session -t clawsquad-test"
echo "You should see workers in separate windows."
echo ""
echo "Press Enter to cleanup..."
read

# Show tmux windows
echo "tmux windows:"
tmux list-windows -t clawsquad-test 2>/dev/null || echo "No session"

# Cleanup
echo "Cleaning up..."
tmux kill-server 2>/dev/null || true
kill $BRIDGE_PID 2>/dev/null || true
echo "Done."
