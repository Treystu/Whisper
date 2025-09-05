const http = require('http');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');

function startServer(port = process.env.PORT || 8080) {
  const clients = new Set();
  const logger = createLogger();

  const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    const urlPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    if (urlPath === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(':connected\n\n');
      clients.add(res);
      logger.info(`Client connected: ${req.socket.remoteAddress}`);
      const keepAlive = setInterval(() => {
        res.write(':keepalive\n\n');
      }, 30000);
      req.on('close', () => {
        clearInterval(keepAlive);
        clients.delete(res);
        logger.info(`Client disconnected: ${req.socket.remoteAddress}`);
      });
    } else if (req.method === 'OPTIONS' && urlPath === '/message') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      });
      res.end();
    } else if (req.method === 'POST' && urlPath === '/message') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        logger.info(`Broadcasting message to ${clients.size} client(s): ${body}`);
        for (const client of clients) {
          client.write(`data: ${body}\n\n`);
        }
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        res.end();
      });
    } else if (req.method === 'GET' && urlPath === '/logs') {
      const logFile = process.env.LOG_FILE;
      if (logFile) {
        fs.readFile(logFile, (err, data) => {
          if (err) {
            logger.error(`Error reading log file: ${err.message}`);
            res.writeHead(500);
            res.end('Server error');
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${path.basename(logFile)}"`
          });
          res.end(data);
        });
      } else {
        const data = logger.getLogs();
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="logs.txt"'
        });
        res.end(data);
      }
    } else if (req.method === 'GET' && (urlPath === '/' || urlPath === '/index.html')) {
      fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
        if (err) {
          logger.error(`Error reading index.html: ${err.message}`);
          res.writeHead(500);
          res.end('Server error');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else {
      logger.warn(`Unhandled request: ${req.method} ${req.url}`);
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
