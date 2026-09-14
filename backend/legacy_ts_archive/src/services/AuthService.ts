import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DbUser } from '../models/db.js';
import { UserRepository } from '../repositories/UserRepository.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'feedbackpro_dev_secret_key_32_chars_min';
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';

  public static async register(email: string, password: string, name: string): Promise<AuthTokens> {
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await UserRepository.create(email, passwordHash, name);
    return await this.generateTokenPair(user);
  }

  public static async login(email: string, password: string): Promise<AuthTokens> {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    return await this.generateTokenPair(user);
  }

  /**
   * Refresh Token Rotation with Reuse / Replay Detection.
   */
  public static async refreshAccessToken(oldRefreshToken: string): Promise<AuthTokens> {
    const record = await UserRepository.findRefreshToken(oldRefreshToken);
    if (!record) {
      throw new Error('Invalid refresh token');
    }

    // Reuse detection: If token was already revoked, someone may have compromised the family!
    if (record.revokedAt) {
      await UserRepository.revokeAllUserTokens(record.userId);
      throw new Error('Compromised refresh token detected. All sessions revoked for security.');
    }

    if (new Date() > record.expiresAt) {
      throw new Error('Refresh token has expired. Please log in again.');
    }

    const user = await UserRepository.findById(record.userId);
    if (!user) {
      throw new Error('User account not found');
    }

    // Issue new pair & rotate
    const newTokens = await this.generateTokenPair(user);
    await UserRepository.rotateRefreshToken(oldRefreshToken, newTokens.refreshToken);

    return newTokens;
  }

  public static async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const record = await UserRepository.findRefreshToken(refreshToken);
      if (record) {
        await UserRepository.rotateRefreshToken(refreshToken, 'revoked_on_logout');
      }
    }
  }

  public static verifyAccessToken(token: string): { userId: string; role: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string; role: string };
      return decoded;
    } catch {
      throw new Error('Invalid or expired authentication token');
    }
  }

  private static async generateTokenPair(user: DbUser): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = `${user.id}.${Date.now()}.${Math.random().toString(36).substring(2, 15)}`;
    await UserRepository.storeRefreshToken(user.id, refreshToken, 7);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }
}
