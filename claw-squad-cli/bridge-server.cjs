#!/usr/bin/env node
/**
 * Absorbi Bridge Server - TCP Hub for Multi-CLI Orchestration
 * 
 * 消息路由中枢，连接 CEO (OpenClaw) 和所有 Worker CLI
 * 
 * 协议: 逐行 JSON (newline-delimited JSON)
 * 端口: 9876 (默认)
 * 
 * Usage: node bridge-server.js [--port 9876]
 */

'use strict';

const net = require('net');
const readline = require('readline');
const { EventEmitter } = require('events');

const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || '9876');

// ---- 状态 ----
const workers = new Map();      // workerId → { id, socket, role, capabilities, registeredAt, currentTaskId }
const pendingResponses = new Map();  // taskId → { resolve, reject, timer, workerId, createdAt }
const activeTasks = new Map();       // taskId → { id, workerId, message, status, createdAt }
const ee = new EventEmitter();

let ceoSocket = null;
let workerCounter = 0;

// ---- 日志 ----
function log(type, msg, meta = '') {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] [${type}] ${msg}`, meta);
}

// ---- 广播给所有 worker ----
function broadcast(msg, excludeId = null) {
  const data = JSON.stringify(msg) + '\n';
  for (const [id, w] of workers) {
    if (id !== excludeId && w.socket && !w.socket.destroyed) {
      w.socket.write(data);
    }
  }
}

// ---- 发送给指定 worker ----
function sendTo(targetId, msg) {
  const w = workers.get(targetId);
  if (w?.socket && !w.socket.destroyed) {
    w.socket.write(JSON.stringify(msg) + '\n');
    return true;
  }
  return false;
}

// ---- 解析消息 ----
function parseMessage(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

// ---- 处理 worker 消息 ----
function handleWorkerMessage(workerId, msg, socket) {
  const { type } = msg;

  switch (type) {
    case 'register': {
      const { workerId: wid, role, capabilities } = msg;
      workers.set(wid || workerId, {
        id: wid || workerId,
        socket,
        role: role || 'unknown',
        capabilities: capabilities || [],
        registeredAt: Date.now()
      });
      log('REGISTER', `Worker "${wid}" (role: ${role}) 上线`, `总连接: ${workers.size}`);
      ee.emit('worker:registered', wid, role);
      
      // 回复确认
      socket.write(JSON.stringify({ type: 'ack', workerId: wid, status: 'ok' }) + '\n');
      break;
    }

    case 'task': {
      // 从 CEO 来的任务，转发给目标 Worker
      const { taskId, to, message, expectsResponse } = msg;
      const ok = sendTo(to, { type: 'task', taskId, from: 'ceo', message, expectsResponse });
      
      // 追踪任务
      activeTasks.set(taskId, {
        id: taskId,
        workerId: to,
        message,
        status: 'executing',
        createdAt: Date.now()
      });
      
      if (expectsResponse) {
        // 设置超时等待
        const timer = setTimeout(() => {
         pendingResponses.delete(taskId);
         const task = activeTasks.get(taskId);
         if (task) task.status = 'timeout';
        }, 180000); // 3min 超时
        pendingResponses.set(taskId, { resolve: null, reject: null, timer, workerId: to });
      }
      log('TASK', `→ [${to}] ${message?.slice(0, 60)}...`);
      break;
    }

    case 'response': {
      // Worker 的响应
      const { taskId, from, message } = msg;
      log('RESPONSE', `← [${from}] ${message?.slice(0, 80)}...`);
      
      // 唤醒等待者
      const pending = pendingResponses.get(taskId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingResponses.delete(taskId);
      }
      
      // 转发给 CEO
      if (ceoSocket && !ceoSocket.destroyed) {
        ceoSocket.write(JSON.stringify({ type: 'response', taskId, from, message }) + '\n');
      }
      
      // 标记任务完成
      const task = activeTasks.get(taskId);
      if (task) task.status = 'completed';
      break;
    }

    case 'task_cancelled': {
      // Worker/Orchestrator 确认任务已取消
      const { taskId, success, message } = msg;
      log('CANCEL', `Task ${taskId} confirmed cancelled by worker`);
      
      // 清理
      pendingResponses.delete(taskId);
      activeTasks.delete(taskId);
      
      // 转发给 CEO
      if (ceoSocket && !ceoSocket.destroyed) {
        ceoSocket.write(JSON.stringify({ 
          type: 'cancel_result', 
          taskId,
          success: success !== false,
          message: message || `Task ${taskId} cancelled`
        }) + '\n');
      }
      break;
    }

    case 'all_tasks_cancelled': {
      // 所有任务已取消的确认
      const { count, success } = msg;
      log('CANCEL', `All ${count} tasks cancelled`);
      
      // 转发给 CEO
      if (ceoSocket && !ceoSocket.destroyed) {
        ceoSocket.write(JSON.stringify({ 
          type: 'cancel_result', 
          success: true,
          cancelledTasks: [],
          message: `Cancelled ${count} tasks`
        }) + '\n');
      }
      break;
    }

    case 'cancel_task': {
      // 取消指定任务
      const { taskId } = msg;
      const task = activeTasks.get(taskId);
      if (!task) {
        log('CANCEL', `Task ${taskId} not found or already completed`);
        if (ceoSocket) {
          ceoSocket.write(JSON.stringify({ 
            type: 'cancel_result', 
            taskId, 
            success: false, 
            message: 'Task not found or already completed' 
          }) + '\n');
        }
        break;
      }
      
      // 发送取消信号给 Worker
      const cancelled = sendTo(task.workerId, { 
        type: 'cancel', 
        taskId,
        from: 'ceo'
      });
      
      // 清理
      pendingResponses.delete(taskId);
      activeTasks.delete(taskId);
      
      log('CANCEL', `Task ${taskId} cancelled (worker: ${task.workerId})`);
      
      if (ceoSocket) {
        ceoSocket.write(JSON.stringify({ 
          type: 'cancel_result', 
          taskId, 
          success: true, 
          message: `Task ${taskId} cancelled` 
        }) + '\n');
      }
      break;
    }

    case 'cancel_all': {
      // 取消所有任务
      const cancelled = [];
      for (const [taskId, task] of activeTasks) {
        sendTo(task.workerId, { type: 'cancel', taskId, from: 'ceo' });
        pendingResponses.delete(taskId);
        cancelled.push(taskId);
      }
      activeTasks.clear();
      
      log('CANCEL', `Cancelled ${cancelled.length} tasks`);
      
      if (ceoSocket) {
        ceoSocket.write(JSON.stringify({ 
          type: 'cancel_result', 
          requestId: msg.requestId,
          success: true, 
          cancelledTasks: cancelled,
          message: `Cancelled ${cancelled.length} tasks` 
        }) + '\n');
      }
      break;
    }

    case 'get_active_tasks': {
      // 获取所有活跃任务
      const tasks = Array.from(activeTasks.values()).map(t => ({
        taskId: t.id,
        workerId: t.workerId,
        status: t.status,
        createdAt: new Date(t.createdAt).toISOString(),
        age: Math.round((Date.now() - t.createdAt) / 1000) + 's'
      }));
      
      if (ceoSocket) {
        ceoSocket.write(JSON.stringify({ 
          type: 'active_tasks', 
          tasks,
          count: tasks.length
        }) + '\n');
      }
      break;
    }

    case 'broadcast': {
      // 广播消息
      const { from, message } = msg;
      log('BROADCAST', `[${from}]: ${message?.slice(0, 80)}...`);
      broadcast({ type: 'broadcast', from, message }, workerId);
      break;
    }

    case 'ping': {
      socket.write(JSON.stringify({ type: 'pong' }) + '\n');
      break;
    }

    default:
      log('UNKNOWN', `Unknown message type: ${type}`, JSON.stringify(msg).slice(0, 100));
  }
}

// ---- 处理 CEO 连接 ----
function handleCeoConnection(socket) {
  log('CEO', 'CEO 连接成功');
  ceoSocket = socket;

  const rl = readline.createInterface({ input: socket, crlfDelay: Infinity });
  
  socket.on('close', () => {
    log('CEO', 'CEO 连接断开');
    ceoSocket = null;
  });

  socket.on('error', (err) => {
    log('ERROR', 'CEO socket error: ' + err.message);
    ceoSocket = null;
  });

  let buf = '';
  socket.on('data', (chunk) => {
    buf += chunk.toString();
    let newlineIdx;
    while ((newlineIdx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, newlineIdx).trim();
      buf = buf.slice(newlineIdx + 1);
      if (!line) continue;
      const msg = parseMessage(line);
      if (!msg) continue;

      const { type, to, message, taskId, expectsResponse } = msg;

      if (type === 'broadcast') {
        broadcast({ type: 'broadcast', from: 'ceo', message });
        log('BROADCAST', `[CEO]: ${message?.slice(0, 80)}...`);
      } else if (type === 'task' && to) {
        const ok = sendTo(to, { type: 'task', taskId, from: 'ceo', message, expectsResponse });
        log('TASK', `CEO → [${to}] ${message?.slice(0, 60)}...`);
        if (!ok) {
          socket.write(JSON.stringify({ type: 'error', taskId, message: `Worker ${to} not found` }) + '\n');
        }
      } else if (type === 'status') {
        socket.write(JSON.stringify({
          type: 'status',
          workers: Array.from(workers.values()).map(w => ({ id: w.id, role: w.role })),
          ceoConnected: ceoSocket !== null
        }) + '\n');
      }
    }
  });
}

// ---- 主服务器 ----
const server = net.createServer((socket) => {
  const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
  log('CONNECT', `新连接: ${remoteAddr}`);

  let buf = '';
  let registered = false;

  socket.on('data', (chunk) => {
    if (registered) {
      // 已注册，按 worker 消息处理
      buf += chunk.toString();
      let newlineIdx;
      while ((newlineIdx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, newlineIdx).trim();
        buf = buf.slice(newlineIdx + 1);
        if (!line) continue;
        const msg = parseMessage(line);
        if (msg) handleWorkerMessage(null, msg, socket);
      }
    } else {
      // 首次连接，尝试解析
      buf += chunk.toString();
      const newlineIdx = buf.indexOf('\n');
      if (newlineIdx === -1) return;
      const firstLine = buf.slice(0, newlineIdx).trim();
      buf = buf.slice(newlineIdx + 1);
      const msg = parseMessage(firstLine);
      
      if (!msg) {
        // 无法解析为 CEO
        socket.destroy();
        return;
      }

      // 判断是 CEO 还是 Worker
      // CEO 发来的: type=ceo, type=status, type=task, type=broadcast
      // Worker 发来的: type=register (后续才有)
      if (['ceo', 'status', 'task', 'broadcast'].includes(msg.type)) {
        handleCeoConnection(socket);
        registered = true;
        // 处理剩余 buf
        if (buf) {
          const leftover = buf;
          buf = '';
          let idx;
          while ((idx = leftover.indexOf('\n')) !== -1) {
            const line = leftover.slice(0, idx).trim();
            leftover = leftover.slice(idx + 1);
            if (!line) continue;
            const m = parseMessage(line);
            if (m) handleWorkerMessage(null, m, socket);
          }
        }
      } else {
        // Worker
        registered = true;
        handleWorkerMessage(null, msg, socket);
      }
    }
  });

  socket.on('error', (err) => {
    log('ERROR', `Socket error (${remoteAddr}): ${err.message}`);
  });

  socket.on('close', () => {
    // 移除断开的 worker
    for (const [id, w] of workers) {
      if (w.socket === socket) {
        workers.delete(id);
        log('DISCONNECT', `Worker "${id}" 断开`, `剩余: ${workers.size}`);
        break;
      }
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  log('SERVER', `Bridge Server 启动`, `port=${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请先 kill 旧进程: lsof -i :${PORT}`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// ---- 信号处理 ----
process.on('SIGINT', () => {
  log('SHUTDOWN', '正在关闭...');
  broadcast({ type: 'shutdown', message: 'Bridge Server 关闭' });
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (e) => {
  console.error('[FATAL]', e.message);
  process.exit(1);
});
