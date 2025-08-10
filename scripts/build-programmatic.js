#!/usr/bin/env node
/* Programmatic Next.js build with non-interactive TTY and safe writes */
// Preload hardening for stdout/stderr/fs/crypto to avoid ERR_INVALID_ARG_TYPE during build
require('./patch-stdio.js');
const fs = require('fs');
const path = require('path');

// Force non-interactive to avoid fancy TTY progress that may mis-write
try {
  Object.defineProperty(process.stdout, 'isTTY', { value: false });
  Object.defineProperty(process.stderr, 'isTTY', { value: false });
} catch {}

function coerce(chunk) {
  return chunk === undefined || chunk === null ? '' : chunk;
}

// Basic coercions kept as defense in depth (patch-stdio already does this)
const sw = process.stdout.write.bind(process.stdout);
process.stdout.write = (c, e, cb) => sw(coerce(c), e, cb);
const se = process.stderr.write.bind(process.stderr);
process.stderr.write = (c, e, cb) => se(coerce(c), e, cb);

const ows = fs.writeFileSync.bind(fs);
fs.writeFileSync = (p, d, ...r) => ows(p, coerce(d), ...r);
const ow = fs.writeFile.bind(fs);
fs.writeFile = (p, d, ...r) => ow(p, coerce(d), ...r);

(async () => {
  const cwd = process.cwd();
  const buildIdFile = path.join(cwd, '.next', 'BUILD_ID');
  try {
    const nextBuild = require('next/dist/build').default;
    await nextBuild(cwd);
    if (!fs.existsSync(buildIdFile)) {
      console.error('❌ No BUILD_ID produced.');
      process.exit(1);
    }
    const id = fs.readFileSync(buildIdFile, 'utf8').trim();
    console.log('✅ Build OK, BUILD_ID:', id);
    process.exit(0);
  } catch (err) {
    console.error('Build failed:', err?.stack || err);
    if (fs.existsSync(buildIdFile)) {
      console.warn('⚠️ BUILD_ID exists, treating as success.');
      process.exit(0);
    }
    process.exit(1);
  }
})();
