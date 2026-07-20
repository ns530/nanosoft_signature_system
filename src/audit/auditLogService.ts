import { getDatabaseConnections } from '../db';
import { QueryTypes } from 'sequelize';

export type AuditEventType =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'QR_GENERATED'
  | 'QR_VALIDATED'
  | 'IMAGE_CAPTURED'
  | 'IMAGE_REPLACED';

export async function logEvent(
  eventType: AuditEventType,
  userId: string,
  ipAddress: string,
  deviceFingerprint: string | null,
  detail: Record<string, unknown> | null
): Promise<void> {
  const { imagesDb } = getDatabaseConnections();

  await imagesDb.query(
    `INSERT INTO audit_log (event_type, user_id, ip_address, device_fingerprint, event_time, detail)
     VALUES (:event_type, :user_id, :ip_address, :device_fingerprint, NOW(), :detail)`,
    {
      replacements: {
        event_type: eventType,
        user_id: userId,
        ip_address: ipAddress,
        device_fingerprint: deviceFingerprint || '',
        detail: detail ? JSON.stringify(detail) : '{}'
      },
      type: QueryTypes.INSERT
    }
  );
}
