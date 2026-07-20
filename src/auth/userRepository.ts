import { getDatabaseConnections } from '../db';
import { QueryTypes } from 'sequelize';

export interface SystemUser {
  UserName: string;
  UserID: string;
  MobilePassword: string | null;
  web_password: string | null;
  role: string;
  mobile_no: string | null;
  mobile_otp: string | null;
  LogStatus: string | null;
}

export async function findUserByUsername(username: string): Promise<SystemUser | null> {
  const { dataEntryDb } = getDatabaseConnections();
  const users = await dataEntryDb.query<SystemUser>(
    'SELECT UserName, UserID, MobilePassword, web_password, role, mobile_no, mobile_otp, LogStatus FROM systemusers WHERE UserName = :username',
    {
      replacements: { username },
      type: QueryTypes.SELECT
    }
  );
  return users.length > 0 ? users[0] : null;
}
