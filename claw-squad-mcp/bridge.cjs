#!/usr/bin/env node
/**
 * MCP Bridge - ClawSquad v2.4
 * 
 * OpenClaw ↔ Bridge Server 桥接
 * 
 * 功能:
 * - 通过 STDIO 与 OpenClaw 通信
 * - 通过 TCP 与 Bridge Server 通信
 * - 进度通知 (progress notifications)
 * - Session 管理 (任务可恢复)
 * 
 * Usage: node bridge.cjs [--host 127.0.0.1] [--port 9876]
 */

const net = require('net');
const readline = require('readline');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');

// ====================
// 常量配置
// ====================
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 9876;

// 超时配置 (ms)
const REQUEST_TIMEOUT = 60000;
const CLEANUP_INTERVAL = 30000;
const RECONNECT_TIMEOUT = 5000;
const WORKER_TIMEOUT = 3000;

const MAX_RECONNECT_ATTEMPTS = 10;

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  let host = DEFAULT_HOST;
  let port = DEFAULT_PORT;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host' && args[i + 1]) host = args[++i];
    else if (args[i] === '--port' && args[i + 1]) port = parseInt(args[++i]);
  }
  return { host, port };
}

const { host, port } = parseArgs();

// ====================
// Metrics (Prometheus-style)
// ====================
const metrics = {
  tasksReceived: 0,
  tasksCompleted: 0,
  tasksFailed: 0,
  workersSpawned: 0,
  workersKilled: 0,
  requestsPending: 0,
  requestsTimedOut: 0,
  reconnectAttempts: 0,
  startTime: Date.now()
};

function getMetrics() {
  return {
    ...metrics,
    uptime: Date.now() - metrics.startTime,
    workersActive: Array.from(spawnedWorkers.values()).filter(w => w.status === 'busy').length,
    workersIdle: Array.from(spawnedWorkers.values()).filter(w => w.status === 'idle' || w.status === 'pooled').length,
    poolSize: Array.from(workerPool.values()).reduce((sum, q) => sum + q.length, 0)
  };
}

// ====================
// Session 管理
// ====================

const MAX_SESSIONS = 100;
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24小时

class SessionStorage {
  constructor() {
    this.sessions = new Map();
  }

  createSession() {
    this.cleanupExpired();
    const id = randomUUID();
    const now = new Date();
    this.sessions.set(id, {
      id,
      createdAt: now,
      lastAccessedAt: now,
      turns: [],
      status: 'idle',      // idle | executing | completed | failed
      taskId: null,
      context: {}
    });
    this.enforceMax();
    return id;
  }

  getSession(id) {
    const session = this.sessions.get(id);
    if (session) {
      session.lastAccessedAt = new Date();
    }
    return session;
  }

  updateSession(id, data) {
    const session = this.sessions.get(id);
    if (session) {
      Object.assign(session, data);
      session.lastAccessedAt = new Date();
    }
  }

  addTurn(sessionId, turn) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.turns.push({
        ...turn,
        timestamp: new Date()
      });
    }
  }

  resetSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.turns = [];
      session.status = 'idle';
      session.taskId = null;
      session.context = {};
    }
  }

  deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  listSessions() {
    this.cleanupExpired();
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      lastAccessedAt: s.lastAccessedAt,
      status: s.status,
      turnCount: s.turns.length
    }));
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessedAt.getTime() > SESSION_TTL) {
        this.sessions.delete(id);
      }
    }
  }

  enforceMax() {
    if (this.sessions.size > MAX_SESSIONS) {
      let oldest = null;
      let oldestTime = Infinity;
      for (const [id, session] of this.sessions) {
        if (session.lastAccessedAt.getTime() < oldestTime) {
          oldestTime = session.lastAccessedAt.getTime();
          oldest = id;
        }
      }
      if (oldest) this.sessions.delete(oldest);
    }
  }
}

const sessionStorage = new SessionStorage();

// ====================
// Worker 管理 (自动 spawn)
// ====================

const CLI_CONFIGS = {
  claude: {
    command: 'claude',
    args: ['--print', '--permission-mode', 'bypassPermissions'],
    apiKeyEnv: 'ANTHROPIC_API_KEY'
  },
  codex: {
    command: 'codex',
    args: ['--full-auto'],
    apiKeyEnv: 'OPENAI_API_KEY'
  },
  opencode: {
    command: 'opencode',
    args: ['run'],
    apiKeyEnv: 'OPENAI_API_KEY'
  },
  gemini: {
    command: 'gemini',
    args: [],
    apiKeyEnv: 'GOOGLE_API_KEY'
  }
};

