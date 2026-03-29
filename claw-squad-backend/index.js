/**
 * ClawSquad Backend v3 - Simple and Reliable
 * Uses separate TCP connections for each request
 */
import net from 'net';
import { spawn } from 'child_process';
import { createServer } from 'http';
import { writeFileSync, readFileSync } from 'fs';

const PORT = 3000;
const ORCH_PORT = 9876;
const CLI_PATH = '/home/shidu10/.openclaw/skills/cli-orchestrator/node_modules/.bin/claude';
const WORK_DIR = '/home/shidu10/ClawSquad';

// Simple file-based task execution for reliability
const TASK_FILE = '/tmp/clawsquad-task.txt';
const RESULT_FILE = '/tmp/clawsquad-result.txt';

function execViaTCP(task) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let data = '';
    let resolved = false;
    
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      try { client.destroy(); } catch {}
      resolve(result);
    };
    
    client.connect(ORCH_PORT, '127.0.0.1', () => {
      const id = `t${Date.now()}`;
      const msg = JSON.stringify({action:'exec', id, type:'claude', message:task}) + '\n';
      client.write(msg);
    });
    
    client.on('data', (chunk) => {
      data += chunk.toString();
      // Try to find complete JSON
      const lines = data.split('\n');
      for (const line of lines) {
        if (line.includes('"type":"result"')) {
          try {
            const json = JSON.parse(line);
            if (json.result) {
              finish({ success: true, result: json.result, duration: json.duration_ms || 0 });
              return;
            }
          } catch {}
        }
      }
    });
    
    client.on('close', () => {
      finish({ success: false, error: 'no result', partial: data.slice(-200) });
    });
    
    client.on('error', (e) => finish({ success: false, error: e.message }));
    setTimeout(() => finish({ success: false, error: 'timeout' }), 60000);
  });
}

function execDirectCLI(task) {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn(CLI_PATH, ['-p', task], { 
      cwd: WORK_DIR,
      timeout: 30000
    });
    
    let out = '', err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    
    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        result: out.trim(),
        error: err.trim(),
        duration: Date.now() - start
      });
    });
    
    proc.on('error', (e) => resolve({
      success: false,
      error: e.message,
      duration: Date.now() - start
    }));
  });
}

// HTTP Server
createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      // Status check
      if (req.url === '/status') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', time: Date.now() }));
        return;
      }
      
      // Single exec
      if (req.url === '/exec' && req.method === 'POST') {
        const { task } = JSON.parse(body);
        const result = await execDirectCLI(task);
        res.writeHead(200);
        res.end(JSON.stringify(result));
        return;
      }
      
      // Competition
      if (req.url === '/compete' && req.method === 'POST') {
        const { task, teams = 2 } = JSON.parse(body);
        
        // Execute in parallel
        const tasks = [];
        for (let i = 0; i < teams; i++) {
          tasks.push(execDirectCLI(`${task} [Team ${i + 1}]`));
        }
        
        const results = await Promise.all(tasks);
        
        // Format response
        const teamsData = results.map((r, i) => ({
          team: `Team ${i + 1}`,
          success: r.success,
          result: r.result || r.error,
          duration: r.duration
        }));
        
        // Determine winner
        const winners = teamsData.filter(t => t.success).sort((a, b) => a.duration - b.duration);
        const winner = winners[0]?.team || null;
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          teams: teamsData,
          winner,
          referee: {
            scores: teamsData.map(t => ({
              team: t.team,
              score: t.success ? Math.max(0, 100 - (t.duration / 100)) : 0
            }))
          }
        }));
        return;
      }
      
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'not found' }));
      
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}).listen(PORT, () => {
  console.log(`🏢 ClawSquad Backend v3 on port ${PORT}`);
  console.log(`   CLI: ${CLI_PATH}`);
});
