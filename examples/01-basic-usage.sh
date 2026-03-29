#!/bin/bash
# Basic ClawSquad Usage Example
# 
# This script demonstrates the simplest way to use ClawSquad.
# 
# Prerequisites:
#   1. Install: npm install
#   2. Start Bridge Server (Terminal 1)
#   3. Start MCP Bridge (Terminal 2)

set -e

echo "=== ClawSquad Basic Usage Example ==="
echo ""

# Terminal 1: Start Bridge Server
echo "Step 1: Starting Bridge Server on port 9876..."
node claw-squad-cli/bridge-server.cjs --port=9876 &
BRIDGE_PID=$!
echo "Bridge Server started (PID: $BRIDGE_PID)"
echo ""

sleep 1

# Terminal 2: Start MCP Bridge  
echo "Step 2: Starting MCP Bridge..."
echo "Run this in another terminal:"
echo "  node claw-squad-mcp/bridge.cjs --port=9876"
echo ""

# Wait for user to start MCP Bridge
echo "Press Enter when MCP Bridge is ready..."
read

# Test basic functionality
echo "Step 3: Testing basic coordinate_team..."
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | \
  timeout 3 node claw-squad-mcp/bridge.cjs --port 9876 2>/dev/null | \
  grep -v "^\[MCP-Bridge\]" | head -1

echo ""
echo "Step 4: Spawning a coder worker..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"coordinate_team","arguments":{"task":"Write a Hello World in Python","roles":["coder"]}}}' | \
  timeout 8 node claw-squad-mcp/bridge.cjs --port 9876 2>/dev/null | \
  grep -v "^\[MCP-Bridge\]" | head -2

echo ""
echo "=== Done ==="

# Cleanup
kill $BRIDGE_PID 2>/dev/null || true
echo "Cleaned up Bridge Server"
