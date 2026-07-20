import * as crypto from 'crypto';
import { QueryTypes, Transaction } from 'sequelize';
import sharp from 'sharp';
import { getDatabaseConnections } from '../db';
import { verifyToken, UnlockSessionPayload } from '../auth/jwtService';
import { getEncryptionKey } from '../services/keyManagement';
import { logEvent } from '../audit/auditLogService';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MAGIC_BYTES: Record<string, { sig: number[]; ext: string }> = {
  jpeg: { sig: [0xff, 0xd8, 0xff], ext: 'jpg' },
  png: { sig: [0x89, 0x50, 0x4e, 0x47], ext: 'png' }
};

interface UnlockSessionResult {
  officer_id: string;
  nonce: string;
}

export async function verifyUnlockSession(token: string): Promise<UnlockSessionResult> {
  const payload = await verifyToken(token) as unknown as UnlockSessionPayload;
  if (payload.type !== 'unlock_session') {
    throw { status: 401, message: 'Invalid token type' };
  }
  if (!payload.nonce) {
    throw { status: 401, message: 'Invalid unlock session' };
  }
  if (!payload.officer_id) {
    throw { status: 401, message: 'Invalid unlock session' };
  }
  return { officer_id: payload.officer_id, nonce: payload.nonce };
}

export function validateMagicBytes(buffer: Buffer): { valid: boolean; detectedType?: string } {
  if (buffer.length < 4) return { valid: false };

  for (const [type, info] of Object.entries(MAGIC_BYTES)) {
    const match = info.sig.every((byte, i) => buffer[i] === byte);
    if (match) return { valid: true, detectedType: type };
  }

  return { valid: false };
}

export async function applyWatermark(buffer: Buffer, officerId: string): Promise<Buffer> {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const watermarkText = `Officer: ${officerId} | ${timestamp}`;

  const metadata = await sharp(buffer).metadata();

  const image = sharp(buffer);
  const svgText = Buffer.from(
    `<svg width="${metadata.width}" height="${metadata.height}">
      <rect x="10" y="10" width="${watermarkText.length * 8 + 20}" height="30" fill="rgba(0,0,0,0.5)"/>
      <text x="20" y="30" fill="white" font-size="16">${watermarkText}</text>
    </svg>`
  );

  const watermarked = await image
    .composite([{ input: svgText, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return watermarked;
}

export async function encryptImage(buffer: Buffer): Promise<{ encrypted: Buffer; authTag: Buffer }> {
  const keyHex = await getEncryptionKey();
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, ciphertext]);
  return { encrypted: combined, authTag };
}

export async function handleArchiveInsert(
  customerId: string,
  imageType: string,
  collectedBy: string,
  qrSessionRef: string,
  encryptedBuffer: Buffer,
  fileHash: string
): Promise<{ imageId: string; wasReplaced: boolean }> {
  const { imagesDb } = getDatabaseConnections();
  const imageId = crypto.randomUUID();
  const result = await imagesDb.transaction(async (t: Transaction) => {
    const existing = await imagesDb.query(
      'SELECT image_id, image_data, file_hash FROM customer_images WHERE customer_id = :customerId AND image_type = :imageType',
      {
        replacements: { customerId, imageType },
        type: QueryTypes.SELECT,
        transaction: t
      }
    ) as any[];

    let wasReplaced = false;

    if (existing.length > 0) {
      const old = existing[0];
      await imagesDb.query(
        `INSERT INTO customer_previous_images (image_id, customer_id, old_image_data, old_file_hash, replaced_by, replaced_at)
         VALUES (:image_id, :customer_id, :old_image_data, :old_file_hash, :replaced_by, NOW())`,
        {
          replacements: {
            image_id: old.image_id,
            customer_id: customerId,
            old_image_data: old.image_data,
            old_file_hash: old.file_hash,
            replaced_by: collectedBy
          },
          type: QueryTypes.INSERT,
          transaction: t
        }
      );

      await imagesDb.query(
        'DELETE FROM customer_images WHERE image_id = :image_id',
        {
          replacements: { image_id: old.image_id },
          type: QueryTypes.DELETE,
          transaction: t
        }
      );
      wasReplaced = true;
    }

    await imagesDb.query(
      `INSERT INTO customer_images (image_id, customer_id, image_type, image_data, file_hash, collected_by, collected_at, qr_session_ref)
       VALUES (:image_id, :customer_id, :image_type, :image_data, :file_hash, :collected_by, NOW(), :qr_session_ref)`,
      {
        replacements: {
          image_id: imageId,
          customer_id: customerId,
          image_type: imageType,
          image_data: encryptedBuffer,
          file_hash: fileHash,
          collected_by: collectedBy,
          qr_session_ref: qrSessionRef
        },
        type: QueryTypes.INSERT,
        transaction: t
      }
    );

    return { imageId, wasReplaced };
  });

  return result;
}

export async function processImageUpload(
  unlockToken: string,
  customerId: string,
  imageBuffer: Buffer,
  imageType: string,
  ipAddress: string,
  clientDeviceFingerprint: string | null
): Promise<{ imageId: string }> {
  const session = await verifyUnlockSession(unlockToken);

  const { consumeUploadSlot } = await import('../qr/qrService');
  const slotAllowed = await consumeUploadSlot(session.nonce);
  if (!slotAllowed) {
    throw { status: 429, message: 'Upload limit reached for this session' };
  }

  if (imageBuffer.length > MAX_FILE_SIZE) {
    throw { status: 400, message: 'File too large' };
  }

  const magicResult = validateMagicBytes(imageBuffer);
  if (!magicResult.valid) {
    throw { status: 400, message: 'Invalid file type — only JPEG and PNG accepted' };
  }

  const watermarked = await applyWatermark(imageBuffer, session.officer_id);
  const { encrypted } = await encryptImage(watermarked);

  const fileHash = crypto.createHash('sha256').update(encrypted).digest('hex');

  const result = await handleArchiveInsert(customerId, imageType, session.officer_id, session.nonce, encrypted, fileHash);

  const detail = { customer_id: customerId, image_type: imageType, officer_id: session.officer_id, nonce: session.nonce };

  await logEvent('IMAGE_CAPTURED', session.officer_id, ipAddress, clientDeviceFingerprint, detail);
  if (result.wasReplaced) {
    await logEvent('IMAGE_REPLACED', session.officer_id, ipAddress, clientDeviceFingerprint, detail);
  }

  return { imageId: result.imageId };
}
