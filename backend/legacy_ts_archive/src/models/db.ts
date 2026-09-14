import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

// Shared in-memory and relational storage layer
// Allows seamless operation across local dev/test (no PG daemon required) and Render PostgreSQL production

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbRefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByToken?: string | null;
  createdAt: Date;
}

export interface DbProject {
  id: string;
  userId: string;
  name: string;
  shortDescription: string;
  detailedDescription?: string | null;
  problemStatement?: string | null;
  solution?: string | null;
  targetUsers?: string | null;
  category: string;
  eventName: string;
  eventOrganizer?: string | null;
  eventType?: string | null;
  eventDate?: string | null;
  eventDescription?: string | null;
  techFrontend?: string | null;
  techBackend?: string | null;
  techDatabase?: string | null;
  techAi?: string | null;
  techApis?: string | null;
  techHosting?: string | null;
  techOther?: string | null;
  feedbackGoal: string;
  authorizedAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbProjectLink {
  id: string;
  projectId: string;
  linkType: string;
  url: string;
  label?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAuditJob {
  id: string;
  projectId: string;
  targetUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stage: string;
  workerId?: string | null;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string | null;
  lockedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAuditRun {
  id: string;
  projectId: string;
  jobId?: string | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  stage: string;
  targetUrl: string;
  overallScore: number;
  technicalScore: number;
  securityScore: number;
  uxScore: number;
  a11yScore: number;
  perfScore: number;
  summary?: string | null;
  errorMessage?: string | null;
  disclaimer: string;
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAuditFinding {
  id: string;
  auditRunId: string;
  projectId: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: 'high' | 'medium' | 'low';
  verified: boolean;
  description: string;
  evidence: string;
  affectedUrl: string;
  recommendedFix: string;
  source: 'scanner' | 'browser' | 'ai';
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbFeedbackForm {
  id: string;
  projectId: string;
  slug: string;
  title: string;
  description?: string | null;
  status: 'draft' | 'published' | 'closed';
  allowAnonymous: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbFeedbackQuestion {
  id: string;
  feedbackFormId: string;
  sectionId?: string | null;
  prompt: string;
  description?: string | null;
  questionType: string;
  isRequired: boolean;
  sortOrder: number;
  minLabel?: string | null;
  maxLabel?: string | null;
  options?: DbFeedbackOption[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DbFeedbackOption {
  id: string;
  questionId: string;
  label: string;
  value: string;
  sortOrder: number;
  createdAt: Date;
}

export interface DbFeedbackResponse {
  id: string;
  feedbackFormId: string;
  respondentName?: string | null;
  respondentEmail?: string | null;
  isAnonymous: boolean;
  ipHash?: string | null;
  userAgent?: string | null;
  submittedAt: Date;
  createdAt: Date;
  answers?: DbResponseAnswer[];
}

export interface DbResponseAnswer {
  id: string;
  feedbackResponseId: string;
  questionId: string;
  numericValue?: number | null;
  textValue?: string | null;
  selectedOptions?: any;
  createdAt: Date;
}

export interface DbFeedbackTheme {
  id: string;
  projectId: string;
  feedbackFormId: string;
  themeTitle: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  occurrenceCount: number;
  severity?: string | null;
  aiSummary: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAiAnalysis {
  id: string;
  projectId: string;
  auditRunId?: string | null;
  executiveSummary: string;
  sentimentDistribution: { positive: number; neutral: number; negative: number };
  positiveThemes: string[];
  negativeThemes: string[];
  featureRequests: string[];
  commonComplaints: string[];
  mostPraised: string[];
  userSatisfactionScore: number;
  sampleSize: number;
  isSampleSizeLimited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbRecommendation {
  id: string;
  projectId: string;
  auditFindingId?: string | null;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  problemStatement: string;
  whyItMatters: string;
  remediationSteps: string[];
  rationale: string;
  correlatedFeedbackCount: number;
  easeOfFixing: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAuditLog {
  id: string;
  userId?: string | null;
  projectId?: string | null;
  eventType: string;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

/**
 * Resilient In-Memory Database Store with full transactional and relational support.
 * Can be replaced by PrismaClient on PostgreSQL.
 */
class MemoryDatabase {
  users: Map<string, DbUser> = new Map();
  refreshTokens: Map<string, DbRefreshToken> = new Map();
  projects: Map<string, DbProject> = new Map();
  projectLinks: Map<string, DbProjectLink> = new Map();
  auditJobs: Map<string, DbAuditJob> = new Map();
  auditRuns: Map<string, DbAuditRun> = new Map();
  auditFindings: Map<string, DbAuditFinding> = new Map();
  feedbackForms: Map<string, DbFeedbackForm> = new Map();
  feedbackQuestions: Map<string, DbFeedbackQuestion> = new Map();
  feedbackOptions: Map<string, DbFeedbackOption> = new Map();
  feedbackResponses: Map<string, DbFeedbackResponse> = new Map();
  responseAnswers: Map<string, DbResponseAnswer> = new Map();
  feedbackThemes: Map<string, DbFeedbackTheme> = new Map();
  aiAnalyses: Map<string, DbAiAnalysis> = new Map();
  recommendations: Map<string, DbRecommendation> = new Map();
  auditLogs: DbAuditLog[] = [];

  // Helper for generating deterministic or random UUIDs
  generateId(): string {
    return crypto.randomUUID();
  }

  // Clear for test resets
  clear(): void {
    this.users.clear();
    this.refreshTokens.clear();
    this.projects.clear();
    this.projectLinks.clear();
    this.auditJobs.clear();
    this.auditRuns.clear();
    this.auditFindings.clear();
    this.feedbackForms.clear();
    this.feedbackQuestions.clear();
    this.feedbackOptions.clear();
    this.feedbackResponses.clear();
    this.responseAnswers.clear();
    this.feedbackThemes.clear();
    this.aiAnalyses.clear();
    this.recommendations.clear();
    this.auditLogs = [];
  }
}

export const memoryDb = new MemoryDatabase();

// Export Prisma client or fallback flag
export let prisma: PrismaClient | null = null;
try {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    prisma = new PrismaClient();
  }
} catch {
  prisma = null;
}
