/**
 * CLI Orchestrator - ClawSquad v2.1
 * 
 * 多 CLI Worker 生命周期管理
 * 根据角色动态选择 CLI 类型和 API
 */

import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import { TeamFactory, Agent, AgentStatus } from '../claw-squad-core/team-factory.js';
import { CLITYPE, getCLICmd } from '../claw-squad-core/role-config.js';

export interface WorkerInstance {
  id: string;
  agentId: string;
  cli: CLITYPE;
  process?: ChildProcess;
  status: AgentStatus;
  connectedAt: Date;
  currentTaskId?: string;  // 当前正在执行的任务 ID
}

export interface OrchestratorOptions {
  bridgePort: number;
  bridgeHost: string;
}

/**
 * CLI Orchestrator
 * 
 * 管理所有 CLI Worker 的生命周期
 * - Spawn/Kill Worker processes
 * - 通过 Bridge Server 进行 Worker 间通信
 * - 收集 Worker 执行结果
 */
export class CliOrchestrator {
  private workers: Map<string, WorkerInstance> = new Map();
  private teamFactory: TeamFactory;
  private bridgeSocket?: net.Socket;
  private port: number;
  private hubHost: string;
  private hubReady: boolean = false;
  private messageBuffer: string = '';

  constructor(teamFactory: TeamFactory, options: Partial<OrchestratorOptions> = {}) {
    this.teamFactory = teamFactory;
    this.port = options.bridgePort || 9876;
    this.hubHost = options.bridgeHost || '127.0.0.1';
  }

