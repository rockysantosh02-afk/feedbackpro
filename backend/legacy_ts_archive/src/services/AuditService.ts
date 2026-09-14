import { BugDetectionAgent, RawFinding } from '../agents/BugDetectionAgent.js';
import { SecurityPostureAgent } from '../agents/SecurityPostureAgent.js';
import { UXAccessibilityAgent } from '../agents/UXAccessibilityAgent.js';
import { InspectionResult, WebsiteInspectionAgent } from '../agents/WebsiteInspectionAgent.js';
import { DbAuditFinding, DbAuditJob, DbAuditRun } from '../models/db.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { URLSafetyService } from '../security/URLSafetyService.js';

export interface AuditExecutionResult {
  job: DbAuditJob;
  run: DbAuditRun;
  findings: DbAuditFinding[];
}

export class AuditService {
  /**
   * Triggers an asynchronous audit job with pre-flight SSRF validation and authorization verification.
   */
  public static async enqueueAudit(projectId: string, userId: string, targetUrl: string): Promise<DbAuditJob> {
    const project = await ProjectRepository.findByIdAndOwner(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    if (!project.authorizedAt) {
      throw new Error('Owner authorization confirmation is mandatory before testing any website.');
    }

    // Pre-flight SSRF & protocol validation
    const safetyCheck = await URLSafetyService.validateUrl(targetUrl);
    if (!safetyCheck.isSafe) {
      throw new Error(`SSRF Prevention: ${safetyCheck.errorMessage || 'Invalid or forbidden target URL'}`);
    }

    const job = await AuditRepository.createJob(projectId, targetUrl);

    // Trigger execution asynchronously in background worker or inline executor
    setImmediate(() => {
      this.executeAuditPipeline(job.id).catch((err) => {
        console.error(`Audit pipeline failed for job ${job.id}:`, err);
      });
    });

    return job;
  }

  /**
   * Executes the full audit pipeline with explicit stage updates.
   */
  public static async executeAuditPipeline(jobId: string): Promise<AuditExecutionResult> {
    const job = await AuditRepository.leaseNextJob('worker-main');
    if (!job && jobId) {
      // Direct lookup if already leased
    }

    const currentJob = job || (await AuditRepository.leaseNextJob('worker-fallback'));
    if (!currentJob) {
      throw new Error(`Could not lease job ${jobId}`);
    }

    try {
      // Stage 1: Validating URL
      await AuditRepository.updateJobStage(currentJob.id, 'validating_url');
      const safety = await URLSafetyService.validateUrl(currentJob.targetUrl);
      if (!safety.isSafe) {
        throw new Error(`SSRF check failed: ${safety.errorMessage}`);
      }

      // Stage 2 & 3: Inspecting website & checking pages
      await AuditRepository.updateJobStage(currentJob.id, 'inspecting_website');
      const inspection: InspectionResult = await WebsiteInspectionAgent.inspect(currentJob.targetUrl);

      await AuditRepository.updateJobStage(currentJob.id, 'analyzing_resources');

      // Stage 4: Bug detection
      await AuditRepository.updateJobStage(currentJob.id, 'checking_accessibility');
      const functionalFindings = await BugDetectionAgent.analyze(inspection);

      // Stage 5: Security posture
      await AuditRepository.updateJobStage(currentJob.id, 'checking_security_posture');
      const securityFindings = SecurityPostureAgent.analyze(inspection);

      // Stage 6: UX & Accessibility
      await AuditRepository.updateJobStage(currentJob.id, 'analyzing_ux');
      const uxFindings = UXAccessibilityAgent.analyze(inspection);

      // Consolidate findings
      const allRawFindings: RawFinding[] = [
        ...functionalFindings,
        ...securityFindings,
        ...uxFindings
      ];

      // Stage 7: Generating scores & report
      await AuditRepository.updateJobStage(currentJob.id, 'generating_report');

      const scores = this.calculateScores(allRawFindings, inspection);

      const run = await AuditRepository.createRun({
        projectId: currentJob.projectId,
        jobId: currentJob.id,
        status: 'completed',
        stage: 'completed',
        targetUrl: currentJob.targetUrl,
        overallScore: scores.overall,
        technicalScore: scores.technical,
        securityScore: scores.security,
        uxScore: scores.ux,
        a11yScore: scores.accessibility,
        perfScore: scores.performance,
        summary: `Passive audit completed for ${currentJob.targetUrl}. Found ${allRawFindings.length} issue(s) across security, UX, accessibility, and functional checks.`,
        disclaimer: 'This automated audit performs limited, non-destructive checks. It is not a substitute for a professional penetration test or comprehensive security assessment.',
        startedAt: currentJob.startedAt || new Date(),
        completedAt: new Date()
      });

      const savedFindings: DbAuditFinding[] = [];
      for (const raw of allRawFindings) {
        const sf = await AuditRepository.addFinding({
          auditRunId: run.id,
          projectId: currentJob.projectId,
          title: raw.title,
          category: raw.category,
          severity: raw.severity,
          confidence: raw.confidence,
          verified: raw.verified,
          description: raw.description,
          evidence: raw.evidence,
          affectedUrl: raw.affectedUrl,
          recommendedFix: raw.recommendedFix,
          source: raw.source
        });
        savedFindings.push(sf);
      }

      await AuditRepository.completeJob(currentJob.id);

      return { job: currentJob, run, findings: savedFindings };
    } catch (err: any) {
      await AuditRepository.failJob(currentJob.id, err.message || 'Audit failed');
      throw err;
    }
  }

  /**
   * Transparent Scoring Methodology (Section 16).
   * Generates separate scores: Technical, Security, UX, Accessibility, Performance.
   * Then calculates Overall Health with strict penalties for critical defects.
   */
  public static calculateScores(findings: RawFinding[], inspection: InspectionResult): {
    technical: number;
    security: number;
    ux: number;
    accessibility: number;
    performance: number;
    overall: number;
  } {
    let technical = 95;
    let security = 95;
    let ux = 95;
    let accessibility = 95;
    let performance = 95;

    // Deduct based on severity
    const deduct = (sev: string) => (sev === 'critical' ? 30 : sev === 'high' ? 18 : sev === 'medium' ? 8 : 3);

    for (const f of findings) {
      const penalty = deduct(f.severity);
      if (f.category === 'Security posture') security = Math.max(10, security - penalty);
      else if (f.category === 'Accessibility') accessibility = Math.max(10, accessibility - penalty);
      else if (f.category === 'UX' || f.category === 'UI') ux = Math.max(10, ux - penalty);
      else if (f.category === 'Performance') performance = Math.max(10, performance - penalty);
      else technical = Math.max(10, technical - penalty);
    }

    // Performance latency factor
    if (inspection.responseTimeMs > 2000) {
      performance = Math.max(20, performance - Math.min(30, Math.floor(inspection.responseTimeMs / 300)));
    }

    // Composite weighted score with critical cap
    const baseOverall = Math.round(
      technical * 0.25 +
      security * 0.25 +
      ux * 0.2 +
      accessibility * 0.15 +
      performance * 0.15
    );

    // If any critical severity finding exists, overall score cannot exceed 60
    const hasCritical = findings.some((f) => f.severity === 'critical');
    const overall = hasCritical ? Math.min(60, baseOverall) : baseOverall;

    return { technical, security, ux, accessibility, performance, overall };
  }

  public static async getProjectFindings(projectId: string, userId: string): Promise<DbAuditFinding[]> {
    const project = await ProjectRepository.findByIdAndOwner(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }
    return await AuditRepository.getFindingsByProject(projectId);
  }

  public static async getLatestRun(projectId: string, userId: string): Promise<DbAuditRun | null> {
    const project = await ProjectRepository.findByIdAndOwner(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }
    return await AuditRepository.getLatestRunByProject(projectId);
  }
}
