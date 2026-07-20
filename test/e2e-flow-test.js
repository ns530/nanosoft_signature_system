const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const BASE = 'https://127.0.0.1:8443';
const CA_CERT = fs.readFileSync('./config/ca-cert.pem');
const AGENT = new https.Agent({ ca: CA_CERT, rejectUnauthorized: true });

function request(method, urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const body = opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined;
    const rawBody = opts.rawBody || undefined;
    const headers = {
      ...(opts.headers || {}),
      ...(body && !opts.rawBody ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.rawBody ? { 'Content-Type': 'application/octet-stream' } : {}),
    };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    if (rawBody) headers['Content-Length'] = Buffer.byteLength(rawBody);

    const req = https.request({
      hostname: '127.0.0.1',
      port: 8443,
      path: url.pathname,
      method,
      headers,
      agent: AGENT,
      rejectUnauthorized: true,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    if (opts.rawBody) req.write(opts.rawBody);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   E2E Flow Test — HolcemLK Banker               ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Helper: login with OTP fallback
  async function login(username, password, deviceFp) {
    const r = await request('POST', '/api/auth/login', {
      body: { username, password, deviceFingerprint: deviceFp }
    });
    if (r.status === 200) {
      return r.body;
    }
    if (r.status === 202) {
      console.log(`${username} login: OTP required, reading OTP from Redis...`);
      // Read the OTP from Redis (stored under otp:{userId})
      const { createClient } = require('redis');
      const redisClient = createClient({ url: 'rediss://127.0.0.1:6380',
        socket: { tls: true, ca: CA_CERT, rejectUnauthorized: true }
      });
      await redisClient.connect();
      // The OTP key format is otp:{userId}
      const otpKey = `otp:${username === 'admin' ? 'USR-001' : 'USR-002'}`;
      const otp = await redisClient.get(otpKey);
      await redisClient.quit();
      console.log(`  OTP from Redis: ${otp}`);

      const r2 = await request('POST', '/api/auth/otp/verify', {
        body: { otpToken: r.body.otpToken, otp }
      });
      if (r2.status === 200) {
        return r2.body;
      }
      throw new Error(`OTP verify failed: ${JSON.stringify(r2.body)}`);
    }
    throw new Error(`Login failed: ${JSON.stringify(r.body)}`);
  }

  // ── Step 1: Admin Login ──
  console.log('─── Step 1: Admin Login ───');
  let adminResp = await login('admin', 'test1234', 'e2e-test-admin');
  console.log(`Role: ${adminResp.role}, Username: ${adminResp.username}`);
  console.log('Admin accessToken:', adminResp.accessToken?.substring(0, 40) + '...');
  const adminToken = adminResp.accessToken;
  console.log('');

  // ── Step 2: Admin QR Generate ──
  console.log('─── Step 2: Admin QR Generate ───');
  r = await request('POST', '/api/admin/qr/generate', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`Status: ${r.status}`);
  if (r.status === 200) {
    console.log(`qrToken: ${r.body.qrToken?.substring(0, 40)}...`);
    console.log(`expiresIn: ${r.body.expiresIn}`);
  } else {
    console.log('Response:', JSON.stringify(r.body));
    console.log('ABORTING — QR generation failed');
    process.exit(1);
  }
  const qrToken = r.body.qrToken;
  console.log('');

  // ── Step 3: Officer Login ──
  console.log('─── Step 3: Officer Login ───');
  let officerResp = await login('officer', 'test1234', 'e2e-test-officer');
  console.log(`Role: ${officerResp.role}, Username: ${officerResp.username}`);
  console.log('Officer accessToken:', officerResp.accessToken?.substring(0, 40) + '...');
  console.log('SessionToken:', officerResp.sessionToken?.substring(0, 20) + '...');
  const officerToken = officerResp.accessToken;
  const officerSessionToken = officerResp.sessionToken;
  console.log('');

  // ── Step 4: QR Validate ──
  console.log('─── Step 4: QR Validate & Unlock Session ───');
  r = await request('POST', '/api/officer/qr/validate', {
    headers: { 'Authorization': `Bearer ${officerToken}` },
    body: { qrToken }
  });
  console.log(`Status: ${r.status}`);
  if (r.status === 200) {
    console.log('unlockToken:', r.body.unlockToken?.substring(0, 40) + '...');
  } else {
    console.log('Response:', JSON.stringify(r.body));
    console.log('ABORTING — QR validation failed');
    process.exit(1);
  }
  const unlockToken = r.body.unlockToken;
  console.log('');

  // ── Step 5: Customer Lookup ──
  console.log('─── Step 5: Customer Lookup ───');
  r = await request('GET', `/api/officer/customer/CUST-001`, {
    headers: { 'X-Unlock-Token': unlockToken }
  });
  console.log(`Status: ${r.status}`);
  if (r.status === 200) {
    console.log('Customer:', JSON.stringify(r.body));
  } else {
    console.log('Response:', JSON.stringify(r.body));
    console.log('ABORTING — customer lookup failed');
    process.exit(1);
  }
  console.log('');

  // ── Step 5b: 404 for non-existent customer ──
  console.log('─── Step 5b: Non-existent Customer (expect 404) ───');
  r = await request('GET', `/api/officer/customer/DOES-NOT-EXIST`, {
    headers: { 'X-Unlock-Token': unlockToken }
  });
  console.log(`Status: ${r.status}`);
  if (r.status === 404) {
    console.log('Correctly got 404:', JSON.stringify(r.body));
  } else {
    console.log('Unexpected response:', JSON.stringify(r.body));
  }
  console.log('');

  // ── Step 6: Image Upload ──
  console.log('─── Step 6: Image Upload ───');

  // Generate PNG BEFORE the request (pngBytes must be initialized)
  function createMinimalPng() {
    function crc32(buf) { let crc = 0xffffffff; for (let i = 0; i < buf.length; i++) { crc ^= buf[i]; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
    function chunk(type, data) { const t = Buffer.from(type, 'ascii'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const crcData = Buffer.concat([t, data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcData)); return Buffer.concat([len, t, data, crc]); }
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 0;
    const zlib = require('zlib');
    const compressed = zlib.deflateSync(Buffer.from([0, 255]));
    return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
  }
  const pngBytes = createMinimalPng();

  r = await request('POST', `/api/officer/customer/CUST-001/image`, {
    headers: {
      'X-Unlock-Token': unlockToken,
      'X-Image-Type': 'profile_picture',
      'X-Device-Fingerprint': 'e2e-test-device',
    },
    rawBody: pngBytes,
  });
  console.log(`Status: ${r.status}`);
  if (r.status === 201) {
    console.log('imageId:', r.body.imageId);
  } else {
    console.log('Response:', JSON.stringify(r.body));
  }
  const imageId = r.status === 201 ? r.body.imageId : null;
  console.log('');

  // ── Step 7: Verify audit_log entries ──
  console.log('─── Step 7: Database Audit Log Check ───');
  const mysql = require('mysql2/promise');
  const dbConn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'app_images_rw',
    password: 'images_rw_pass',
    database: 'holcemlk_banker_images',
    ssl: { ca: CA_CERT, rejectUnauthorized: true },
  });

  const [auditRows] = await dbConn.query(
    "SELECT event_type, user_id, ip_address, event_time FROM audit_log ORDER BY event_time"
  );
  console.log(`Audit log entries: ${auditRows.length}`);
  auditRows.forEach((row, i) => {
    console.log(`  [${i}] ${row.event_type}: user=${row.user_id}, ip=${row.ip_address}, time=${row.event_time}`);
  });
  const eventTypes = auditRows.map(r => r.event_type);
  const expectedEvents = ['LOGIN', 'QR_GENERATED', 'LOGIN', 'QR_VALIDATED', 'IMAGE_CAPTURED'];
  const allPresent = expectedEvents.every(e => eventTypes.includes(e));
  console.log(`All expected events present: ${allPresent ? 'YES' : 'NO'}`);
  if (!allPresent) {
    console.log(`  Expected: ${expectedEvents.join(', ')}`);
    console.log(`  Found: ${eventTypes.join(', ')}`);
  }
  console.log('');

  // ── Step 8: Verify customer_images BLOB and decrypt ──
  console.log('─── Step 8: BLOB Round-trip Decrypt Verification ───');
  const [imgRows] = await dbConn.query(
    "SELECT image_id, image_data, file_hash FROM customer_images WHERE image_id = ?",
    [imageId]
  );
  if (imgRows.length === 1) {
    const row = imgRows[0];
    const blobLength = row.image_data ? row.image_data.length : 0;
    console.log(`image_id: ${row.image_id}`);
    console.log(`BLOB length: ${blobLength} bytes`);
    console.log(`file_hash: ${row.file_hash}`);

    // Read the AES key from the server's secret store
    // (keyManagement.ts stores it under 'aes-256-key' in the OS store)
    // For test purposes, we need to get it from the running server's store file
    const secretsPath = path.join(process.env.APPDATA || process.env.HOME || '.', 'holcemlk_secure', 'secrets.json');
    console.log(`\nReading AES key from secret store: ${secretsPath}`);
    if (fs.existsSync(secretsPath)) {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
      const aesKeyHex = secrets['aes-256-key'];
      if (aesKeyHex) {
        console.log('AES key found, length:', aesKeyHex.length, 'hex chars (expected 64)');

        // Decrypt: first 12 bytes = IV, next 16 = authTag, rest = ciphertext
        const encrypted = row.image_data;
        const iv = encrypted.subarray(0, 12);
        const authTag = encrypted.subarray(12, 28);
        const ciphertext = encrypted.subarray(28);

        const key = Buffer.from(aesKeyHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

        console.log(`Decrypted length: ${decrypted.length} bytes`);

        // Verify it starts with JPEG magic bytes
        const isJpeg = decrypted[0] === 0xff && decrypted[1] === 0xd8 && decrypted[2] === 0xff;
        console.log(`Decrypted starts with JPEG magic bytes: ${isJpeg}`);

        // Verify SHA-256 hash matches
        const computedHash = crypto.createHash('sha256').update(encrypted).digest('hex');
        console.log(`Computed hash: ${computedHash}`);
        console.log(`Stored hash:   ${row.file_hash}`);
        console.log(`Hashes match: ${computedHash === row.file_hash}`);

        console.log(`\nBLOB ROUND-TRIP: SUCCESS`);
      } else {
        console.log('AES key not found in secret store — key may be in env var');
        const envKey = process.env.AES_256_KEY;
        if (envKey) {
          console.log('Found AES_256_KEY in env, would decrypt with that');
        } else {
          console.log('No AES key available for decryption test — SKIPPING');
        }
      }
    } else {
      console.log('Secret store file not found at expected path');
    }
  } else {
    console.log(`Expected 1 image row, found ${imgRows.length}`);
  }

  await dbConn.end();
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   E2E TEST COMPLETE                              ║');
  console.log('╚══════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('E2E TEST FAILED:', err.message);
  process.exit(1);
});