// Worker 角色默认映射
const ROLE_CLI_MAP = {
  architect: 'claude',
  coder: 'claude',
  'coder-alt': 'codex',
  debugger: 'claude',
  devops: 'claude',
  security: 'claude',
  performance: 'claude',
  researcher: 'gemini',
  analyst: 'claude',
  planner: 'claude',
  advisor: 'claude',
  reviewer: 'claude',
  tester: 'codex',
  qa: 'claude',
  'tech-writer': 'claude',
  pm: 'claude',
  critic: 'claude',
  'devils-advocate': 'claude',
  optimist: 'claude',
  pessimist: 'claude',
  synthesizer: 'claude',
  facilitator: 'claude',
  guardian: 'claude',
  utility: 'opencode',
  explorer: 'claude',
  refactorer: 'claude'
};

// ====================
// Worker Pool 配置 (预启动空闲 Worker)
// ====================
const WORKER_POOL_CONFIG = {
  enabled: process.env.CLAWSQUAD_POOL === '1',
  minIdle: parseInt(process.env.CLAWSQUAD_POOL_MIN) || 1,  // 每个角色最少空闲数
  maxIdle: parseInt(process.env.CLAWSQUAD_POOL_MAX) || 3   // 每个角色最大空闲数
};

// Worker 池 (角色 → idle worker 队列)
const workerPool = new Map();  // role → Queue<workerId>

// 在 spawnWorker 时检查，而不是模块加载时
let tmuxBackend = null;

const spawnedWorkers = new Map();  // workerId → { cli, process, role, tmuxSession?, tmuxWindow? }
const tmuxSessions = new Map();   // teamName → sessionName (复用 session)
let workerIdCounter = 0;

// 延迟加载 tmux backend
function getTmuxBackend() {
  if (!tmuxBackend) {
    try {
      tmuxBackend = require('../claw-squad-cli/tmux-backend.cjs');
      log('Tmux backend loaded');
    } catch (e) {
      log('Tmux backend not available:', e.message);
    }
  }
  return tmuxBackend;
}

/**
 * 自动 Spawn Worker
 * 
 * @param {string} role - Worker 角色
 * @param {string} cliType - CLI 类型 (claude/codex/gemini/opencode)
 * @param {string} teamName - Team 名称 (用于 tmux session)
 */
function spawnWorker(role, cliType, teamName = 'default') {
  const cli = CLI_CONFIGS[cliType] || CLI_CONFIGS.claude;
  const workerId = `${role}-${++workerIdCounter}`;
  
  log(`Spawning worker ${workerId} (${cliType}) for role ${role}`);
  
  // 优先使用 tmux backend
  if (process.env.CLAWSQUAD_TMUX === '1') {
    const backend = getTmuxBackend();
    if (backend) {
      try {
        // 使用 getOrCreateSession 复用现有 session
        const sessionName = backend.getOrCreateSession(teamName);
        
        // Spawn 到 tmux window
        backend.spawnWorker(sessionName, workerId, role, cli.command, cli.args);
        
        const workerInfo = {
          id: workerId,
          role,
          cli: cliType,
          status: 'idle',
          tmuxSession: sessionName,
          tmuxWindow: workerId,
          startedAt: Date.now()
        };
        
        spawnedWorkers.set(workerId, workerInfo);
        
        log(`Worker ${workerId} spawned in tmux session ${sessionName}`);
        return workerId;
      } catch (e) {
        log(`Tmux spawn failed, falling back to subprocess: ${e.message}`);
      }
    }
  }
  
  // 回退到 subprocess
  const proc = spawn(cli.command, cli.args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
    detached: false
  });
  
  const workerInfo = {
    id: workerId,
    role,
    cli: cliType,
    status: 'idle',
    process: proc,
    startedAt: Date.now()
  };
  
  spawnedWorkers.set(workerId, workerInfo);
  
  // 捕获输出
  proc.stdout?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(`[${workerId}]: ${output.slice(0, 100)}`);
      // 转发到 Bridge Server
      sendToBridge({
        type: 'worker:output',
        from: workerId,
        output
      });
    }
  });
  
  proc.stderr?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(`[${workerId} stderr]: ${output.slice(0, 100)}`);
    }
  });
  
  proc.on('exit', (code) => {
    log(`Worker ${workerId} exited with code ${code}`);
    spawnedWorkers.delete(workerId);
  });
  
  proc.on('error', (err) => {
    log(`Worker ${workerId} error: ${err.message}`);
    spawnedWorkers.delete(workerId);
  });
  
  return workerId;
}

