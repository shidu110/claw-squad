#!/usr/bin/env node
/**
 * ClawSquad Basic Test Suite
 * 
 * Tests core functionality without requiring real API keys.
 * 
 * Usage: node test-basic.cjs
 */

'use strict';

const { spawn, execSync } = require('child_process');
const net = require('net');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(type, msg) {
  const color = type === 'pass' ? colors.green : type === 'fail' ? colors.red : type === 'info' ? colors.blue : colors.yellow;
  console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${msg}`);
}

// Test helpers
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendMCP(port, message) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    let data = '';
    
    socket.on('data', chunk => { data += chunk.toString(); });
    socket.on('end', () => resolve(data));
    socket.on('error', reject);
    
    socket.write(JSON.stringify(message) + '\n');
  });
}

async function test(name, fn) {
  try {
    await fn();
    log('pass', name);
    return true;
  } catch (e) {
    log('fail', `${name}: ${e.message}`);
    return false;
  }
}

// Tests
async function runTests() {
  console.log('\n=== ClawSquad Basic Test Suite ===\n');
  
  let passed = 0;
  let failed = 0;
  let bridgeProcess = null;
  let bridgeServerProcess = null;

  try {
    // Test 1: Check syntax of bridge.cjs
    await test('bridge.cjs syntax check', async () => {
      execSync('node --check claw-squad-mcp/bridge.cjs', { encoding: 'utf-8' });
    });

    // Test 2: Check syntax of bridge-server.cjs
    await test('bridge-server.cjs syntax check', async () => {
      execSync('node --check claw-squad-cli/bridge-server.cjs', { encoding: 'utf-8' });
    });

    // Test 3: Start Bridge Server
    await test('Bridge Server starts', async () => {
      bridgeServerProcess = spawn('node', ['claw-squad-cli/bridge-server.cjs', '--port=9876'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      await sleep(1000);
      if (bridgeServerProcess.exitCode !== null) {
        throw new Error('Bridge Server exited unexpectedly');
      }
    });

    // Test 4: Start MCP Bridge
    await test('MCP Bridge starts', async () => {
      bridgeProcess = spawn('node', ['claw-squad-mcp/bridge.cjs', '--port=9876'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      await sleep(2000);
      if (bridgeProcess.exitCode !== null) {
        throw new Error('MCP Bridge exited unexpectedly');
      }
    });

    // Test 5: Initialize
    await test('MCP Bridge initializes', async () => {
      const response = await sendMCP(9876, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      });
      const data = JSON.parse(response.trim());
      if (!data.result?.protocolVersion) {
        throw new Error('Invalid initialize response');
      }
    });

    // Test 6: Get tools list
    await test('Tools list available', async () => {
      const response = await sendMCP(9876, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      });
      const data = JSON.parse(response.trim());
      if (!data.result?.tools?.length) {
        throw new Error('No tools returned');
      }
    });

    // Test 7: Get metrics
    await test('Metrics endpoint works', async () => {
      const response = await sendMCP(9876, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'get_metrics',
          arguments: {}
        }
      });
      const data = JSON.parse(response.trim());
      if (!data.result?.content?.[0]?.text?.includes('ClawSquad Metrics')) {
        throw new Error('Invalid metrics response');
      }
    });

    // Test 8: List sessions
    await test('List sessions works', async () => {
      const response = await sendMCP(9876, {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'list_sessions',
          arguments: {}
        }
      });
      const data = JSON.parse(response.trim());
      if (!data.result) {
        throw new Error('Invalid list_sessions response');
      }
    });

    // Test 9: Graceful shutdown
    await test('Graceful shutdown', async () => {
      if (bridgeProcess) {
        bridgeProcess.kill('SIGTERM');
        await sleep(1000);
      }
      if (bridgeServerProcess) {
        bridgeServerProcess.kill('SIGTERM');
        await sleep(500);
      }
    });

    console.log('\n=== All tests passed! ===\n');
    process.exit(0);

  } catch (e) {
    log('fail', `Fatal error: ${e.message}`);
    
    // Cleanup
    if (bridgeProcess) bridgeProcess.kill();
    if (bridgeServerProcess) bridgeServerProcess.kill();
    
    console.log('\n=== Tests failed ===\n');
    process.exit(1);
  }
}

// Cleanup on exit
process.on('exit', () => {
  execSync('tmux kill-server 2>/dev/null || true', { encoding: 'utf-8', stdio: 'ignore' });
});

runTests();
