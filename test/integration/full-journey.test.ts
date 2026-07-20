import https from 'https';
import fs from 'fs';
import crypto from 'crypto';

const CA_CERT = fs.readFileSync('./config/ca-cert.pem');
const AGENT = new https.Agent({ ca: CA_CERT, rejectUnauthorized: true });

function request(method: string, urlPath: string, opts: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = opts.body ? JSON.stringify(opts.body) : undefined;
    const rawBody = opts.rawBody || undefined;
    const headers: Record<string, string> = { ...(opts.headers || {}) };
    if (body && !rawBody) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = String(Buffer.byteLength(body)); }
    if (rawBody) { headers['Content-Type'] = 'application/octet-stream'; headers['Content-Length'] = String(Buffer.byteLength(rawBody)); }
    const req = https.request({ hostname: '127.0.0.1', port: 8443, path: urlPath, method, headers, agent: AGENT, rejectUnauthorized: true }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    if (rawBody) req.write(rawBody);
    req.end();
  });
}

function createPng(): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 0;
  const compressed = require('zlib').deflateSync(Buffer.from([0, 255]));
  function chunk(type: string, data: Buffer): Buffer {
    const t = Buffer.from(type, 'ascii'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcData = Buffer.concat([t, data]);
    let crc = 0xffffffff; for (let i = 0; i < crcData.length; i++) { crc ^= crcData[i]; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, t, data, crcBuf]);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

async function loginOnce(username: string, password: string, fp: string): Promise<any> {
  const r = await request('POST', '/api/auth/login', { body: { username, password, deviceFingerprint: fp } });
  if (r.status === 200) return r.body;
  if (r.status === 202) {
    const { createClient } = require('redis');
    const rc = createClient({
      url: 'rediss://127.0.0.1:6380',
      socket: { tls: true, ca: CA_CERT, rejectUnauthorized: true },
    });
    await rc.connect();
    const otp = await rc.get(`otp:${username === 'admin' ? 'USR-001' : 'USR-002'}`);
    await rc.quit();
    const r2 = await request('POST', '/api/auth/otp/verify', { body: { otpToken: r.body.otpToken, otp } });
    if (r2.status !== 200) throw new Error('OTP verify failed');
    return r2.body;
  }
  throw new Error(`Login failed: ${JSON.stringify(r.body)}`);
}

// REQUIRED: Docker containers running + node dist/server.js on port 8443
// If server is not available, all tests will fail with a clear SKIP message.
// This is intentional — CI builds should hard-fail if the server isn't running.

describe('Full E2E Journey', () => {
  let adminToken: string;
  let officerToken: string;
  let unlockToken: string;

  beforeAll(async () => {
    for (let i = 0; i < 10; i++) {
      try {
        const r = await request('GET', '/api/health', {});
        if (r.status === 200) return;
      } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('SKIP: Server not reachable on port 8443.');
    throw new Error('SKIP — server not running');
  }, 15000);

  it('1. Admin login', async () => {
    const resp = await loginOnce('admin', 'test1234', 'jest-test-admin');
    adminToken = resp.accessToken;
    expect(adminToken).toBeDefined();
    expect(resp.role).toBe('1-Administrator');
  }, 15000);

  it('2. QR flow + validate + reuse rejection', async () => {
    const r = await request('POST', '/api/admin/qr/generate', { headers: { 'Authorization': `Bearer ${adminToken}` } });
    expect(r.status).toBe(200);
    expect(r.body.qrToken).toBeDefined();
    const qrToken = r.body.qrToken;

    const officer = await loginOnce('officer', 'test1234', 'jest-test-officer');
    officerToken = officer.accessToken;
    const rVal = await request('POST', '/api/officer/qr/validate', { headers: { 'Authorization': `Bearer ${officerToken}` }, body: { qrToken } });
    expect(rVal.status).toBe(200);
    unlockToken = rVal.body.unlockToken;

    const rReuse = await request('POST', '/api/officer/qr/validate', { headers: { 'Authorization': `Bearer ${officerToken}` }, body: { qrToken } });
    expect(rReuse.status).toBe(409);
    expect(rReuse.body.error).toBe('QR already used');
  }, 30000);

  it('3. Customer lookup found/not-found', async () => {
    const r1 = await request('GET', '/api/officer/customer/CUST-001', { headers: { 'X-Unlock-Token': unlockToken } });
    expect(r1.status).toBe(200);
    expect(r1.body.CustomerID).toBe('CUST-001');
    expect(r1.body.CustomerName).toBe('John Doe');

    const r2 = await request('GET', '/api/officer/customer/DOES-NOT-EXIST', { headers: { 'X-Unlock-Token': unlockToken } });
    expect(r2.status).toBe(404);
    expect(r2.body.error).toBe('Customer not found');
  }, 15000);

  it('4. Image upload + BLOB + audit', async () => {
    const rQr = await request('POST', '/api/admin/qr/generate', { headers: { 'Authorization': `Bearer ${adminToken}` } });
    expect(rQr.status).toBe(200);
    const rVal = await request('POST', '/api/officer/qr/validate', { headers: { 'Authorization': `Bearer ${officerToken}` }, body: { qrToken: rQr.body.qrToken } });
    expect(rVal.status).toBe(200);
    const capUnlock = rVal.body.unlockToken;

    const png = createPng();
    const rUp = await request('POST', '/api/officer/customer/CUST-001/image', {
      headers: { 'X-Unlock-Token': capUnlock, 'X-Image-Type': 'profile_picture', 'X-Device-Fingerprint': 'jest-test-device' },
      rawBody: png,
    });
    expect(rUp.status).toBe(201);
    const imageId = rUp.body.imageId;

    const mysql2 = require('mysql2/promise');
    const conn = await mysql2.createConnection({
      host: '127.0.0.1', user: 'root', password: 'kDTKUMRiN_jSM44aOHVkySL8rqJEbDbH', database: 'holcemlk_banker_images',
      ssl: { ca: CA_CERT, rejectUnauthorized: false },
    });
    const [rows] = await conn.query('SELECT image_data, file_hash FROM customer_images WHERE image_id = ?', [imageId]);
    expect(rows.length).toBe(1);
    const encrypted = rows[0].image_data as Buffer;
    expect(encrypted.length).toBeGreaterThan(0);
    const computedHash = crypto.createHash('sha256').update(encrypted).digest('hex');
    expect(computedHash).toBe(rows[0].file_hash);

    const secretsPath = require('os').homedir() + '/holcemlk_secure/secrets.json';
    const altPath = process.env.APPDATA + '/holcemlk_secure/secrets.json';
    const sp = fs.existsSync(secretsPath) ? secretsPath : (fs.existsSync(altPath) ? altPath : null);
    if (sp) {
      const secrets = JSON.parse(fs.readFileSync(sp, 'utf8'));
      expect(secrets['aes-256-key']).toBeDefined();
      const key = Buffer.from(secrets['aes-256-key'], 'hex');
      const iv = encrypted.subarray(0, 12); const authTag = encrypted.subarray(12, 28); const ct = encrypted.subarray(28);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
      expect(decrypted[0]).toBe(137);
    }

    const [auditRows] = await conn.query("SELECT event_type, user_id, detail FROM audit_log ORDER BY log_id");
    const et = auditRows.map((r: any) => r.event_type);
    expect(et).toContain('IMAGE_CAPTURED');
    const ce = auditRows.find((r: any) => r.event_type === 'IMAGE_CAPTURED');
    expect(ce.user_id).toBe('USR-002');
    const det = typeof ce.detail === 'string' ? JSON.parse(ce.detail) : ce.detail;
    expect(det.officer_id).toBe('USR-002');
    expect(det.officer_id).not.toBe('undefined');

    await conn.end();
  }, 30000);
});