/**
 * 获取或创建 Worker (优先从池中取)
 */
function getOrCreateWorker(role) {
  const cliType = ROLE_CLI_MAP[role] || 'claude';
  
  // 1. 尝试从池中获取 idle worker
  if (WORKER_POOL_CONFIG.enabled && workerPool.has(role)) {
    const pool = workerPool.get(role);
    if (pool.length > 0) {
      const workerId = pool.shift();
      const worker = spawnedWorkers.get(workerId);
      if (worker && worker.status !== 'dead') {
        worker.status = 'idle';
        log(`Pool: reusing worker ${workerId} for role ${role}`);
        return workerId;
      }
    }
  }
  
  // 2. 检查是否有现成的空闲 Worker (非池化)
  for (const [workerId, worker] of spawnedWorkers) {
    if (worker.role === role && worker.status !== 'busy' && worker.status !== 'dead') {
      return workerId;
    }
  }
  
  // 3. Spawn 新的 Worker
  return spawnWorker(role, cliType);
}

/**
 * 将 Worker 归还到池中 (如果池未满)
 */
function returnToPool(workerId, role) {
  if (!WORKER_POOL_CONFIG.enabled) return;
  
  if (!workerPool.has(role)) {
    workerPool.set(role, []);
  }
  
  const pool = workerPool.get(role);
  if (pool.length < WORKER_POOL_CONFIG.maxIdle) {
    const worker = spawnedWorkers.get(workerId);
    if (worker) {
      pool.push(workerId);
      worker.status = 'pooled';
      log(`Pool: stored worker ${workerId} for role ${role} (pool size: ${pool.length})`);
    }
  }
}

/**
 * 初始化 Worker 池 (预热)
 */
function initWorkerPool() {
  if (!WORKER_POOL_CONFIG.enabled) {
    log('Worker pool disabled (set CLAWSQUAD_POOL=1 to enable)');
    return;
  }
  
  log(`Initializing worker pool (minIdle: ${WORKER_POOL_CONFIG.minIdle}, maxIdle: ${WORKER_POOL_CONFIG.maxIdle})`);
  
  // 预热常见角色
  const warmupRoles = ['coder', 'reviewer', 'architect'];
  
  for (const role of warmupRoles) {
    for (let i = 0; i < WORKER_POOL_CONFIG.minIdle; i++) {
      const workerId = spawnWorker(role, ROLE_CLI_MAP[role] || 'claude');
      // Mark as pooled immediately
      const worker = spawnedWorkers.get(workerId);
      if (worker) {
        worker.status = 'pooled';
      }
    }
    workerPool.set(role, []);
    log(`Pool: pre-spawned ${WORKER_POOL_CONFIG.minIdle} workers for role ${role}`);
  }
}

/**
 * 获取所有已 Spawn 的 Worker
 */
function getSpawnedWorkers() {
  return Array.from(spawnedWorkers.values()).map(w => ({
    id: w.id,
    role: w.role,
    cli: w.cli,
    status: w.process?.killed ? 'dead' : 'alive'
  }));
}

/**
 * Kill 所有 Worker
 */
function killAllWorkers() {
  const tmuxBackend = getTmuxBackend();
  
  for (const [workerId, worker] of spawnedWorkers) {
    log(`Killing worker ${workerId}`);
    
    if (worker.tmuxSession && tmuxBackend) {
      // tmux worker - kill window
      try {
        tmuxBackend.killWorker(workerId);
      } catch (e) {
        log(`Tmux kill error: ${e.message}`);
      }
    } else if (worker.process) {
      // subprocess worker
      worker.process.kill('SIGTERM');
    }
  }
  spawnedWorkers.clear();
  tmuxSessions.clear();
  
  // 清理 tmux sessions
  if (tmuxBackend) {
    try {
      tmuxBackend.cleanup();
      log('Tmux sessions cleaned up');
    } catch (e) {
      // ignore
    }
  }
}

// ====================
// Bridge Server 连接
// ====================

