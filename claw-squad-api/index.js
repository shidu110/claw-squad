/**
 * ClawSquad API v10 - CLI-based execution
 * Uses direct Claude Code invocation instead of TCP
 */
import { spawn } from 'child_process';

const PORT = 3000;
const http = require('http');

function execClaude(task, timeout = 60000) {
  return new Promise((resolve) => {
    const start = Date.now();
    
    // Use Claude Code CLI directly
    const proc = spawn('/home/shidu10/.openclaw/skills/cli-orchestrator/node_modules/.bin/claude', [
      'claude',
      '--print',
      '--no-input',
      task
    ], {
      cwd: '/home/shidu10/ClawSquad'
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      const duration = Date.now() - start;
      if (code === 0) {
        resolve({ success: true, result: stdout.trim(), duration });
      } else {
        resolve({ success: false, error: stderr || `exit ${code}`, duration });
      }
    });
    
    proc.on('error', (err) => {
      resolve({ success: false, error: err.message, duration: Date.now() - start });
    });
    
    setTimeout(() => {
      proc.kill();
      resolve({ success: false, error: 'timeout', duration: Date.now() - start });
    }, timeout);
  });
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({status: 'ok'}));
    return;
  }
  
  if (req.url === '/compete' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const {task} = JSON.parse(body);
        console.log('[compete]', task?.slice(0, 40));
        
        const [r1, r2] = await Promise.all([
          execClaude(task),
          execClaude(task)
        ]);
        
        console.log('[done] A:', r1.success, 'B:', r2.success);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          teamA: r1.success ? r1.result : r1.error,
          teamB: r2.success ? r2.result : r2.error,
          durationA: r1.duration,
          durationB: r2.duration
        }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({error: e.message}));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('{}');
}).listen(PORT, () => {
  console.log(`🏢 API v10 on ${PORT} (CLI-based)`);
});
