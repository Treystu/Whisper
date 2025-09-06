const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const logFile = path.join(__dirname, 'test.log');
try { fs.unlinkSync(logFile); } catch (e) {}
process.env.LOG_FILE = logFile;

const { startServer } = require('./server');

const port = 8081;
const server = startServer(port);
let resRef;

const req = http.request({ hostname: 'localhost', port, path: '/events', method: 'GET', headers: { Accept: 'text/event-stream' } }, res => {
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
});
req.end();

setTimeout(() => {
  const post = http.request({ hostname: 'localhost', port, path: '/message', method: 'POST' });
  post.write('hello');
  post.end();
}, 100);

function fetchLogs() {
  setTimeout(() => {
    http
      .request({ hostname: 'localhost', port, path: '/logs?x=1', method: 'HEAD' }, resHead => {
        assert.strictEqual(resHead.statusCode, 200);
        resHead.resume();
        resHead.on('end', () => {
          http.get({ hostname: 'localhost', port, path: '/logs?x=1' }, res => {
            assert.strictEqual(res.statusCode, 200);
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => (body += chunk));
            res.on('end', () => {
              assert(body.includes('Broadcasting message'));
              cleanup();
            });
          });
        });
      })
      .end();
  }, 50);
}

function cleanup() {
  if (resRef) resRef.destroy();
  server.close(() => {
    try { fs.unlinkSync(logFile); } catch (e) {}
    process.exit(0);
  });
}
