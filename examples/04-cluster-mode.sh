#!/bin/bash
# Cluster Mode Example
#
# This demonstrates multi-bridge cluster with different models.

set -e

echo "=== ClawSquad Cluster Mode Example ==="
echo ""

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
    echo "Error: tmux is not installed."
    exit 1
fi

# Kill existing tmux sessions
tmux kill-server 2>/dev/null || true

# Start Bridge Server
echo "Step 1: Starting Bridge Server..."
node claw-squad-cli/bridge-server.cjs --port=9876 &
BRIDGE_PID=$!

sleep 1

# Start Cluster Manager
echo "Step 2: Starting Bridge Cluster Manager..."
echo "This will spawn 3 bridges: MiniMax, Kimi, GLM"
echo ""

# Start cluster manager in tmux
tmux new-session -d -s clawsquad-cluster "node claw-squad-cli/bridge-cluster-manager.cjs --port=9877; read"

sleep 3

# Query cluster status
echo "Step 3: Querying cluster status..."
echo '{"type":"status"}' | nc localhost 9877

echo ""
echo "=== Cluster is running ==="
echo "Bridges:"
echo "  - bridge-minimax (MiniMax-M2.7)"
echo "  - bridge-kimi (Kimi-K2.5)"  
echo "  - bridge-glm (GLM-5)"
echo ""
echo "Press Enter to cleanup..."
read

# Cleanup
tmux kill-server 2>/dev/null || true
kill $BRIDGE_PID 2>/dev/null || true
echo "Done."