  /**
   * 连接到 Bridge Server Hub
   */
  async connectToHub(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bridgeSocket = net.createConnection({
        port: this.port,
        host: this.hubHost
      }, () => {
        this.hubReady = true;
        console.log(`[Orchestrator] Connected to Bridge Server at ${this.hubHost}:${this.port}`);
        
        // 注册 Orchestrator
        this.sendToHub({
          type: 'orchestrator:register',
          orchestratorId: 'main-orchestrator'
        });
        
        resolve();
      });

      this.bridgeSocket.on('data', (data) => {
        this.messageBuffer += data.toString();
        this.processHubMessages();
      });

      this.bridgeSocket.on('error', (err) => {
        console.error('[Orchestrator] Hub error:', err.message);
        this.hubReady = false;
      });

      this.bridgeSocket.on('close', () => {
        this.hubReady = false;
        console.log('[Orchestrator] Disconnected from Bridge Server');
      });

      setTimeout(() => reject(new Error('Hub connection timeout')), 5000);
    });
  }

  /**
   * 处理 Hub 消息
   */
  private processHubMessages(): void {
    const lines = this.messageBuffer.split('\n');
    this.messageBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        this.handleHubMessage(msg);
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  /**
   * 向 Hub 发送消息
   */
  private sendToHub(msg: object): void {
    if (this.bridgeSocket && !this.bridgeSocket.destroyed) {
      this.bridgeSocket.write(JSON.stringify(msg) + '\n');
    }
  }

  /**
   * 处理 Hub 消息
   */
  private handleHubMessage(msg: any): void {
    switch (msg.type) {
      case 'task':
        // 收到任务 → 分发给 Worker
        this.distributeTask(msg);
        break;
      case 'broadcast':
        // 广播给所有 Worker
        this.broadcastToWorkers(msg.message);
        break;
      case 'cancel':
        // 取消指定 Worker 的任务
        this.cancelWorkerTask(msg.taskId, msg.from);
        break;
      case 'cancel_all':
        // 取消所有 Worker 的任务
        this.cancelAllWorkerTasks();
        break;
      case 'ping':
        this.sendToHub({ type: 'pong' });
        break;
    }
  }

  /**
   * 取消指定 Worker 的任务
   */
  cancelWorkerTask(taskId: string, from?: string): void {
    // 找到正在执行该任务的 Worker
    for (const [agentId, worker] of this.workers) {
      if (worker.currentTaskId === taskId && worker.process) {
        console.log(`[Orchestrator] Cancelling task ${taskId} on worker ${agentId}`);
        
        // 发送取消信号到 stdin
        worker.process.stdin?.write('\x03'); // Ctrl+C
        worker.process.stdin?.write('STOP\n');
        
        // 杀掉进程
        worker.process.kill('SIGTERM');
        
        // 清理
        worker.status = 'idle';
        worker.currentTaskId = undefined;
        this.teamFactory.updateAgentStatus(agentId, 'idle');
        
        // 通知 Hub
        this.sendToHub({
          type: 'task_cancelled',
          taskId,
          workerId: agentId,
          success: true
        });
        
        return;
      }
    }
    
    console.log(`[Orchestrator] Task ${taskId} not found on any worker`);
    this.sendToHub({
      type: 'task_cancelled',
      taskId,
      success: false,
      message: 'Task not found'
    });
  }

  /**
   * 取消所有 Worker 的任务
   */
  cancelAllWorkerTasks(): void {
    let cancelled = 0;
    for (const [agentId, worker] of this.workers) {
      if (worker.status === 'busy' && worker.process) {
        console.log(`[Orchestrator] Cancelling all tasks on worker ${agentId}`);
        
        // 发送 Ctrl+C
        worker.process.stdin?.write('\x03');
        worker.process.stdin?.write('STOP\n');
        
        // 杀掉进程
        worker.process.kill('SIGTERM');
        
        worker.status = 'idle';
        worker.currentTaskId = undefined;
        this.teamFactory.updateAgentStatus(agentId, 'idle');
        cancelled++;
      }
    }
    
    this.sendToHub({
      type: 'all_tasks_cancelled',
      count: cancelled,
      success: true
    });
  }

  /**
   * 注册 Agent → 创建对应的 Worker
   */
  registerAgent(agent: Agent): WorkerInstance {
    const worker: WorkerInstance = {
      id: `worker-${agent.id}`,
      agentId: agent.id,
      cli: agent.cli,
      status: 'idle',
      connectedAt: new Date()
    };
    this.workers.set(agent.id, worker);

    // 向 Hub 注册
    this.sendToHub({
      type: 'register',
      agentId: agent.id,
      role: agent.role,
      cli: agent.cli,
      model: agent.model,
      apiProvider: agent.apiProvider,
      capabilities: agent.capabilities
    });

    console.log(`[Orchestrator] Registered ${agent.name} (${agent.role}) as ${agent.cli} worker`);
    return worker;
  }

  /**
   * Spawn Worker 进程
   */
  spawnWorker(agentId: string): ChildProcess | null {
    const worker = this.workers.get(agentId);
    if (!worker) {
      console.error(`[Orchestrator] Worker not found: ${agentId}`);
      return null;
    }

    // 获取 CLI 命令
    const cmd = getCLICmd(worker.cli);
    if (!cmd) return null;

    console.log(`[Orchestrator] Spawning ${worker.cli} worker for ${agentId}`);
    
    const proc = spawn(cmd.command, cmd.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: process.cwd()
    });

    worker.process = proc;
    worker.status = 'idle';

    // 捕获 stdout → 发送到 Hub
    proc.stdout?.on('data', (data) => {
      this.sendToHub({
        type: 'worker:output',
        agentId,
        output: data.toString()
      });
    });

    proc.stderr?.on('data', (data) => {
      console.error(`[${agentId} stderr]:`, data.toString());
    });

    proc.on('exit', (code) => {
      worker.status = code === 0 ? 'completed' : 'failed';
      this.teamFactory.updateAgentStatus(agentId, worker.status);
      console.log(`[Orchestrator] Worker ${agentId} exited with code ${code}`);
    });

    return proc;
  }

  /**
   * 向 Worker 发送任务
   */
  sendTaskToWorker(agentId: string, task: string, taskId?: string): void {
    const worker = this.workers.get(agentId);
    if (!worker?.process) {
      console.error(`[Orchestrator] Worker ${agentId} not running`);
      return;
    }

    worker.status = 'busy';
    worker.currentTaskId = taskId;  // 记录当前任务
    this.teamFactory.updateAgentStatus(agentId, 'busy');
    worker.process.stdin?.write(task + '\n');
  }

  /**
   * 分发任务给 Worker
   */
  private distributeTask(msg: { taskId: string; to: string; message: string; expectsResponse?: boolean }): void {
    const { taskId, to, message } = msg;
    const worker = this.workers.get(to);
    
    if (!worker) {
      console.error(`[Orchestrator] Target worker not found: ${to}`);
      return;
    }

    console.log(`[Orchestrator] Distributing task ${taskId} to ${to} (${worker.cli})`);
    
    // 确保 Worker 已启动
    if (!worker.process) {
      this.spawnWorker(to);
    }
    
    // 记录当前任务 ID，用于后续取消
    worker.currentTaskId = taskId;
    this.sendTaskToWorker(to, message, taskId);
  }

  /**
   * 广播消息给所有 Worker
   */
  broadcastToWorkers(message: string): void {
    for (const [id, worker] of this.workers) {
      if (worker.status === 'idle' || worker.status === 'busy') {
        this.sendTaskToWorker(id, message);
      }
    }
  }

  /**
   * 获取所有 Worker 状态
   */
  getWorkersStatus(): Map<string, { cli: CLITYPE; status: AgentStatus }> {
    const status = new Map();
    for (const [id, worker] of this.workers) {
      status.set(id, { cli: worker.cli, status: worker.status });
    }
    return status;
  }

  /**
   * 关闭所有 Worker
   */
  shutdown(): void {
    for (const [id, worker] of this.workers) {
      if (worker.process) {
        worker.process.kill();
        console.log(`[Orchestrator] Killed worker: ${id}`);
      }
    }
    this.workers.clear();
    this.bridgeSocket?.destroy();
  }

  /**
   * 启动 Orchestrator
   */
  start(): void {
    console.log('ClawSquad CLI Orchestrator v2.1');
    console.log('================================');
    console.log(`Bridge Server: ${this.hubHost}:${this.port}`);
    
    this.connectToHub().catch(console.error);

    // 处理进程退出
    process.on('SIGINT', () => {
      console.log('\n[Orchestrator] Shutting down...');
      this.shutdown();
      process.exit(0);
    });
  }
}

// 导出
export { CliOrchestrator as Orchestrator };
