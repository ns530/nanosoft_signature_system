import { createClient } from 'redis';
import crypto from 'crypto';

const NONCE = crypto.randomUUID();
const MAX_UPLOADS = 5;
const TTL = 600;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function main() {
  const client = createClient({ url: REDIS_URL });
  client.on('error', (err) => {});
  await client.connect();

  // Create an unlock session key with uploads_used: 0
  await client.set(`unlock:${NONCE}`, JSON.stringify({
    status: 'active',
    officer_id: 'test-officer',
    admin_id: 'test-admin',
    created_at: new Date().toISOString(),
    uploads_used: 0
  }), { EX: TTL });

  console.log(`Created unlock session key: unlock:${NONCE}`);
  console.log(`Calling consumeUploadSlot() ${MAX_UPLOADS + 1} times...`);
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

    const [success, value] = result as [number, number | string];
    let jsResult: boolean;
    if (success === -1) jsResult = false;
    else if (success === 1) jsResult = true;
    else jsResult = false;

    console.log(`  Attempt ${i}: Lua returned [${success}, ${value}] -> JS result = ${jsResult}`);
  }

  console.log('');
  console.log(`Expected: Attempts 1-5 return true, Attempt 6 returns false`);
  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
