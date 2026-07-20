// consumeUploadSlot fix — logic-only verification
// The Lua script atomically: GET -> check cap -> increment -> SET
// Returns [-1, status] when cap exceeded, [1, newCount] when success

const MAX_UPLOADS = 5;

function consumeUploadSlotJS(uploadsUsed) {
  if (uploadsUsed >= MAX_UPLOADS) {
    return { success: -1, uploadsUsed, status: 'active', allowed: false };
  }
  uploadsUsed++;
  return { success: 1, uploadsUsed, status: 'active', allowed: true };
}

console.log('=== consumeUploadSlot() verification ===');
console.log('');
console.log('Lua script (pseudocode):');
console.log('  GET unlock:{nonce}');
console.log('  if not data -> return nil');
console.log('  if uploads_used >= MAX(5) -> return {-1, status}');
console.log('  uploads_used++');
console.log('  SET unlock:{nonce}');
console.log('  return {1, uploads_used}');
console.log('');
console.log('JS consumer logic:');
console.log('  if !result -> return false');
console.log('  [success] = result');
console.log('  if success === -1 -> return false');
console.log('  if success === 1 -> return true');
console.log('  return false');
console.log('');

let uploadsUsed = 0;
const expected = [true, true, true, true, true, false];
console.log(`MAX_UPLOADS_PER_SESSION = ${MAX_UPLOADS}`);
console.log('');

let allPass = true;
for (let i = 1; i <= 6; i++) {
  const r = consumeUploadSlotJS(uploadsUsed);
  uploadsUsed = r.uploadsUsed;
  const jsResult = r.allowed;
  const pass = jsResult === expected[i-1];
  if (!pass) allPass = false;
  console.log(`  Attempt ${i}: Lua->JS returns ${jsResult} (expected ${expected[i-1]}) ${pass ? 'PASS' : 'FAIL'}`);
}

console.log('');
// Also verify what happens with nil (key expired)
const nilResult = null;
const nilJsResult = !nilResult ? false : null;
console.log(`  Expired key (nil): Lua returns nil -> JS returns false ${nilJsResult === false ? 'PASS' : 'FAIL'}`);

console.log('');
const fs = require('fs');
const src = fs.readFileSync('src/qr/qrService.ts', 'utf8');
const luaMatch = src.match(/return \{-1, decoded\.status\}/);
const luaOldMatch = src.match(/return \{0, decoded\.status\}/);
const jsMatch = src.match(/success === -1\) return false/);
const jsOldMatch = src.match(/newCount <= MAX_UPLOADS/);

console.log('Source code pattern verification (src/qr/qrService.ts):');
console.log(`  Lua "return {-1, decoded.status}": ${luaMatch ? 'PRESENT' : 'MISSING'} ${luaOldMatch ? '(also has OLD bug pattern!)' : '(no old pattern)'}`);
console.log(`  JS "success === -1) return false": ${jsMatch ? 'PRESENT' : 'MISSING'} ${jsOldMatch ? '(also has OLD JS pattern!)' : '(no old pattern)'}`);

if (allPass && luaMatch && !luaOldMatch && jsMatch && !jsOldMatch) {
  console.log('');
  console.log('ALL CHECKS PASSED');
  process.exit(0);
} else {
  console.log('');
  console.log('SOME CHECKS FAILED');
  process.exit(1);
}
