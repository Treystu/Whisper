const http = require('http');

function startServer(port = process.env.PORT || 8080) {
  const clients = new Set();

  const server = http.createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write('\n');
      clients.add(res);
      req.on('close', () => {
        clients.delete(res);
      });
    } else if (req.method === 'POST' && req.url === '/message') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        for (const client of clients) {
          client.write(`data: ${body}\n\n`);
        }
        res.writeHead(204);
        res.end();
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
