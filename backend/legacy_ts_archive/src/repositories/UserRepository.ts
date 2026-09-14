import crypto from 'node:crypto';
import { DbRefreshToken, DbUser, memoryDb } from '../models/db.js';

export class UserRepository {
  public static async create(email: string, passwordHash: string, name: string): Promise<DbUser> {
    const user: DbUser = {
      id: memoryDb.generateId(),
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      role: 'user',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryDb.users.set(user.id, user);
    return user;
  }

  public static async findByEmail(email: string): Promise<DbUser | null> {
    const normalized = email.toLowerCase().trim();
    for (const user of memoryDb.users.values()) {
      if (user.email === normalized) {
        return user;
      }
    }
    return null;
  }

  public static async findById(id: string): Promise<DbUser | null> {
    return memoryDb.users.get(id) || null;
  }

  // Refresh Token Management
  public static async storeRefreshToken(userId: string, token: string, expiresInDays: number = 7): Promise<DbRefreshToken> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const record: DbRefreshToken = {
      id: memoryDb.generateId(),
      tokenHash,
      userId,
      expiresAt,
      createdAt: new Date()
    };

    memoryDb.refreshTokens.set(tokenHash, record);
    return record;
  }

  public static async findRefreshToken(token: string): Promise<DbRefreshToken | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = memoryDb.refreshTokens.get(tokenHash);
    if (!record) return null;
    return record;
  }

  /**
   * Revokes a token and tracks replacement for rotation & reuse detection.
   */
  public static async rotateRefreshToken(oldToken: string, newToken: string): Promise<void> {
    const oldHash = crypto.createHash('sha256').update(oldToken).digest('hex');
    const newHash = crypto.createHash('sha256').update(newToken).digest('hex');
    const existing = memoryDb.refreshTokens.get(oldHash);
    if (existing) {
      existing.revokedAt = new Date();
      existing.replacedByToken = newHash;
      memoryDb.refreshTokens.set(oldHash, existing);
    }
  }

  /**
   * Revokes all refresh tokens for a user (e.g. on reuse detection breach or explicit logout all).
   */
  public static async revokeAllUserTokens(userId: string): Promise<void> {
    for (const [hash, record] of memoryDb.refreshTokens.entries()) {
      if (record.userId === userId) {
        record.revokedAt = new Date();
        memoryDb.refreshTokens.set(hash, record);
      }
    }
  }
}