let bridgeSocket = null;
let bridgeReady = false;
let messageBuffer = '';
let mcpIdCounter = 0;
const pendingRequests = new Map();
const pendingRequestCreatedAt = new Map(); // id → timestamp
const progressCallbacks = new Map();

// ====================
// Pending Request 超时清理
// ====================

setInterval(() => {
  const now = Date.now();
  for (const [id, _] of pendingRequests) {
    if (pendingRequestCreatedAt.has(id) && now - pendingRequestCreatedAt.get(id) > REQUEST_TIMEOUT) {
      pendingRequests.delete(id);
      pendingRequestCreatedAt.delete(id);
      progressCallbacks.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

// 日志
function log(...args) {
  console.error('[MCP-Bridge]', ...args);
}

// ====================
// Bridge Server 自动重连
// ====================
let reconnectAttempts = 0;


function scheduleReconnect() {
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    log('Max reconnect attempts reached, giving up');
    return;
  }
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;
  metrics.reconnectAttempts++;
  log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
  setTimeout(() => {
    connectToBridge().catch(() => {});
  }, delay);
}

// 连接到 Bridge Server
function connectToBridge() {
  return new Promise((resolve, reject) => {
    log(`Connecting to Bridge Server at ${host}:${port}...`);
    
    bridgeSocket = net.createConnection({ port, host }, () => {
      bridgeReady = true;
      log('Connected to Bridge Server');
      
      // 注册自身
      sendToBridge({
        type: 'register',
        agentId: 'mcp-bridge',
        role: 'ceo',
        cli: 'openclaw',
        capabilities: ['execute', 'coordinate', 'delegate']
      });
      
      resolve();
    });

    bridgeSocket.on('data', (data) => {
      messageBuffer += data.toString();
      processBridgeMessages();
    });

    bridgeSocket.on('close', () => {
      bridgeReady = false;
      log('Disconnected from Bridge Server');
      scheduleReconnect();
    });

    bridgeSocket.on('error', (err) => {
      log('Bridge error:', err.message);
      bridgeReady = false;
      scheduleReconnect();
    });

    setTimeout(() => {
      if (!bridgeReady) reject(new Error('Connection timeout'));
    }, 5000);
  });
}

// 处理 Bridge Server 消息
function processBridgeMessages() {
  const lines = messageBuffer.split('\n');
  messageBuffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      handleBridgeMessage(msg);
    } catch (e) {
      // 忽略
    }
  }
}

// 处理 Bridge 消息
function handleBridgeMessage(msg) {
  const { type, taskId, from, message, progress } = msg;

  if (type === 'response' && taskId) {
    // 完整响应
    const resolve = pendingRequests.get(taskId);
    if (resolve) {
      pendingRequests.delete(taskId);
      resolve({ from, message });
    }
    
    // 清理 progress 回调
    progressCallbacks.delete(taskId);
    
    // 更新 session
    const session = sessionStorage.getSession(from);
    if (session) {
      sessionStorage.addTurn(from, { prompt: taskId, response: message });
      sessionStorage.updateSession(from, { status: 'completed' });
    }
    
    // 发送 MCP 响应
    sendMCPResponse(taskId, from, message);
  }

  if (type === 'progress' && taskId) {
    // 进度更新 → 发送 progress 通知
    const progressToken = progressCallbacks.get(taskId);
    if (progressToken) {
      sendProgressNotification(progressToken, message, progress);
    }
  }

  if (type === 'cancel_result') {
    // 取消结果 - 使用 requestId 匹配
    const resolve = pendingRequests.get(msg.requestId);
    if (resolve) {
      pendingRequests.delete(msg.requestId);
      resolve({ success: msg.success, message: msg.message, cancelledTasks: msg.cancelledTasks });
    }
    
    // 清理所有相关的 progress 回调
    for (const [tid] of progressCallbacks) {
      if (tid.startsWith('mcp-')) {
        progressCallbacks.delete(tid);
      }
    }
  }
  
  if (type === 'task_cancelled') {
    // 任务被取消
    progressCallbacks.delete(taskId);
    const resolve = pendingRequests.get(taskId);
    if (resolve) {
      pendingRequests.delete(taskId);
      resolve({ cancelled: true, taskId });
    }
  }

  if (type === 'active_tasks') {
    // 活跃任务列表
    const resolve = pendingRequests.get('mcp-active-tasks');
    if (resolve) {
      pendingRequests.delete('mcp-active-tasks');
      resolve(msg);
    }
  }

  if (type === 'worker:output') {
    log(`[${from}]: ${message?.slice(0, 100)}`);
  }

  if (type === 'status') {
    log('Bridge status:', msg);
  }
}

// 发送到 Bridge Server
function sendToBridge(msg) {
  if (bridgeSocket && !bridgeSocket.destroyed) {
    bridgeSocket.write(JSON.stringify(msg) + '\n');
  }
}

// ====================
// MCP STDIO 通信
// ====================

// 发送 MCP JSON-RPC 响应
function sendMCPResponse(taskId, from, message) {
  const response = {
    jsonrpc: '2.0',
    id: taskId,
    result: {
      content: [{
        type: 'text',
        text: `[${from}]: ${message || '(no message)'}`
      }]
    }
  };
  process.stdout.write(JSON.stringify(response) + '\n');
}

// 发送 MCP 进度通知
function sendProgressNotification(progressToken, message, progress) {
  const notification = {
    jsonrpc: '2.0',
    method: 'notifications/progress',
    params: {
      progressToken,
      progress: progress || 0,
      message: message || ''
    }
  };
  process.stdout.write(JSON.stringify(notification) + '\n');
}

// 发送 MCP JSON-RPC 错误
function sendMCPError(id, code, message) {
  const response = {
    jsonrpc: '2.0',
    id,
    error: { code, message }
  };
  process.stdout.write(JSON.stringify(response) + '\n');
}

// 发送 MCP JSON-RPC 成功
function sendMCPResult(id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result
  };
  process.stdout.write(JSON.stringify(response) + '\n');
}

