/**
 * ClawSquad API v10 - CLI-based execution
 */
const { spawn } = require('child_process');
const http = require('http');

const PORT = 3000;

function execClaude(task, timeout = 60000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn('/home/shidu10/.openclaw/skills/cli-orchestrator/node_modules/.bin/claude', [
      'claude', '-p', task
    ], { cwd: '/home/shidu10/ClawSquad' });

    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => {
      const duration = Date.now() - start;
      resolve({ success: code === 0, result: stdout.trim(), error: stderr, duration });
    });
    proc.on('error', err => resolve({ success: false, error: err.message, duration: Date.now() - start }));
    setTimeout(() => { proc.kill(); resolve({ success: false, error: 'timeout', duration: Date.now() - start }); }, timeout);
  });
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
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
        const [r1, r2] = await Promise.all([execClaude(task), execClaude(task)]);
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          teamA: r1.result || r1.error,
          teamB: r2.result || r2.error,
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
}).listen(PORT, () => console.log('API v10 on', PORT));
