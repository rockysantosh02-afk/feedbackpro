import { request } from './api';

export interface AuditFinding {
  id: string;
  audit_run_id: string;
  project_id: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: 'high' | 'medium' | 'low';
  verified: boolean;
  description: string;
  evidence: string;
  affected_url: string;
  recommended_fix: string;
  source: string;
  created_at: string;
}

export interface AuditRun {
  id: string;
  project_id: string;
  status: 'running' | 'completed' | 'failed';
  stage: string;
  target_url: string;
  overall_score: number;
  technical_score: number;
  security_score: number;
  ux_score: number;
  a11y_score: number;
  perf_score: number;
  summary?: string;
  error_message?: string;
  disclaimer: string;
  completed_at?: string;
  findings: AuditFinding[];
}

export interface AuditJob {
  id: string;
  project_id: string;
  status: string;
  stage: string;
  attempts: number;
}

export const auditService = {
  async trigger(projectId: string, targetUrl?: string): Promise<AuditJob> {
    return request<AuditJob>(`/projects/${projectId}/audit`, {
      method: 'POST',
      body: JSON.stringify({ target_url: targetUrl }),
    });
  },

  async getLatest(projectId: string): Promise<AuditRun | null> {
    return request<AuditRun | null>(`/projects/${projectId}/audit`);
  },

  async listFindings(projectId: string): Promise<AuditFinding[]> {
    return request<AuditFinding[]>(`/projects/${projectId}/audit/findings`);
  },
};
