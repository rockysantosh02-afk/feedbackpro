import {
  DbAuditFinding,
  DbAuditJob,
  DbAuditRun,
  memoryDb
} from '../models/db.js';

export class AuditRepository {
  // Job Queue Management
  public static async createJob(projectId: string, targetUrl: string): Promise<DbAuditJob> {
    const job: DbAuditJob = {
      id: memoryDb.generateId(),
      projectId,
      targetUrl,
      status: 'pending',
      stage: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryDb.auditJobs.set(job.id, job);
    return job;
  }

  public static async leaseNextJob(workerId: string): Promise<DbAuditJob | null> {
    for (const job of memoryDb.auditJobs.values()) {
      if (job.status === 'pending' && job.attempts < job.maxAttempts) {
        job.status = 'processing';
        job.workerId = workerId;
        job.lockedAt = new Date();
        job.startedAt = new Date();
        job.attempts += 1;
        job.updatedAt = new Date();
        memoryDb.auditJobs.set(job.id, job);
        return job;
      }
    }
    return null;
  }

  public static async updateJobStage(jobId: string, stage: string): Promise<void> {
    const job = memoryDb.auditJobs.get(jobId);
    if (job) {
      job.stage = stage;
      job.updatedAt = new Date();
      memoryDb.auditJobs.set(jobId, job);
    }
  }

  public static async completeJob(jobId: string): Promise<void> {
    const job = memoryDb.auditJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.completedAt = new Date();
      job.updatedAt = new Date();
      memoryDb.auditJobs.set(jobId, job);
    }
  }

  public static async failJob(jobId: string, errorMessage: string): Promise<void> {
    const job = memoryDb.auditJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.errorMessage = errorMessage;
      job.completedAt = new Date();
      job.updatedAt = new Date();
      memoryDb.auditJobs.set(jobId, job);
    }
  }

  // Audit Runs
  public static async createRun(data: Omit<DbAuditRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbAuditRun> {
    const run: DbAuditRun = {
      ...data,
      id: memoryDb.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryDb.auditRuns.set(run.id, run);
    return run;
  }

  public static async updateRun(id: string, updates: Partial<DbAuditRun>): Promise<DbAuditRun | null> {
    const run = memoryDb.auditRuns.get(id);
    if (!run) return null;

    const updated: DbAuditRun = {
      ...run,
      ...updates,
      updatedAt: new Date()
    };
    memoryDb.auditRuns.set(id, updated);
    return updated;
  }

  public static async getLatestRunByProject(projectId: string): Promise<DbAuditRun | null> {
    const runs = Array.from(memoryDb.auditRuns.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return runs.length > 0 ? runs[0] : null;
  }

  public static async getRunById(id: string): Promise<DbAuditRun | null> {
    return memoryDb.auditRuns.get(id) || null;
  }

  // Findings
  public static async addFinding(data: Omit<DbAuditFinding, 'id' | 'createdAt' | 'updatedAt' | 'isResolved'>): Promise<DbAuditFinding> {
    const finding: DbAuditFinding = {
      ...data,
      id: memoryDb.generateId(),
      isResolved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryDb.auditFindings.set(finding.id, finding);
    return finding;
  }

  public static async getFindingsByRun(auditRunId: string): Promise<DbAuditFinding[]> {
    return Array.from(memoryDb.auditFindings.values())
      .filter((f) => f.auditRunId === auditRunId)
      .sort((a, b) => {
        const severityWeight: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
        return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      });
  }

  public static async getFindingsByProject(projectId: string): Promise<DbAuditFinding[]> {
    return Array.from(memoryDb.auditFindings.values())
      .filter((f) => f.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public static async getFindingById(id: string): Promise<DbAuditFinding | null> {
    return memoryDb.auditFindings.get(id) || null;
  }
}
