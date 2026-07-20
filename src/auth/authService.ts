import bcrypt from 'bcrypt';

export class AuthService {
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

export const authService = new AuthService();