// MCP STDIO 输入处理
function handleMCPInput(line, progressToken) {
  try {
    const msg = JSON.parse(line);
    const { id, method, params } = msg;

    switch (method) {
      case 'initialize':
        sendMCPResult(id, {
          protocolVersion: '2024-11-05',
          capabilities: { 
            tools: {},
            notifications: true  // 支持进度通知
          },
          serverInfo: { name: 'clawsquad-mcp', version: '2.3.0' }
        });
        break;

      case 'notifications/initialized':
        break;

      case 'ping':
        sendMCPResult(id, {});
        break;

      case 'tools/list':
        sendMCPResult(id, { tools: getTools() });
        break;

      case 'tools/call':
        handleToolCall(id, params, progressToken);
        break;

      default:
        if (id !== undefined) {
          sendMCPError(id, -32601, `Method not found: ${method}`);
        }
    }
  } catch (e) {
    log('MCP parse error:', e.message);
  }
}

// 获取工具列表
function getTools() {
  return [
    {
      name: 'create_session',
      description: '创建新 Session (用于跟踪任务历史)',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'send_task',
      description: '发送任务给 Worker (通过 Bridge Server)',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID (可选，用于跟踪)' },
          workerId: { type: 'string', description: '目标 Worker ID' },
          task: { type: 'string', description: '任务描述' },
          expectsResponse: { type: 'boolean', default: true }
        },
        required: ['workerId', 'task']
      }
    },
    {
      name: 'broadcast',
      description: '向所有 Worker 广播消息',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: '广播消息' }
        },
        required: ['message']
      }
    },
    {
      name: 'get_workers',
      description: '获取 Bridge Server 上所有 Worker 状态',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_metrics',
      description: '获取 ClawSquad 运行指标 (Prometheus-style)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'start_debate',
      description: '启动辩论会议',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: '辩论主题' },
          participants: { 
            type: 'array', 
            items: { type: 'string' },
            description: '参与者角色列表' 
          }
        },
        required: ['topic']
      }
    },
    {
      name: 'get_active_tasks',
      description: '获取所有正在执行的任务 (BTW 模式关键！)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'cancel_task',
      description: '取消指定任务 (BTW 模式关键！)',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '要取消的任务 ID' }
        },
        required: ['taskId']
      }
    },
    {
      name: 'cancel_all_tasks',
      description: '取消所有正在执行的任务',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'coordinate_team',
      description: '协调团队执行任务 (主入口)',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID (可选)' },
          task: { type: 'string', description: '任务描述' },
          roles: { 
            type: 'array', 
            items: { type: 'string' },
            description: '需要的角色列表 (如 ["architect","coder"])' 
          }
        },
        required: ['task']
      }
    },
    {
      name: 'list_sessions',
      description: '列出所有活跃 Session',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_session',
      description: '获取 Session 详情',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID' }
        },
        required: ['sessionId']
      }
    },
    {
      name: 'reset_session',
      description: '重置 Session (清除历史)',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID' }
        },
        required: ['sessionId']
      }
    }
  ];
}

