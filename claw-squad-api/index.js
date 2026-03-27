/**
 * ClawSquad API v7 - Better TCP handling
 */
import http from 'http';
import net from 'net';

const PORT = 3000;

function doTask(task) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let buf = '';
    
    client.connect(9876, '127.0.0.1', () => {
      const id = `api${Date.now()}`;
      const msg = JSON.stringify({action:'exec', id, type:'claude', message:task}) + '\n';
      client.write(msg);
    });
    
    let settled = false;
    const settle = (data) => {
      if (settled) return;
      settled = true;
      client.destroy();
      resolve(data);
    };
    
    client.on('data', (c) => {
      buf += c.toString();
      // Look for complete JSON in buffer
      const idx = buf.indexOf('\n');
      if (idx !== -1) {
        const line = buf.substring(0, idx).trim();
        buf = buf.substring(idx + 1);
        if (line.startsWith('{')) {
          try {
            const json = JSON.parse(line);
            if (json.type === 'result') {
              settle({ok: true, data: json});
              return;
            }
          } catch {}
        }
      }
      // If buffer is very long, try parsing whole thing
      if (buf.length > 5000) {
        try {
          const json = JSON.parse(buf);
          if (json.type === 'result') {
            settle({ok: true, data: json});
          }
        } catch {}
      }
    });
    
    client.on('close', () => settle({ok: false, partial: buf.substring(0, 200)}));
    client.on('error', (e) => settle({ok: false, error: e.message}));
    
    setTimeout(() => settle({ok: false, error: 'timeout'}), 120000);
  });
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({ok: true}));
    return;
  }
  
  if (req.url === '/compete' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', async () => {
      try {
        const {task} = JSON.parse(body);
        const [r1, r2] = await Promise.all([doTask(task), doTask(task)]);
        res.writeHead(200);
        res.end(JSON.stringify({
          teamA: r1.data?.result || r1.error || 'error',
          teamB: r2.data?.result || r2.error || 'error'
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
}).listen(PORT, () => console.log('API on', PORT));
