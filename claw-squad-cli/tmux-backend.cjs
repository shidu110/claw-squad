/**
 * Tmux Backend - ClawSquad v2.6
 * 
 * 基于 tmux 的 Worker 隔离启动
 * - 每个 Worker 在独立 tmux window 运行
 * - 视觉监控 - 实时查看 Worker 输出
 * - 进程隔离 - Worker 之间互不影响
 * 
 * 依赖: tmux 3.0+
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ====================
// Tmux 命令封装
// ====================

function tmux(args) {
  // 传入数组，每个元素作为单独参数
  // execSync 需要字符串，spawn 需要数组，这里用字符串
  const cmd = 'tmux ' + args.join(' ');
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stdout || e.message;
  }
}

function tmuxOk(args) {
  try {
    execSync(['tmux'].concat(args).join(' '), { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// ====================
// Worker 管理
// ====================

const workers = new Map();  // workerId → { session, window, pane, role, pid, startedAt }

const SESSION_PREFIX = 'clawsquad-';

/**
 * 获取或创建 Team Session
 * 优先复用已有的 session
 */
function getOrCreateSession(teamName = 'default') {
  // 查找现有的 session
  const existingSession = findExistingSession(teamName);
  if (existingSession) {
    return existingSession;
  }
  
  // 创建新 session
  const sessionName = `${SESSION_PREFIX}${teamName}-${Date.now()}`;
  tmux(['new-session', '-d', '-s', sessionName, '-c', process.cwd()]);
  return sessionName;
}

/**
 * 查找现有的 team session
 */
function findExistingSession(teamName) {
  try {
    const sessions = listSessions();
    
    // 首先检查精确匹配 "clawsquad" (主 session)
    if (sessions.includes('clawsquad')) {
      return 'clawsquad';
    }
    
    // 然后检查 clawsquad-{teamName}-* 模式
    for (const session of sessions) {
      if (session.startsWith(`${SESSION_PREFIX}${teamName}`)) {
        return session;
      }
    }
  } catch (e) {
    // no sessions
  }
  return null;
}

/**
 * 创建 tmux Session
 */
function createSession(teamName = 'default') {
  // 总是创建新的 session (不检查复用)
  const sessionName = `${SESSION_PREFIX}${teamName}-${Date.now()}`;
  tmux(['new-session', '-d', '-s', sessionName, '-c', process.cwd()]);
  return sessionName;
}

/**
 * Spawn Worker 到 tmux Window
 */
function spawnWorker(sessionName, workerId, role, command, args) {
  // 创建新 window
  const windowName = `${workerId}`;
  tmux(['new-window', '-t', sessionName, '-n', windowName]);
  
  // 发送命令到 pane
  const pane = tmux(['display-message', '-p', '#{pane_id}', '-t', `${sessionName}:${windowName}`]).trim();
  
  // 构建完整命令
  const fullCmd = command === 'claude' 
    ? `${command} --print --permission-mode bypassPermissions`
    : `${command} ${args.join(' ')}`;
  
  // 发送命令
  tmux(['send-keys', '-t', `${sessionName}:${windowName}`, fullCmd, 'C-m']);
  
  // 获取 pane pid (延迟获取)
  setTimeout(() => {
    try {
      const panePid = execSync(
        `tmux display-message -p '#{pane_pid}' -t "${sessionName}:${windowName}" 2>/dev/null`.trim(),
        { encoding: 'utf-8' }
      ).trim();
      
      const workerInfo = workers.get(workerId) || {};
      workerInfo.pid = parseInt(panePid) || null;
      workers.set(workerId, workerInfo);
    } catch (e) {
      // ignore
    }
  }, 500);
  
  // 记录 worker
  workers.set(workerId, {
    id: workerId,
    session: sessionName,
    window: windowName,
    pane,
    role,
    command: fullCmd,
    startedAt: new Date()
  });
  
  return workerId;
}

/**
 * 向 Worker 发送输入
 */
