import {
  DbAiAnalysis,
  DbAuditLog,
  DbRecommendation,
  memoryDb
} from '../models/db.js';

export class AnalyticsRepository {
  public static async saveAnalysis(data: Omit<DbAiAnalysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbAiAnalysis> {
    // Delete previous analysis for project if exists
    for (const [aId, a] of memoryDb.aiAnalyses.entries()) {
      if (a.projectId === data.projectId) {
        memoryDb.aiAnalyses.delete(aId);
      }
    }

    const analysis: DbAiAnalysis = {
      ...data,
      id: memoryDb.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryDb.aiAnalyses.set(analysis.id, analysis);
    return analysis;
  }

  public static async getLatestAnalysis(projectId: string): Promise<DbAiAnalysis | null> {
    const list = Array.from(memoryDb.aiAnalyses.values())
      .filter((a) => a.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list.length > 0 ? list[0] : null;
  }

  // Recommendations
  public static async saveRecommendations(
    projectId: string,
    items: Array<Omit<DbRecommendation, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<DbRecommendation[]> {
    // Clear previous recommendations for project
    for (const [rId, r] of memoryDb.recommendations.entries()) {
      if (r.projectId === projectId) {
        memoryDb.recommendations.delete(rId);
      }
    }

    const saved: DbRecommendation[] = [];
    for (const item of items) {
      const rec: DbRecommendation = {
        ...item,
        id: memoryDb.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryDb.recommendations.set(rec.id, rec);
      saved.push(rec);
    }
    return saved.sort((a, b) => a.priority.localeCompare(b.priority));
  }

  public static async getRecommendations(projectId: string): Promise<DbRecommendation[]> {
    return Array.from(memoryDb.recommendations.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => a.priority.localeCompare(b.priority));
  }

  // Security Audit Logging (Append-only)
  public static async logEvent(
    eventType: string,
    options: { userId?: string; projectId?: string; details?: any; ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const log: DbAuditLog = {
      id: memoryDb.generateId(),
      userId: options.userId,
      projectId: options.projectId,
      eventType,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      createdAt: new Date()
    };
    memoryDb.auditLogs.push(log);
  }

  public static async getLogs(limit: number = 100): Promise<DbAuditLog[]> {
    return [...memoryDb.auditLogs].reverse().slice(0, limit);
  }
}
