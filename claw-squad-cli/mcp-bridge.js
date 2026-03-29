#!/usr/bin/env node
/**
 * MCP Bridge - STDIO MCP Server for Worker CLI
 * 适配自 Dorchestrator/mcp-bridge.js
 * 
 * 使用方式:
 *   node mcp-bridge.js '{"agentId":"claude-1","bridgePort":9876,"connectedAgents":["worker-1","worker-2"]}'
 * 
 * 通过 STDIO 接收 MCP JSON-RPC 消息，通过 TCP 与 Bridge Server 通信
 */

'use strict';

const net = require('net');
const fs = require('fs');

// ---- 配置解析 ----
let agentId = 'unknown';
let bridgePort = 9876;
let connectedAgents = [];

const configPath = process.argv[2];
if (configPath) {
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    agentId = cfg.agentId || agentId;
    bridgePort = cfg.bridgePort || 9876;
    connectedAgents = cfg.connectedAgents || [];
  } catch (e) {
    process.stderr.write('[mcp-bridge] Config read error: ' + e.message + '\n');
  }
}

// ---- Bridge Server TCP 客户端 ----
let bridgeSocket = null;
let bridgeReady = false;
let pendingResponses = new Map();
let responseId = 0;

function connectBridge() {
  return new Promise((resolve) => {
    bridgeSocket = net.createConnection({ port: bridgePort, host: '127.0.0.1' }, () => {
      bridgeReady = true;
      process.stderr.write('[mcp-bridge] Connected to Bridge Server\n');
      
      // 注册 Worker
      bridgeSocket.write(JSON.stringify({
        type: 'register',
        workerId: agentId,
        role: 'worker',
        capabilities: ['execute', 'file-operations', 'search']
      }) + '\n');
      
      resolve();
    });

    let buf = '';
    bridgeSocket.on('data', (d) => {
      buf += d.toString();
      let newlineIdx;
      while ((newlineIdx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, newlineIdx).trim();
        buf = buf.slice(newlineIdx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          handleBridgeMessage(msg);
        } catch (e) {
          process.stderr.write('[mcp-bridge] Bridge parse error: ' + e.message + '\n');
        }
      }
    });

    bridgeSocket.on('close', () => {
      bridgeReady = false;
      process.stderr.write('[mcp-bridge] Bridge disconnected\n');
    });

    bridgeSocket.on('error', (e) => {
      process.stderr.write('[mcp-bridge] Bridge error: ' + e.message + '\n');
      bridgeReady = false;
    });
  });
}

function callBridge(payload) {
  return new Promise((resolve) => {
    if (!bridgeReady || !bridgeSocket) {
      return resolve({ success: false, error: 'Not connected to bridge' });
    }
    const rid = ++responseId;
    pendingResponses.set(rid, resolve);
    const msg = JSON.stringify({ ...payload, _bridgerid: rid }) + '\n';
    bridgeSocket.write(msg);
    
    setTimeout(() => {
      if (pendingResponses.has(rid)) {
        pendingResponses.delete(rid);
        resolve({ success: false, error: 'Timeout' });
      }
    }, 180000);
  });
}

function handleBridgeMessage(msg) {
  const { _bridgerid, type, from, message, taskId } = msg;

  if (_bridgerid !== undefined) {
    const resolve = pendingResponses.get(_bridgerid);
    if (resolve) {
      pendingResponses.delete(_bridgerid);
      resolve(msg);
    }
  }

  if (type === 'task' && from === 'ceo') {
    // 收到 CEO 任务 → 转发给 CLI stdin
    // CLI 会通过 stdout 返回结果，我们通过 MCP response 工具捕获
    process.stderr.write('[mcp-bridge] Task from CEO: ' + message?.slice(0, 100) + '\n');
    
    // 把任务写到 stderr 让 parent 知道（parent 可以通过管道捕获）
    // 实际由 parent process 读取 CLI stdout
  }

  if (type === 'broadcast' || type === 'shutdown') {
    process.stderr.write('[mcp-bridge] Broadcast: ' + message + '\n');
  }
}

// ---- MCP STDIO Server ----
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
  process.stdout.flush();
}

let lineBuf = '';
process.stdin.setEncoding('utf8');
process.stdin.resume();
process.stdin.on('data', (chunk) => {
  lineBuf += chunk;
  let newlineIdx;
  while ((newlineIdx = lineBuf.indexOf('\n')) !== -1) {
    const line = lineBuf.slice(0, newlineIdx).trim();
    lineBuf = lineBuf.slice(newlineIdx + 1);
    if (!line) continue;
    try {
      handleMcpMessage(JSON.parse(line));
    } catch (e) {
      process.stderr.write('[mcp-bridge] Parse error: ' + e.message + '\n');
    }
  }
});

async function handleMcpMessage(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    await connectBridge();
    send({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'absorpibridge-mcp', version: '1.0.0' },
      },
    });
    return;
  }

  if (method === 'notifications/initialized') return;
  if (method === 'ping') { send({ jsonrpc: '2.0', id, result: {} }); return; }

  if (method === 'tools/list') {
    const tools = [
      {
        name: 'send_message',
        description: 'Send message to another agent via Bridge Server. ' +
          'Connected: ' + connectedAgents.join(', ') || 'none',
        inputSchema: {
          type: 'object',
          properties: {
            target_agent_id: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['target_agent_id', 'message'],
        },
      },
      {
        name: 'report_result',
        description: 'Report task result back to CEO via Bridge Server',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['taskId', 'message'],
        },
      },
      {
        name: 'broadcast',
        description: 'Broadcast message to all connected agents',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
      },
    ];
    send({ jsonrpc: '2.0', id, result: { tools } });
    return;
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};

    if (name === 'send_message') {
      const { target_agent_id, message } = args || {};
      const result = await callBridge({
        type: 'task',
        taskId: 'task-' + Date.now(),
        from: agentId,
        to: target_agent_id,
        message,
        expectsResponse: false
      });
      send({
        jsonrpc: '2.0', id,
        result: {
          content: [{
            type: 'text',
            text: result.success
              ? `Message sent to ${target_agent_id}`
              : `Failed: ${result.error}`
          }],
        },
      });
      return;
    }

    if (name === 'report_result') {
      const { taskId, message } = args || {};
      const result = await callBridge({
        type: 'response',
        taskId: taskId || 'unknown',
        from: agentId,
        to: 'ceo',
        message
      });
      send({
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: 'Result reported to CEO' }] },
      });
      return;
    }

    if (name === 'broadcast') {
      const { message } = args || {};
      const result = await callBridge({ type: 'broadcast', from: agentId, message });
      send({
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: 'Broadcast sent' }] },
      });
      return;
    }

    send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Unknown tool: ' + name } });
    return;
  }

  if (id !== undefined) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } });
  }
}

process.on('uncaughtException', (e) => {
  process.stderr.write('[mcp-bridge] Uncaught: ' + e.message + '\n');
});
