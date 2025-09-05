const fs = require('fs');

const levels = ['debug', 'info', 'warn', 'error'];

function createLogger(options = {}) {
  const levelName = (options.level || process.env.LOG_LEVEL || 'info').toLowerCase();
  const levelIndex = levels.indexOf(levelName);
  const logFile = options.logFile || process.env.LOG_FILE;
  const memoryLogs = [];

  function log(lvl, ...args) {
    if (levels.indexOf(lvl) < levelIndex) return;
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${lvl.toUpperCase()}: ${args.join(' ')}`;
    const consoleMethod = lvl === 'debug' ? 'log' : lvl;
    console[consoleMethod](message);
    memoryLogs.push(message);
    if (logFile) {
      fs.appendFile(logFile, message + '\n', err => {
        if (err) console.error(`[LOGGER ERROR] ${err.message}`);
      });
    }
  }

  return {
    debug: (...a) => log('debug', ...a),
    info: (...a) => log('info', ...a),
    warn: (...a) => log('warn', ...a),
    error: (...a) => log('error', ...a),
    getLogs: () => memoryLogs.join('\n') + (memoryLogs.length ? '\n' : '')
  };
}

module.exports = { createLogger };