// 处理工具调用
function handleToolCall(id, params, progressToken) {
  const { name, arguments: args } = params || {};
  const taskId = `mcp-${++mcpIdCounter}`;

  switch (name) {
    case 'create_session': {
      const sessionId = sessionStorage.createSession();
      sendMCPResult(id, {
        content: [{ type: 'text', text: `Session created: ${sessionId}` }]
      });
      break;
    }

    case 'send_task': {
      const { sessionId, workerId, task, expectsResponse } = args;
      
      // 记录到 session
      if (sessionId) {
        const session = sessionStorage.getSession(sessionId);
        if (session) {
          sessionStorage.updateSession(sessionId, { status: 'executing', taskId: taskId });
          sessionStorage.addTurn(sessionId, { prompt: task, response: null });
          
          // 注册进度回调
          if (progressToken) {
            progressCallbacks.set(taskId, progressToken);
          }
        }
      }
      
      sendToBridge({
        type: 'task',
        taskId,
        to: workerId,
        from: 'ceo',
        message: task,
        expectsResponse: expectsResponse ?? true
      });
      
      sendMCPResult(id, { 
        content: [{ type: 'text', text: `Task sent to ${workerId}${sessionId ? ` (session: ${sessionId})` : ''}` }]
      });
      break;
    }

    case 'broadcast': {
      sendToBridge({
        type: 'broadcast',
        from: 'ceo',
        message: args.message
      });
      sendMCPResult(id, { 
        content: [{ type: 'text', text: 'Broadcast sent' }]
      });
      break;
    }

    case 'get_workers': {
      // 获取 Bridge Server 上的 Worker
      sendToBridge({ type: 'status' });
      
      // 同时返回本地 Spawn 的 Worker
      const localWorkers = getSpawnedWorkers();
      
      pendingRequests.set(taskId, (result) => {
      pendingRequestCreatedAt.set(taskId, Date.now());
        sendMCPResult(id, { 
          content: [{ 
            type: 'text', 
            text: `Bridge Workers: ${JSON.stringify(result?.workers || [], null, 2)}\n\nSpawned Workers (local):\n${localWorkers.map(w => `  ${w.id} (${w.role}, ${w.cli}, ${w.status})`).join('\n') || '  none'}`
          }]
        });
      });
      setTimeout(() => {
        if (pendingRequests.has(taskId)) {
          pendingRequests.delete(taskId);
          sendMCPResult(id, { content: [{ type: 'text', text: 'Workers: (awaiting bridge status...)' }] });
        }
      }, 3000);
      break;
    }

    case 'start_debate': {
      sendToBridge({
        type: 'debate',
        from: 'ceo',
        topic: args.topic,
        participants: args.participants || ['optimist', 'pessimist', 'critic', 'synthesizer']
      });
      sendMCPResult(id, { 
        content: [{ type: 'text', text: `Debate started: ${args.topic}` }]
      });
      break;
    }

    case 'get_metrics': {
      const m = getMetrics();
      const lines = [
        '=== ClawSquad Metrics ===',
        `Uptime: ${Math.floor(m.uptime / 1000)}s`,
        `Tasks: ${m.tasksCompleted} completed, ${m.tasksFailed} failed`,
        `Workers: ${m.workersSpawned} spawned, ${m.workersKilled} killed`,
        `Active: ${m.workersActive} busy, ${m.workersIdle} idle`,
        `Pool: ${m.poolSize} pooled workers`,
        `Pending: ${m.requestsPending} requests`,
        `Timeouts: ${m.requestsTimedOut} timed out`,
        `Reconnects: ${m.reconnectAttempts} attempts`
      ];
      sendMCPResult(id, {
        content: [{ type: 'text', text: lines.join('\n') }]
      });
      break;
    }

    case 'get_active_tasks': {
      // 获取所有活跃任务
      const taskId = `mcp-${++mcpIdCounter}`;
      sendToBridge({ type: 'get_active_tasks' });
      
      pendingRequests.set(taskId, (result) => {
      pendingRequestCreatedAt.set(taskId, Date.now());
        sendMCPResult(id, {
          content: [{
            type: 'text',
            text: result.tasks && result.tasks.length > 0
              ? `Active Tasks (${result.count}):\n${result.tasks.map(t => 
                  `  ${t.taskId} [${t.status}] on ${t.workerId} (${t.age})`
                ).join('\n')}`
              : 'No active tasks running'
          }]
        });
      });
      
      setTimeout(() => {
        if (pendingRequests.has(taskId)) {
          pendingRequests.delete(taskId);
          sendMCPResult(id, { content: [{ type: 'text', text: 'No active tasks' }] });
        }
      }, 3000);
      break;
    }

    case 'cancel_task': {
      const { taskId } = args;
      sendToBridge({ type: 'cancel_task', taskId });
      
      pendingRequests.set(taskId, (result) => {
      pendingRequestCreatedAt.set(taskId, Date.now());
        sendMCPResult(id, {
          content: [{
            type: 'text',
            text: result.success
              ? `✓ Task ${taskId} cancelled`
              : `✗ ${result.message || 'Failed to cancel task'}`
          }]
        });
      });
      
      setTimeout(() => {
        if (pendingRequests.has(taskId)) {
          pendingRequests.delete(taskId);
          sendMCPResult(id, { content: [{ type: 'text', text: `Cancel request sent for ${taskId}` }] });
        }
      }, 3000);
      break;
    }

    case 'cancel_all_tasks': {
      const reqId = `mcp-cancel-all-${++mcpIdCounter}`;
      
      // 先取消 Bridge Server 上的任务
      sendToBridge({ type: 'cancel_all', requestId: reqId });
      
      // 同时 Kill 所有本地 Spawn 的 Worker
      const workers = getSpawnedWorkers();
      killAllWorkers();
      
      pendingRequests.set(reqId, (result) => {
      pendingRequestCreatedAt.set(reqId, Date.now());
        sendMCPResult(id, {
          content: [{
            type: 'text',
            text: `✓ ${result.message || 'All tasks cancelled on bridge'}\n✓ Killed ${workers.length} spawned workers\nCancelled: ${(result.cancelledTasks || []).join(', ') || 'none'}`
          }]
        });
      });
      
      setTimeout(() => {
        if (pendingRequests.has(reqId)) {
          pendingRequests.delete(reqId);
          sendMCPResult(id, { content: [{ type: 'text', text: 'Cancel request sent' }] });
        }
      }, 3000);
      break;
    }

    case 'coordinate_team': {
      const { sessionId, task, roles } = args;
      const roleList = roles || ['coder'];
      const activeSessionId = sessionId || sessionStorage.createSession();
      
      // 更新 session 状态
      sessionStorage.updateSession(activeSessionId, { status: 'executing', taskId: taskId });
      
      // 注册进度回调
      if (progressToken) {
        progressCallbacks.set(taskId, progressToken);
        sendProgressNotification(progressToken, `Spawning team (${roleList.length} workers)...`, 5);
      }
      
      // 自动 Spawn Workers
      const spawnedWorkerIds = [];
      for (const role of roleList) {
        const workerId = getOrCreateWorker(role);
        spawnedWorkerIds.push({ role, workerId });
      }
      
      // 发送进度 - Worker 已 Spawn，继续分发任务
      if (progressToken) {
        sendProgressNotification(progressToken, `Workers spawned, dispatching tasks...`, 30);
      }
      
      // 分发任务 (Worker 会在后台连接到 Bridge)
      for (let i = 0; i < spawnedWorkerIds.length; i++) {
        const { role, workerId } = spawnedWorkerIds[i];
        const subTaskId = `${taskId}-${role}`;
        
        // 发送任务到 Bridge Server
        sendToBridge({
          type: 'task',
          taskId: subTaskId,
          to: workerId,
          from: 'ceo',
          message: `[${role}角色] ${task}`,
          expectsResponse: true
        });
        
        // 发送进度
        if (progressToken) {
          sendProgressNotification(
            progressToken, 
            `Dispatched ${role} (${workerId}) to ${i + 1}/${roleList.length}`, 
            30 + Math.round((i / roleList.length) * 65)
          );
        }
      }
      
      // 获取当前所有 Worker 状态
      const workers = getSpawnedWorkers();
      
      sendMCPResult(id, { 
        content: [{ 
          type: 'text', 
          text: `Team coordinated:\nTask: ${task}\nRoles: ${roleList.join(', ')}\nWorkers: ${workers.map(w => `${w.id}(${w.role})`).join(', ')}` 
        }]
      });
      break;
    }

    case 'list_sessions': {
      const sessions = sessionStorage.listSessions();
      sendMCPResult(id, {
        content: [{
          type: 'text',
          text: sessions.length > 0 
            ? `Active Sessions:\n${sessions.map(s => `  ${s.id} [${s.status}] (${s.turnCount} turns)`).join('\n')}`
            : 'No active sessions'
        }]
      });
      break;
    }

    case 'get_session': {
      const session = sessionStorage.getSession(args.sessionId);
      if (session) {
        sendMCPResult(id, {
          content: [{
            type: 'text',
            text: `Session ${session.id}:\n  Status: ${session.status}\n  Created: ${session.createdAt}\n  Turns: ${session.turnCount}\n  Context: ${JSON.stringify(session.context)}`
          }]
        });
      } else {
        sendMCPResult(id, {
          content: [{ type: 'text', text: `Session ${args.sessionId} not found` }]
        });
      }
      break;
    }

    case 'reset_session': {
      sessionStorage.resetSession(args.sessionId);
      sendMCPResult(id, {
        content: [{ type: 'text', text: `Session ${args.sessionId} reset` }]
      });
      break;
    }

    default:
      sendMCPError(id, -32601, `Unknown tool: ${name}`);
  }
}

