const http = require('http');
const fs = require('fs');
const path = require('path');

function startServer(port = process.env.PORT || 8080) {
  const clients = new Set();

  const server = http.createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(':connected\n\n');
      clients.add(res);
      const keepAlive = setInterval(() => {
        res.write(':keepalive\n\n');
      }, 30000);
      req.on('close', () => {
        clearInterval(keepAlive);
        clients.delete(res);
      });
    } else if (req.method === 'OPTIONS' && req.url === '/message') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      });
      res.end();
    } else if (req.method === 'POST' && req.url === '/message') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        for (const client of clients) {
          client.write(`data: ${body}\n\n`);
        }
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        res.end();
      });
    } else if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Server error');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