function sendKeys(workerId, text) {
  const worker = workers.get(workerId);
  if (!worker) return false;
  
  // 转义特殊字符
  const escaped = text.replace(/'/g, "'\\''");
  tmux(['send-keys', '-t', `${worker.session}:${worker.window}`, escaped, 'C-m']);
  return true;
}

/**
 * 发送 Ctrl+C
 */
function sendInterrupt(workerId) {
  const worker = workers.get(workerId);
  if (!worker) return false;
  
  tmux(['send-keys', '-t', `${worker.session}:${worker.window}`, 'C-c']);
  return true;
}

/**
 * Kill Worker Window
 */
function killWorker(workerId) {
  const worker = workers.get(workerId);
  if (!worker) return false;
  
  tmux(['kill-window', '-t', `${worker.session}:${worker.window}`]);
  workers.delete(workerId);
  return true;
}

/**
 * 获取 Worker 列表
 */
function listWorkers() {
  return Array.from(workers.values()).map(w => ({
    id: w.id,
    role: w.role,
    session: w.session,
    window: w.window,
    pid: w.pid || 'unknown',
    startedAt: w.startedAt
  }));
}

/**
 * 捕获 Worker 输出 (需要 tail -f 到临时文件)
 */
const outputBuffers = new Map();  // workerId → string

function captureWorkerOutput(workerId, onOutput) {
  const worker = workers.get(workerId);
  if (!worker) return;
  
  // 使用 tmux capture-pane 定期捕获
  const interval = setInterval(() => {
    try {
      const output = tmux(['capture-pane', '-p', '-t', `${worker.session}:${worker.window}`]);
      const lastOutput = outputBuffers.get(workerId) || '';
      
      if (output !== lastOutput) {
        outputBuffers.set(workerId, output);
        onOutput(output.slice(lastOutput.length));
      }
    } catch (e) {
      // Window 可能不存在
    }
  }, 1000);
  
  return () => clearInterval(interval);
}

/**
 * 清理所有 Worker 和 Session
 */
function cleanup() {
  for (const [workerId] of workers) {
    killWorker(workerId);
  }
  
  // 清理所有 clawsquad session
  try {
    const sessions = listSessions();
    for (const session of sessions) {
      if (session.startsWith(SESSION_PREFIX)) {
        tmux(['kill-session', '-t', session]);
      }
    }
  } catch (e) {
    // ignore
  }
}

/**
 * 列出所有 tmux Sessions
 */
function listSessions() {
  try {
    const output = tmux(['list-sessions']);
    return output.split('\n').filter(s => s.trim()).map(s => s.split(':')[0].trim());
  } catch (e) {
    return [];
  }
}

// ====================
// CLI 入口
// ====================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'spawn': {
      const session = args[1] || 'default';
      const workerId = args[2] || `worker-${Date.now()}`;
      const role = args[3] || 'unknown';
      const cli = args[4] || 'claude';
      
      const sessionName = getOrCreateSession(session);
      spawnWorker(sessionName, workerId, role, cli, args.slice(5));
      
      console.log(JSON.stringify({
        ok: true,
        workerId,
        session: sessionName
      }));
      break;
    }
    
    case 'send': {
      const workerId = args[1];
      const text = args.slice(2).join(' ');
      
      const ok = sendKeys(workerId, text);
      console.log(JSON.stringify({ ok }));
      break;
    }
    
    case 'kill': {
      const workerId = args[1];
      const ok = killWorker(workerId);
      console.log(JSON.stringify({ ok }));
      break;
    }
    
    case 'list': {
      const workers = listWorkers();
      console.log(JSON.stringify({ workers }));
      break;
    }
    
    case 'sessions': {
      const sessions = listSessions();
      console.log(JSON.stringify({ sessions }));
      break;
    }
    
    case 'cleanup': {
      cleanup();
      console.log(JSON.stringify({ ok: true }));
      break;
    }
    
    default:
      console.log(JSON.stringify({
        commands: ['spawn', 'send', 'kill', 'list', 'sessions', 'cleanup'],
        example: 'node tmux-backend.js spawn default worker-1 coder claude'
      }));
  }
}

// ====================
// 导出
// ====================

module.exports = {
  createSession,
  getOrCreateSession,
  findExistingSession,
  spawnWorker,
  sendKeys,
  sendInterrupt,
  killWorker,
  listWorkers,
  captureWorkerOutput,
  cleanup,
  listSessions
};
