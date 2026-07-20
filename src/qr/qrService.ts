import jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { redisConnection } from "../redis";
import { retrieveSecret, storeSecret } from "../services/secretStore";
import { getJwtSecret, UnlockSessionPayload } from "../auth/jwtService";

const QR_TOKEN_EXPIRY_SECONDS = 900;
const UNLOCK_SESSION_EXPIRY_SECONDS = 600;
const MAX_UPLOADS_PER_SESSION = 5;

const QR_JWT_SECRET_KEY = "qr-jwt-secret";

async function getQrJwtSecret(): Promise<string> {
  const existing = await retrieveSecret(QR_JWT_SECRET_KEY);
  if (existing) return existing;
  const newSecret = crypto.randomBytes(64).toString("hex");
  await storeSecret(QR_JWT_SECRET_KEY, newSecret);
  return newSecret;
}

interface QrTokenPayload {
  nonce: string;
  admin_id: string;
  iat: number;
  exp?: number;
}

export async function consumeUploadSlot(nonce: string): Promise<boolean> {
  const luaScript = `
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
  `;

  const result = await redisConnection.eval(
    luaScript,
    [`unlock:${nonce}`],
    [String(MAX_UPLOADS_PER_SESSION), String(UNLOCK_SESSION_EXPIRY_SECONDS)]
  );

  if (!result) return false;
  const [success] = result as [number, number | string];
  if (success === -1) return false;
  if (success === 1) return true;
  return false;
}

export async function generateQrSession(adminId: string): Promise<string> {
  const nonce = crypto.randomUUID();
  const secret = await getQrJwtSecret();
  const now = Math.floor(Date.now() / 1000);

  const payload: QrTokenPayload = {
    nonce,
    admin_id: adminId,
    iat: now,
  };

  const qrToken = jwt.sign(payload, secret, {
    expiresIn: QR_TOKEN_EXPIRY_SECONDS,
  });

  const redisValue = JSON.stringify({
    status: "pending",
    admin_id: adminId,
    created_at: new Date().toISOString(),
  });
  await redisConnection.set(`qr:${nonce}`, redisValue, {
    EX: QR_TOKEN_EXPIRY_SECONDS,
  });

  return qrToken;
}

export async function validateQrToken(
  qrToken: string,
  officerId: string,
): Promise<{ unlockToken: string; nonce: string }> {
  const secret = await getQrJwtSecret();

  let payload: QrTokenPayload;
  try {
    payload = jwt.verify(qrToken, secret) as QrTokenPayload;
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      throw { status: 410, message: "QR expired, request a new one" };
    }
    throw { status: 401, message: "Invalid QR token" };
  }

  // Atomic consume: Lua script runs GET + conditional SET as one Redis operation
  const luaScript = `
    local data = redis.call('GET', KEYS[1])
    if not data then
      return nil
    end
    local decoded = cjson.decode(data)
    if decoded.status ~= 'pending' then
      return nil
    end
    decoded.status = 'consumed'
    decoded.consumed_by = ARGV[1]
    decoded.consumed_at = ARGV[2]
    redis.call('SET', KEYS[1], cjson.encode(decoded), 'EX', ARGV[3])
    return 'consumed'
  `;

  const result = await redisConnection.eval(
    luaScript,
    [`qr:${payload.nonce}`],
    [officerId, new Date().toISOString(), String(QR_TOKEN_EXPIRY_SECONDS)],
  );

  if (result !== "consumed") {
    const stored = await redisConnection.get(`qr:${payload.nonce}`);
    if (!stored) {
      throw { status: 410, message: "QR expired, request a new one" };
    }
    throw { status: 409, message: "QR already used" };
  }

  const now = Math.floor(Date.now() / 1000);
  const unlockPayload: UnlockSessionPayload = {
    type: "unlock_session",
    officer_id: officerId,
    admin_id: payload.admin_id,
    nonce: payload.nonce,
    iat: now,
  };

  // Create the unlock session tracking key in Redis (for upload cap enforcement)
  const unlockRedisValue = JSON.stringify({
    status: "active",
    officer_id: officerId,
    admin_id: payload.admin_id,
    created_at: new Date().toISOString(),
    uploads_used: 0,
  });
  await redisConnection.set(`unlock:${payload.nonce}`, unlockRedisValue, {
    EX: UNLOCK_SESSION_EXPIRY_SECONDS,
  });

  const jwtSecret = await getJwtSecret();
  const unlockToken = jwt.sign(unlockPayload, jwtSecret, {
    expiresIn: UNLOCK_SESSION_EXPIRY_SECONDS,
  });

  return { unlockToken, nonce: payload.nonce };
}
