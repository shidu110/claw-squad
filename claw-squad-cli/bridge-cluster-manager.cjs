#!/usr/bin/env node
/**
 * Bridge Cluster Manager - ClawSquad v2.6
 * 
 * 多 Bridge 实例管理 + 负载均衡
 * 
 * 功能:
 * - 启动/停止多个 Bridge 实例
 * - Worker 注册与发现
 * - 健康检查 + 自动摘除
 * - 任务路由 (按模型/角色)
 * 
 * Usage: node bridge-cluster-manager.cjs [--port 9876]
 */

'use strict';

const net = require('net');
const readline = require('readline');
const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const path = require('path');

// ====================
// 常量
// ====================
const BRIDGE_REGISTRY_PORT = 9877;  // Cluster Manager 端口
const BRIDGE_BASE_PORT = 9878;      // Bridge 实例起始端口
const HEALTH_CHECK_INTERVAL = 10000; // 10秒健康检查
const MAX_BRIDGE_RESTARTS = 3;       // 最大重启次数

// ====================
// 日志
// ====================
function log(type, msg, meta = '') {
  const ts = new Date().toISOString().slice(11, 23);
  console.error(`[${ts}] [${type}] ${msg}`, meta);
}

// ====================
// Bridge 实例
// ====================
class BridgeInstance extends EventEmitter {
  constructor(id, port, model, cliPath) {
    super();
    this.id = id;
    this.port = port;
    this.model = model;
    this.cliPath = cliPath;
    this.process = null;
    this.connected = false;
    this.workers = new Map();
    this.restartCount = 0;
    this.lastHealthCheck = Date.now();
  }

  start() {
    return new Promise((resolve, reject) => {
      log('BRIDGE', `Starting bridge ${this.id} on port ${this.port} (model: ${this.model})`);
      
      this.process = spawn('node', [this.cliPath, '--port=' + this.port], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.process.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg.includes('Connected to Bridge Server')) {
          this.connected = true;
          this.emit('connected');
          resolve();
        }
      });

      this.process.on('exit', (code) => {
        this.connected = false;
        log('BRIDGE', `Bridge ${this.id} exited with code ${code}`);
        this.emit('disconnected');
      });

      this.process.on('error', (err) => {
        log('ERROR', `Bridge ${this.id} error:`, err.message);
        reject(err);
      });

      // 超时
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Bridge startup timeout'));
        }
      }, 10000);
    });
  }

  stop() {
    if (this.process) {
      log('BRIDGE', `Stopping bridge ${this.id}`);
      this.process.kill('SIGTERM');
      this.process = null;
      this.connected = false;
    }
  }

  restart() {
    this.restartCount++;
    if (this.restartCount > MAX_BRIDGE_RESTARTS) {
      log('ERROR', `Bridge ${this.id} exceeded max restarts (${MAX_BRIDGE_RESTARTS})`);
      return false;
    }
    log('BRIDGE', `Restarting bridge ${this.id} (attempt ${this.restartCount})`);
    this.stop();
    setTimeout(() => this.start().catch(e => log('ERROR', e.message)), 1000);
    return true;
  }

  registerWorker(workerId, role, capabilities) {
    this.workers.set(workerId, { role, capabilities, registeredAt: Date.now() });
    this.lastHealthCheck = Date.now();
  }

  unregisterWorker(workerId) {
    this.workers.delete(workerId);
  }

  getStatus() {
    return {
      id: this.id,
      port: this.port,
      model: this.model,
      connected: this.connected,
      workerCount: this.workers.size,
      workers: Array.from(this.workers.keys()),
      restartCount: this.restartCount,
      lastHealthCheck: this.lastHealthCheck
    };
  }
}

// ====================
// Bridge Cluster Manager
// ====================
class BridgeClusterManager extends EventEmitter {
  constructor() {
    super();
    this.bridges = new Map();  // id → BridgeInstance
    this.serviceRegistry = new Map();  // role → [bridgeId, ...]
    this.taskQueue = [];
    this.server = null;
  }

