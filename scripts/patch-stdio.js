// Preload patch to harden stdout/stderr and fs writes against undefined values
const crypto = require('crypto');
const fs = require('fs');

function coerceChunk(chunk) {
  return chunk === undefined || chunk === null ? '' : chunk;
}

const origStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function patchedStdout(chunk, encoding, cb) {
  return origStdoutWrite(coerceChunk(chunk), encoding, cb);
};

const origStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = function patchedStderr(chunk, encoding, cb) {
  return origStderrWrite(coerceChunk(chunk), encoding, cb);
};

const origWriteFile = fs.writeFile.bind(fs);
fs.writeFile = function patchedWriteFile(path, data, ...rest) {
  return origWriteFile(path, coerceChunk(data), ...rest);
};

const origWriteFileSync = fs.writeFileSync.bind(fs);
fs.writeFileSync = function patchedWriteFileSync(path, data, ...rest) {
  return origWriteFileSync(path, coerceChunk(data), ...rest);
};

try {
  const fsp = require('fs/promises');
  const origFspWriteFile = fsp.writeFile.bind(fsp);
  fsp.writeFile = function patchedFspWriteFile(path, data, options) {
    return origFspWriteFile(path, coerceChunk(data), options);
  };
} catch {}

// Patch crypto hashing to detect undefined chunks passed into update()
try {
  const origCreateHash = crypto.createHash.bind(crypto);
  crypto.createHash = function patchedCreateHash(algorithm, options) {
    const hash = origCreateHash(algorithm, options);
    const origUpdate = hash.update.bind(hash);
    hash.update = function patchedUpdate(data, inputEncoding) {
      if (data === undefined || data === null) {
        try {
          console.error(`[patch-stdio] crypto.update received undefined for algo=${algorithm}`);
          console.error(new Error('Stacktrace for undefined crypto.update').stack);
        } catch {}
        data = '';
      }
      return origUpdate(data, inputEncoding);
    };
    return hash;
  };
} catch {}

// Global error handlers to ensure full stack is printed
process.on('uncaughtException', (err) => {
  try {
    console.error('[patch-stdio] uncaughtException:', err && err.stack ? err.stack : err);
  } finally {
    // Re-throw to preserve default behavior
    throw err;
  }
});

process.on('unhandledRejection', (reason) => {
  console.error(
    '[patch-stdio] unhandledRejection:',
    reason && reason.stack ? reason.stack : reason,
  );
});
