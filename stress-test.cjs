#!/usr/bin/env node
/**
 * ClawSquad 压力测试 v2
 * 通过 MCP Bridge 进行测试
 */

const { spawn } = require('child_process');
const net = require('net');

const MCP_BRIDGE = '/home/shidu10/ClawSquad/claw-squad-mcp/bridge.cjs';
const BRIDGE_SERVER = '/home/shidu10/ClawSquad/claw-squad-cli/bridge-server.cjs';
const BRIDGE_PORT = 39999;

let mcpBridge = null;
let bridgeServer = null;
let socket = null;
let msgId = 0;
const pending = new Map();
let buf = '';

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11,23)}] ${msg}`);
}

function sendMCP(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId;
    const req = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    mcpBridge.stdin.write(req);
    
    pending.set(id, resolve);
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve({ error: 'timeout' });
      }
    }, 20000);
  });
}

function handleData(chunk) {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        const resolve = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg);
      }
      // Handle notifications too
      if (msg.method === 'notifications/progress') {
        log(`Progress: ${msg.params?.message || ''}`);
      }
    } catch (e) {
      // ignore parse errors
    }
  }
}

async function startBridge() {
  return new Promise((resolve) => {
    bridgeServer = spawn('node', [BRIDGE_SERVER, '--port', '' + BRIDGE_PORT], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    bridgeServer.stderr.on('data', (d) => {
      const line = d.toString().trim();
      if (line && !line.includes('启动')) log('[Bridge] ' + line);
    });
    
    setTimeout(resolve, 1500);
  });
}

async function startMCPBridge() {
  return new Promise((resolve) => {
    mcpBridge = spawn('node', [MCP_BRIDGE, '--port', '' + BRIDGE_PORT], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    mcpBridge.stderr.on('data', (d) => {
      const line = d.toString().trim();
      if (line && !line.includes('ClawSquad') && !line.includes('===')) {
        log('[MCP-Bridge] ' + line);
      }
    });
    
    mcpBridge.stdout.on('data', handleData);
    
    setTimeout(resolve, 1500);
  });
}

async function runTests() {
  log('═══ ClawSquad 压力测试 ═══\n');
  
  // Start Bridge Server
  log('启动 Bridge Server...');
  await startBridge();
  
  // Start MCP Bridge
  log('启动 MCP Bridge...');
  await startMCPBridge();
  
  let pass = 0, fail = 0;
  
  // Test 1: Initialize
  log('\n测试 1: Initialize');
  let r = await sendMCP('initialize', { protocolVersion: '2024-11-05' });
  if (r.result) {
    log('  ✓ 通过');
    pass++;
  } else {
    log('  ✗ 失败');
    fail++;
  }
  
  // Test 2: List tools
  log('\n测试 2: List tools');
  r = await sendMCP('tools/list', {});
  if (r.result?.tools?.length >= 10) {
    log('  ✓ 通过 - ' + r.result.tools.length + ' tools');
    pass++;
  } else {
    log('  ✗ 失败');
    fail++;
  }
  
  // Test 3: Spawn 1 worker
  log('\n测试 3: Spawn 1 worker');
  r = await sendMCP('tools/call', {
    name: 'coordinate_team',
    arguments: { task: '测试任务', roles: ['coder'] }
  });
  if (r.result) {
    log('  ✓ 通过');
    pass++;
  } else {
    log('  ✗ 失败: ' + (r.error?.message || 'unknown'));
    fail++;
  }
  
  // Test 4: Spawn 5 workers
  log('\n测试 4: Spawn 5 workers');
  r = await sendMCP('tools/call', {
    name: 'coordinate_team',
    arguments: { 
      task: '复杂测试任务', 
      roles: ['architect', 'coder', 'tester', 'reviewer', 'guardian'] 
    }
  });
  if (r.result) {
    log('  ✓ 通过 - 5 workers');
    pass++;
  } else {
    log('  ✗ 失败');
    fail++;
  }
  
  // Test 5: Cancel all
  log('\n测试 5: Cancel all');
  r = await sendMCP('tools/call', { name: 'cancel_all_tasks', arguments: {} });
  if (r.result) {
    log('  ✓ 通过');
    pass++;
  } else {
    log('  ✗ 失败');
    fail++;
  }
  
  // Test 6: Session
  log('\n测试 6: Session');
  r = await sendMCP('tools/call', { name: 'create_session', arguments: {} });
  r = await sendMCP('tools/call', { name: 'list_sessions', arguments: {} });
  if (r.result) {
    log('  ✓ 通过');
    pass++;
  } else {
    log('  ✗ 失败');
    fail++;
  }
  
  // Test 7: Rapid 10x spawn
  log('\n测试 7: 快速连续 10 次 spawn...');
  let ok = 0;
  for (let i = 0; i < 10; i++) {
    r = await sendMCP('tools/call', {
      name: 'coordinate_team',
      arguments: { task: `任务${i}`, roles: ['coder'] }
    });
    if (r.result) ok++;
  }
  if (ok >= 8) {
    log('  ✓ 通过 - ' + ok + '/10');
    pass++;
  } else {
    log('  ✗ 失败 - only ' + ok + '/10');
    fail++;
  }
  
  // Test 8: 20 workers
  log('\n测试 8: 20 workers');
  r = await sendMCP('tools/call', {
    name: 'coordinate_team',
    arguments: { task: '超大任务', roles: Array(20).fill('coder') }
  });
  if (r.result) {
    log('  ✓ 通过');
    pass++;
  } else {
    log('  ✗ 失败');
    fail++;
  }
  
  // Test 9: Long task (10KB)
  log('\n测试 9: 长任务 (10KB)');
  r = await sendMCP('tools/call', {
    name: 'coordinate_team',
    arguments: { task: 'x'.repeat(10 * 1024), roles: ['coder'] }
  });
  if (r.result) {
    log('  ✓ 通过');
    pass++;
  } else {
    log('  ✗ 失败');
    fail++;
  }
  
  // Test 10: Mixed operations
  log('\n测试 10: 混合操作 (cancel, spawn, list)');
  await sendMCP('tools/call', { name: 'cancel_all_tasks', arguments: {} });
  await new Promise(r => setTimeout(r, 200));
  r = await sendMCP('tools/call', {
    name: 'coordinate_team',
    arguments: { task: '混合测试', roles: ['tester', 'reviewer'] }
  });
  r = await sendMCP('tools/call', { name: 'get_workers', arguments: {} });
  if (r.result) {
    log('  ✓ 通过');
    pass++;
  } else {
    log('  ✗ 失败');
    fail++;
  }
  
  // Results
  log('\n═══════════════════════════════════════');
  log('  结果: ✓ ' + pass + '  ✗ ' + fail);
  log('═══════════════════════════════════════');
  
  // Cleanup
  mcpBridge.kill('SIGTERM');
  bridgeServer.kill('SIGTERM');
  
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => {
  log('Fatal: ' + e.message);
  if (mcpBridge) mcpBridge.kill();
  if (bridgeServer) bridgeServer.kill();
  process.exit(1);
});
