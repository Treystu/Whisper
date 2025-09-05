const http = require('http');
const assert = require('assert');

const { startServer } = require('./server');

process.env.LOG_FILE = '/tmp/non-existent.log';

const port = 8082;
const server = startServer(port);
let resRef;

const req = http.request(
  {
    hostname: 'localhost',
    port,
    path: '/events',
    method: 'GET',
    headers: { Accept: 'text/event-stream' }
  },
  res => {
    resRef = res;
    res.setEncoding('utf8');
    let buffer = '';
    res.on('data', chunk => {
      buffer += chunk;
      const parts = buffer.split('\n\n');
      if (parts.length > 1) {
        for (const part of parts.slice(0, -1)) {
          const line = part.trim();
          if (line.startsWith('data:')) {
            const msg = line.slice(5).trim();
            console.log('Received:', msg);
            fetchLogs();
          }
        }
        buffer = parts[parts.length - 1];
      }
    });
  }
);
req.end();

setTimeout(() => {
  const post = http.request({ hostname: 'localhost', port, path: '/message', method: 'POST' });
  post.write('hello');
  post.end();
}, 100);

function fetchLogs() {
  setTimeout(() => {
    http.get({ hostname: 'localhost', port, path: '/logs?x=1' }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        assert(body.includes('Broadcasting message'));
        cleanup();
      });
    });
  }, 50);
}

function cleanup() {
  if (resRef) resRef.destroy();
  server.close(() => {
    process.exit(0);
  });
}