  /**
   * 添加 Bridge 实例
   */
  async addBridge(id, model, cliPath) {
    if (this.bridges.has(id)) {
      log('WARN', `Bridge ${id} already exists`);
      return;
    }

    const port = BRIDGE_BASE_PORT + this.bridges.size;
    const bridge = new BridgeInstance(id, port, model, cliPath);
    
    bridge.on('connected', () => {
      log('INFO', `Bridge ${id} connected`);
      this.emit('bridge:connected', id);
    });

    bridge.on('disconnected', () => {
      log('WARN', `Bridge ${id} disconnected`);
      this.emit('bridge:disconnected', id);
      
      // 自动重启
      if (bridge.restartCount < MAX_BRIDGE_RESTARTS) {
        bridge.restart();
      }
    });

    try {
      await bridge.start();
      this.bridges.set(id, bridge);
      log('INFO', `Bridge ${id} added (model: ${model}, port: ${port})`);
    } catch (err) {
      log('ERROR', `Failed to add bridge ${id}:`, err.message);
    }
  }

  /**
   * 移除 Bridge 实例
   */
  removeBridge(id) {
    const bridge = this.bridges.get(id);
    if (bridge) {
      bridge.stop();
      this.bridges.delete(id);
      
      // 从 service registry 移除
      for (const [role, ids] of this.serviceRegistry) {
        const idx = ids.indexOf(id);
        if (idx !== -1) ids.splice(idx, 1);
      }
      
      log('INFO', `Bridge ${id} removed`);
    }
  }

  /**
   * 获取最佳 Bridge (负载最低)
   */
  selectBridge(preferModel = null) {
    let candidates = Array.from(this.bridges.values())
      .filter(b => b.connected);

    if (preferModel) {
      candidates = candidates.filter(b => b.model === preferModel);
    }

    if (candidates.length === 0) {
      return null;
    }

    // 按 worker 数量排序 (最少的优先)
    candidates.sort((a, b) => a.workers.size - b.workers.size);
    return candidates[0];
  }

  /**
   * 注册 Worker 到 service registry
   */
  registerWorker(bridgeId, workerId, role, capabilities = []) {
    if (!this.serviceRegistry.has(role)) {
      this.serviceRegistry.set(role, []);
    }
    
    const ids = this.serviceRegistry.get(role);
    if (!ids.includes(bridgeId)) {
      ids.push(bridgeId);
    }

    const bridge = this.bridges.get(bridgeId);
    if (bridge) {
      bridge.registerWorker(workerId, role, capabilities);
    }
  }

  /**
   * 获取拥有特定 role 的 Bridge
   */
  getBridgeForRole(role) {
    const bridgeIds = this.serviceRegistry.get(role);
    if (!bridgeIds || bridgeIds.length === 0) {
      // 没有特定 role，返回负载最低的
      return this.selectBridge();
    }

    // 返回第一个有该 role 的
    for (const id of bridgeIds) {
      const bridge = this.bridges.get(id);
      if (bridge && bridge.connected) {
        return bridge;
      }
    }

    return this.selectBridge();
  }

  /**
   * 健康检查
   */
  healthCheck() {
    const now = Date.now();
    const results = [];

    for (const [id, bridge] of this.bridges) {
      const status = bridge.getStatus();
      
      // 检查是否超时 (30秒无响应)
      if (now - bridge.lastHealthCheck > 30000 && bridge.workers.size > 0) {
        log('WARN', `Bridge ${id} health check timeout, restarting...`);
        bridge.restart();
      }

      results.push(status);
    }

    return results;
  }

  /**
   * 获取集群状态
   */
  getClusterStatus() {
    const bridges = [];
    let totalWorkers = 0;

    for (const [id, bridge] of this.bridges) {
      const status = bridge.getStatus();
      bridges.push(status);
      totalWorkers += status.workerCount;
    }

    return {
      bridgeCount: this.bridges.size,
      totalWorkers,
      bridges,
      serviceRegistry: Object.fromEntries(this.serviceRegistry)
    };
  }

