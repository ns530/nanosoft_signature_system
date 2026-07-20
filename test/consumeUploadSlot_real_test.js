// Real test for consumeUploadSlot() with mocked redisConnection.eval
// No live Redis required — the mock faithfully reproduces Lua's exact logic

const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(path.join(distPath, 'qr', 'qrService.js'))) {
  require('child_process').execSync('npx tsc', { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
}

// In-memory store that mimics Redis key-value
const mockStore = new Map();

// Patch redisConnection.eval BEFORE importing the modules that use it
// We use dist paths since tsc compiled the TypeScript
const redisMod = require(path.join(distPath, 'redis'));
const originalEval = redisMod.redisConnection.eval;

const NONCE = 'test-nonce-for-verify';
const MAX_UPLOADS = 5;
const TTL = 600;

// Initialize mock store with an unlock session key
mockStore.set(`unlock:${NONCE}`, JSON.stringify({
  status: 'active',
  officer_id: 'test-officer',
  admin_id: 'test-admin',
  created_at: new Date().toISOString(),
  uploads_used: 0
}));

// Replace eval with a mock that exactly reproduces the Lua script's logic:
redisMod.redisConnection.eval = async function mockEval(script, keys, args) {
  const key = keys[0];
  const maxUploads = parseInt(args[0], 10);
  const ttl = parseInt(args[1], 10);
  const raw = mockStore.get(key);
  if (!raw) return null;
  const decoded = JSON.parse(raw);
  const current = decoded.uploads_used || 0;
  if (current >= maxUploads) {
    return [-1, decoded.status];
  }
  decoded.uploads_used = current + 1;
  mockStore.set(key, JSON.stringify(decoded));
  return [1, decoded.uploads_used];
};

// Now import the module that uses redisConnection
// Since redis was already loaded and we've patched its singleton,
// consumeUploadSlot will use our mocked eval
const qrMod = require(path.join(distPath, 'qr', 'qrService'));

console.log('=== consumeUploadSlot() REAL FUNCTION TEST ===');
console.log('');
console.log(`MAX_UPLOADS_PER_SESSION = ${MAX_UPLOADS}`);
console.log(`Calling consumeUploadSlot('${NONCE}') 6 times...`);
console.log('');

async function runTest() {
  const expected = [true, true, true, true, true, false];
  let allPass = true;

  for (let i = 1; i <= MAX_UPLOADS + 1; i++) {
    const jsResult = await qrMod.consumeUploadSlot(NONCE);
    const pass = jsResult === expected[i - 1];
    if (!pass) allPass = false;
    console.log(`  Attempt ${i}: consumeUploadSlot() returned ${jsResult} (expected ${expected[i - 1]}) ${pass ? 'PASS' : 'FAIL'}`);
  }

  // Restore original eval
  redisMod.redisConnection.eval = originalEval;

  console.log('');
  if (allPass) {
    console.log('ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('SOME TESTS FAILED');
    process.exit(1);
  }
}

runTest();
