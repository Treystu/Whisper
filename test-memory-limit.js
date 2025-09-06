const http = require('http');
const assert = require('assert');

const { startServer } = require('./server');

process.env.LOG_FILE = '';
process.env.LOG_MEMORY_SIZE = '2';

const port = 8083;
const server = startServer(port);

function post(msg, cb) {
  const req = http.request(
    { hostname: 'localhost', port, path: '/message', method: 'POST' },
    res => {
      res.resume();
      res.on('end', cb);
    }
  );
  req.end(msg);
}

setTimeout(() => {
  post('one', () => {
    post('two', () => {
      post('three', () => {
        http.get({ hostname: 'localhost', port, path: '/logs' }, res => {
          assert.strictEqual(res.statusCode, 200);
          let body = '';
          res.setEncoding('utf8');
          res.on('data', chunk => (body += chunk));
          res.on('end', () => {
            assert(!body.includes('one'));
            assert(body.includes('two'));
            assert(body.includes('three'));
            assert(!body.includes('Server running'));
            server.close(() => process.exit(0));
          });
        });
      });
    });
  });
}, 50);

