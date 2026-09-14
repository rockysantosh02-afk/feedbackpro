import { AuditService } from '../services/AuditService.js';
import { AuditRepository } from '../repositories/AuditRepository.js';

export class AuditWorker {
  private isRunning: boolean = false;
  private workerId: string;
  private pollIntervalMs: number;

  constructor(workerId?: string, pollIntervalMs: number = 3000) {
    this.workerId = workerId || `worker-${Math.random().toString(36).substring(2, 8)}`;
    this.pollIntervalMs = pollIntervalMs;
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    console.log(`[AuditWorker] ${this.workerId} started in isolated worker mode.`);

    while (this.isRunning) {
      try {
        const job = await AuditRepository.leaseNextJob(this.workerId);
        if (job) {
          console.log(`[AuditWorker] Processing job ${job.id} for target: ${job.targetUrl}`);
          await AuditService.executeAuditPipeline(job.id);
          console.log(`[AuditWorker] Completed job ${job.id}`);
        } else {
          // No jobs currently pending, idle wait
          await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
        }
      } catch (err: any) {
        console.error(`[AuditWorker] Error processing job:`, err.message);
        await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      }
    }
  }

  public stop(): void {
    console.log(`[AuditWorker] ${this.workerId} shutting down...`);
    this.isRunning = false;
  }
}
