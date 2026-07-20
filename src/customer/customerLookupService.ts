import { getDatabaseConnections } from '../db';
import { QueryTypes } from 'sequelize';
import { verifyToken, UnlockSessionPayload } from '../auth/jwtService';

interface CustomerBasic {
  CustomerID: string;
  CustomerName: string;
}

export async function verifyUnlockSession(token: string): Promise<{ officer_id: string; nonce: string }> {
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

export async function lookupCustomer(customerId: string): Promise<CustomerBasic | null> {
  const { dataEntryDb } = getDatabaseConnections();
  const results = await dataEntryDb.query<CustomerBasic>(
    'SELECT CustomerID, CustomerName FROM customerinformation WHERE CustomerID = :customerId',
    {
      replacements: { customerId },
      type: QueryTypes.SELECT
    }
  );
  if (results.length === 0) return null;
  return { CustomerID: results[0].CustomerID, CustomerName: results[0].CustomerName };
}
