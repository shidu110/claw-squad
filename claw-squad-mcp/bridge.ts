/**
 * MCP Bridge - ClawSquad v2.0
 * 
 * OpenClaw ↔ Bridge Server 桥接
 * 
 * 职责:
 * - 接收 OpenClaw 的 CEO 命令
 * - 通过 Bridge Server 分发给 Worker
 * - 收集 Worker 结果返回给 OpenClaw
 */

import * as net from 'net';

export interface BridgeMessage {
  type: 'task' | 'response' | 'broadcast' | 'status' | 'worker:output';
  taskId?: string;
  from?: string;
  to?: string;
  message?: string;
  expectsResponse?: boolean;
  workers?: Array<{ id: string; role: string }>;
  ceoConnected?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

/**
 * MCP Bridge 连接 OpenClaw (stdio) 和 Bridge Server (TCP)
 */
export class MCPBridge {
  private bridgeSocket?: net.Socket;
  private bridgeHost: string;
  private bridgePort: number;
  private connectedAgents: string[] = [];
  private messageBuffer: string = '';

  constructor(bridgeHost = '127.0.0.1', bridgePort = 9876) {
    this.bridgeHost = bridgeHost;
    this.bridgePort = bridgePort;
  }

  /**
   * 连接到 Bridge Server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bridgeSocket = net.createConnection({
        port: this.bridgePort,
        host: this.bridgeHost
      }, () => {
        console.error('[MCP-Bridge] Connected to Bridge Server');
        resolve();
      });

      this.bridgeSocket.on('data', (data) => {
        this.messageBuffer += data.toString();
        this.processMessages();
      });

      this.bridgeSocket.on('error', (err) => {
        console.error('[MCP-Bridge] Bridge error:', err.message);
        reject(err);
      });

      this.bridgeSocket.on('close', () => {
        console.error('[MCP-Bridge] Disconnected from Bridge Server');
      });

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  /**
   * 处理接收到的消息
   */
  private processMessages(): void {
    const lines = this.messageBuffer.split('\n');
    this.messageBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        this.handleBridgeMessage(msg);
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  /**
   * 处理 Bridge Server 消息
   */
  private handleBridgeMessage(msg: BridgeMessage): void {
    switch (msg.type) {
      case 'response':
        // Worker 响应 → 写入 stdout (MCP protocol)
        this.sendMCPResponse(msg);
        break;
      case 'worker:output':
        // Worker 输出 → 写入 stdout
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notification',
          params: { message: `[${msg.from}] ${msg.message}` }
        }) + '\n');
        break;
      case 'status':
        console.error('[MCP-Bridge] Bridge status:', JSON.stringify(msg));
        break;
    }
  }

  /**
   * 发送 MCP JSON-RPC 响应
   */
  private sendMCPResponse(msg: BridgeMessage): void {
    const response = {
      jsonrpc: '2.0',
      id: msg.taskId,
      result: {
        content: [{
          type: 'text',
          text: `[${msg.from}]: ${msg.message}`
        }]
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  /**
   * 发送消息到 Bridge Server
   */
  private sendToBridge(msg: object): void {
    if (this.bridgeSocket && !this.bridgeSocket.destroyed) {
      this.bridgeSocket.write(JSON.stringify(msg) + '\n');
    }
  }

  /**
   * 处理 MCP STDIO 输入 (来自 OpenClaw)
   */
  handleMCPInput(line: string): void {
    try {
      const msg = JSON.parse(line);
      const { id, method, params } = msg;

      if (method === 'initialize') {
        this.sendMCP({
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'clawsquad-mcp', version: '2.0.0' }
          }
        });
        return;
      }

      if (method === 'notifications/initialized') return;
      if (method === 'ping') {
        this.sendMCP({ jsonrpc: '2.0', id, result: {} });
        return;
      }

      if (method === 'tools/list') {
        this.sendMCP({
          id,
          result: {
            tools: this.getTools()
          }
        });
        return;
      }

      if (method === 'tools/call') {
        const { name, arguments: args } = params || {};
        this.handleToolCall(id, name, args);
        return;
      }

      // 未知方法
      this.sendMCP({
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      });
    } catch (e) {
      console.error('[MCP-Bridge] Parse error:', e);
    }
  }

  /**
   * 发送 MCP 消息到 stdout
   */
  private sendMCP(msg: object): void {
    process.stdout.write(JSON.stringify(msg) + '\n');
  }

  /**
   * 获取可用工具列表
   */
  private getTools(): MCPTool[] {
    return [
      {
        name: 'send_task',
        description: '发送任务给 Worker (通过 Bridge Server)',
        inputSchema: {
          type: 'object',
          properties: {
            workerId: { type: 'string', description: '目标 Worker ID' },
            task: { type: 'string', description: '任务描述' },
            expectsResponse: { type: 'boolean', description: '是否等待响应' }
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
        description: '获取当前 Bridge Server 上所有 Worker 状态',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'competition_start',
        description: '启动 Team A vs Team B 竞争',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string', description: '竞争任务描述' },
            teamAWorkers: { type: 'array', items: { type: 'string' }, description: 'Team A Worker IDs' },
            teamBWorkers: { type: 'array', items: { type: 'string' }, description: 'Team B Worker IDs' }
          },
          required: ['task']
        }
      }
    ];
  }

  /**
   * 处理工具调用
   */
  private handleToolCall(id: string | number, name: string, args: Record<string, unknown>): void {
    switch (name) {
      case 'send_task':
        this.sendToBridge({
          type: 'task',
          taskId: id,
          to: args.workerId,
          from: 'ceo',
          message: args.task,
          expectsResponse: args.expectsResponse ?? true
        });
        this.sendMCP({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: `Task sent to ${args.workerId}` }] }
        });
        break;

      case 'broadcast':
        this.sendToBridge({
          type: 'broadcast',
          from: 'ceo',
          message: args.message
        });
        this.sendMCP({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: 'Broadcast sent' }] }
        });
        break;

      case 'get_workers':
        this.sendToBridge({ type: 'status' });
        // 异步响应，通过 Bridge 消息返回
        this.sendMCP({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: 'Fetching worker status...' }] }
        });
        break;

      case 'competition_start':
        // 发送竞争开始消息
        this.sendToBridge({
          type: 'competition',
          from: 'ceo',
          message: `COMPETITION_START:${args.task}`,
          teamAWorkers: args.teamAWorkers,
          teamBWorkers: args.teamBWorkers
        });
        this.sendMCP({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: 'Competition started!' }] }
        });
        break;

      default:
        this.sendMCP({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` }
        });
    }
  }

  /**
   * 启动 MCP Bridge (stdio 模式)
   */
  start(): void {
    console.error('[MCP-Bridge] Starting ClawSquad MCP Bridge v2.0...');
    
    // 先连接 Bridge Server
    this.connect().then(() => {
      // 连接成功后再处理 stdin
      let lineBuffer = '';
      
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            this.handleMCPInput(line);
          }
        }
      });
    }).catch((err) => {
      console.error('[MCP-Bridge] Failed to connect to Bridge Server:', err.message);
      process.exit(1);
    });

    process.on('uncaughtException', (e) => {
      console.error('[MCP-Bridge] Uncaught:', e.message);
    });
  }
}

// CLI 入口
if (require.main === module) {
  const bridge = new MCPBridge();
  bridge.start();
}
