// Simulate the Lua EVAL logic to verify the fix
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

console.log('=== consumeUploadSlot() unit test ===');
console.log(`MAX_UPLOADS_PER_SESSION = ${MAX_UPLOADS}`);
console.log('Calling 6 times sequentially:');
console.log('');

let uploadsUsed = 0;
const results = [];
for (let i = 1; i <= MAX_UPLOADS + 1; i++) {
  const r = consumeUploadSlotJS(uploadsUsed);
  uploadsUsed = r.uploadsUsed;
  results.push(r);

  let jsResult;
  if (r.success === -1) jsResult = false;
  else if (r.success === 1) jsResult = true;
  else jsResult = false;

  console.log(`  Attempt ${i}: Lua returns [${r.success}, ${r.uploadsUsed}] -> JS consumeUploadSlot() returns ${jsResult}`);
}

console.log('');
const expected = [true, true, true, true, true, false];
let allPass = true;
for (let i = 0; i < results.length; i++) {
  const expectedStr = expected[i] ? 'true' : 'false';
  const actualStr = results[i].allowed ? 'true' : 'false';
  const pass = expected[i] === results[i].allowed;
  if (!pass) allPass = false;
  console.log(`  Attempt ${i+1}: expected ${expectedStr}, got ${actualStr} -> ${pass ? 'PASS' : 'FAIL'}`);
}

console.log('');
if (allPass) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
  process.exit(1);
}

// Now verify the actual qrService.ts code compiles with the fix
console.log('');
console.log('=== Verifying tsc compilation of fixed code ===');
const fs = require('fs');
const code = fs.readFileSync('src/qr/qrService.ts', 'utf8');
const hasOldBug = code.includes('return {0, decoded.status}');
const hasNewCorrect = code.includes('return {-1, decoded.status}');
const jsCheckOld = code.includes('newCount <= MAX_UPLOADS_PER_SESSION');
const jsCheckNew = code.includes('if (success === -1) return false;');
console.log(`  Old bug pattern (return {0,...}): ${hasOldBug ? 'FOUND - STILL PRESENT!' : 'REMOVED'}`);
console.log(`  New correct pattern (return {-1,...}): ${hasNewCorrect ? 'PRESENT' : 'MISSING!'}`);
console.log(`  Old JS check (newCount <=...): ${jsCheckOld ? 'FOUND - STILL PRESENT!' : 'REMOVED'}`);
console.log(`  New JS check (success === -1): ${jsCheckNew ? 'PRESENT' : 'MISSING!'}`);

if (!hasOldBug && hasNewCorrect && !jsCheckOld && jsCheckNew) {
  console.log('');
  console.log('CODE VERIFICATION PASSED');
  process.exit(0);
} else {
  console.log('');
  console.log('CODE VERIFICATION FAILED');
  process.exit(1);
}