// ====================
// 主程序
// ====================

async function main() {
  log('ClawSquad MCP Bridge v2.5.0');
  log('===============================');
  
  try {
    await connectToBridge();
    
    // 设置 stdin 处理
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity
    });

    process.stdin.setEncoding('utf8');
    
    let lineBuffer = '';
    let currentProgressToken = null;
    
    process.stdin.on('data', (chunk) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          // 提取 progressToken (如果有)
          try {
            const msg = JSON.parse(line);
            if (msg.params?._meta?.progressToken) {
              currentProgressToken = msg.params._meta.progressToken;
            }
          } catch (e) {}
          
          handleMCPInput(line, currentProgressToken);
        }
      }
    });

    process.stdin.on('close', () => {
      log('Stdin closed, exiting');
      // TMUX 模式下保留 workers，只清理 subprocess workers
      if (process.env.CLAWSQUAD_TMUX !== '1') {
        killAllWorkers();
      } else {
        // tmux 模式下 workers 继续运行在 tmux session 中
        log('Workers running in tmux - attach with: tmux attach-session -t <session>');
        spawnedWorkers.clear(); // 只清理内存中的引用，不杀进程
      }
      if (bridgeSocket) bridgeSocket.destroy();
      process.exit(0);
    });

// ====================
// Graceful Shutdown
// ====================
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    log('Already shutting down, ignoring', signal);
    return;
  }
  isShuttingDown = true;
  
  log(`Graceful shutdown initiated (${signal})`);
  
  // 1. 停止接受新连接
  bridgeReady = false;
  
  // 2. 通知 Bridge Server 准备关闭
  if (bridgeSocket && !bridgeSocket.destroyed) {
    sendToBridge({ type: 'ceo:shutdown', signal });
  }
  
  // 3. 等待活跃任务完成 (最多 10s)
  const activeTasks = Array.from(spawnedWorkers.entries())
    .filter(([_, w]) => w.status === 'busy');
  
  if (activeTasks.length > 0) {
    log(`Waiting for ${activeTasks.length} active workers to complete...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  // 4. Kill 所有 Worker
  if (process.env.CLAWSQUAD_TMUX !== '1') {
    killAllWorkers();
  } else {
    // tmux mode: 保留 session，只清理内存
    spawnedWorkers.clear();
    log('Tmux mode: workers preserved in tmux session');
  }
  
  // 5. 关闭 Bridge 连接
  if (bridgeSocket) {
    bridgeSocket.destroy();
  }
  
  // 6. 清理资源
  pendingRequests.clear();
  pendingRequestCreatedAt.clear();
  progressCallbacks.clear();
  
  log('Graceful shutdown complete');
  process.exit(0);
}

process.on('uncaughtException', (e) => {
  log('Uncaught:', e.message);
  gracefulShutdown('uncaught');
});

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('exit', (code) => {
  log(`Process exiting with code ${code}`);
});

  } catch (err) {
    log('Failed to start:', err.message);
    log('Make sure Bridge Server is running on port', port);
    process.exit(1);
  }
}

main();