  /**
   * 启动 Cluster Manager TCP Server
   */
  start(port = BRIDGE_REGISTRY_PORT) {
    this.server = net.createServer((socket) => {
      log('CLIENT', 'New connection to Cluster Manager');
      
      const rl = readline.createInterface({
        input: socket,
        crlfDelay: Infinity
      });

      socket.on('data', (data) => {
        const line = data.toString().trim();
        if (!line) return;

        try {
          const msg = JSON.parse(line);
          this.handleMessage(socket, msg);
        } catch (e) {
          log('ERROR', 'Invalid message:', line);
        }
      });
    });

    this.server.listen(port, () => {
      log('INFO', `Bridge Cluster Manager listening on port ${port}`);
    });

    // 定期健康检查
    setInterval(() => this.healthCheck(), HEALTH_CHECK_INTERVAL);
  }

  /**
   * 处理消息
   */
  handleMessage(socket, msg) {
    const { type, ...args } = msg;

    switch (type) {
      case 'status':
        socket.write(JSON.stringify({ type: 'status', ...this.getClusterStatus() }) + '\n');
        break;

      case 'select_bridge':
        const bridge = this.selectBridge(args.preferModel);
        if (bridge) {
          socket.write(JSON.stringify({ type: 'bridge_selected', ...bridge.getStatus() }) + '\n');
        } else {
          socket.write(JSON.stringify({ type: 'error', message: 'No available bridges' }) + '\n');
        }
        break;

      case 'get_bridge_for_role':
        const b = this.getBridgeForRole(args.role);
        if (b) {
          socket.write(JSON.stringify({ type: 'bridge_selected', ...b.getStatus() }) + '\n');
        } else {
          socket.write(JSON.stringify({ type: 'error', message: `No bridge for role ${args.role}` }) + '\n');
        }
        break;

      case 'register_worker':
        this.registerWorker(args.bridgeId, args.workerId, args.role, args.capabilities);
        socket.write(JSON.stringify({ type: 'ok' }) + '\n');
        break;

      case 'shutdown':
        socket.write(JSON.stringify({ type: 'ok' }) + '\n');
        socket.end();
        this.shutdown();
        break;

      default:
        socket.write(JSON.stringify({ type: 'error', message: `Unknown type: ${type}` }) + '\n');
    }
  }

  /**
   * 关闭集群
   */
  shutdown() {
    log('INFO', 'Shutting down cluster...');
    for (const [id, _] of this.bridges) {
      this.removeBridge(id);
    }
    if (this.server) {
      this.server.close();
    }
  }
}

// ====================
// 主程序
// ====================
async function main() {
  const cluster = new BridgeClusterManager();
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  const configFile = args.find(a => a.startsWith('--config='))?.split('=')[1];

  if (configFile) {
    // 从配置文件加载 Bridge 配置
    try {
      const config = require(path.resolve(configFile));
      for (const bridgeConfig of config.bridges) {
        await cluster.addBridge(bridgeConfig.id, bridgeConfig.model, bridgeConfig.cli);
      }
    } catch (e) {
      log('ERROR', 'Failed to load config:', e.message);
    }
  } else {
    // 默认配置 - 3个 Bridge (MiniMax, Kimi, GLM)
    const cliPath = path.join(__dirname, '..', 'claw-squad-mcp', 'bridge.cjs');
    
    await cluster.addBridge('bridge-minimax', 'MiniMax-M2.7', cliPath);
    await cluster.addBridge('bridge-kimi', 'Kimi-K2.5', cliPath);
    await cluster.addBridge('bridge-glm', 'GLM-5', cliPath);
  }

  // 启动 Cluster Manager
  const port = parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] || BRIDGE_REGISTRY_PORT);
  cluster.start(port);

  // 处理退出
  process.on('SIGINT', () => {
    log('INFO', 'SIGINT received');
    cluster.shutdown();
    process.exit(0);
  });

  log('INFO', 'Bridge Cluster Manager started');
  log('INFO', 'Usage: node bridge-cluster-manager.cjs [--port=9877] [--config=config.js]');
}

main().catch(e => {
  log('ERROR', 'Fatal:', e.message);
  process.exit(1);
});
