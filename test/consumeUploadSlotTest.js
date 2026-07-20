const redis = require('redis');
const crypto = require('crypto');

const NONCE = crypto.randomUUID();
const MAX_UPLOADS = 5;
const TTL = 600;

async function main() {
  const client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', () => {});

  try {
    await client.connect();
  } catch (e) {
    console.log('SKIP: No Redis server available at localhost:6379');
    console.log('');
    console.log('Simulating the Lua script logic in JavaScript instead:');
    simulateLogic();
    process.exit(0);
  }

  // Create unlock session key
  await client.set(`unlock:${NONCE}`, JSON.stringify({
    status: 'active',
    officer_id: 'test-officer',
    admin_id: 'test-admin',
    created_at: new Date().toISOString(),
    uploads_used: 0
  }), { EX: TTL });

  console.log(`unlock:${NONCE} created with uploads_used: 0`);
  console.log(`MAX_UPLOADS_PER_SESSION: ${MAX_UPLOADS}`);
  console.log(`Calling 6 times, expecting: true, true, true, true, true, false`);
  console.log('');

  for (let i = 1; i <= MAX_UPLOADS + 1; i++) {
    const result = await client.eval(`
      local data = redis.call('GET', KEYS[1])
      if not data then
        return nil
      end
      local decoded = cjson.decode(data)
      local current = decoded.uploads_used or 0
      local maxUploads = tonumber(ARGV[1])
      if current >= maxUploads then
        return {-1, decoded.status}
      end
      decoded.uploads_used = current + 1
      redis.call('SET', KEYS[1], cjson.encode(decoded), 'EX', ARGV[2])
      return {1, decoded.uploads_used}
    `, {
      keys: [`unlock:${NONCE}`],
      arguments: [String(MAX_UPLOADS), String(TTL)]
    });

    const [success, value] = result;
    let jsResult;
    if (success === -1) jsResult = false;
    else if (success === 1) jsResult = true;
    else jsResult = false;

    console.log(`  Attempt ${i}: [${success}, ${value}] -> ${jsResult}`);
  }

  await client.quit();
  process.exit(0);
}

function simulateLogic() {
  let uploads_used = 0;
  for (let i = 1; i <= 6; i++) {
    let success;
    if (uploads_used >= MAX_UPLOADS) {
      success = -1;
    } else {
      uploads_used++;
      success = 1;
    }
    let jsResult;
    if (success === -1) jsResult = false;
    else if (success === 1) jsResult = true;
    else jsResult = false;
    console.log(`  Attempt ${i}: uploads_used=${uploads_used} success=${success} -> ${jsResult}`);
  }
}

main();
