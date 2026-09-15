import { request, API_BASE, getAuthToken } from './api';
import { AuditFinding } from './audits';

export interface Recommendation {
  id: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  problem_statement: string;
  why_it_matters: string;
  remediation_steps: string[];
  rationale: string;
  correlated_feedback_count: number;
  ease_of_fixing: string;
}

export interface FeedbackTheme {
  id: string;
  theme_title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  occurrence_count: number;
  severity?: string;
  ai_summary: string;
}

export interface FinalHealthReport {
  project_id: string;
  project_name: string;
  event_name: string;
  generated_at: string;
  scores: {
    overall: number;
    technical: number;
    security: number;
    ux: number;
    accessibility: number;
    performance: number;
    satisfaction: number;
  };
  executive_summary: string;
  top_strengths: string[];
  top_problems: string[];
  verified_findings_count: number;
  potential_findings_count: number;
  informational_findings_count: number;
  findings: AuditFinding[];
  feedback_themes: FeedbackTheme[];
  recommendations: Recommendation[];
  disclaimer: string;
}

export interface AnalyticsSummary {
  total_responses: number;
  average_rating: number;
  nps_score: number;
  sentiment_distribution: { [key: string]: number };
  top_strengths: string[];
  top_complaints: string[];
  recurring_themes: FeedbackTheme[];
  recommendations: Recommendation[];
  correlated_issues_count: number;
}

export const reportService = {
  async getReport(projectId: string): Promise<FinalHealthReport> {
    return request<FinalHealthReport>(`/projects/${projectId}/report`);
  },

  async getAnalytics(projectId: string): Promise<AnalyticsSummary> {
    return request<AnalyticsSummary>(`/projects/${projectId}/analytics`);
  },

  async triggerCorrelation(projectId: string): Promise<Recommendation[]> {
    return request<Recommendation[]>(`/projects/${projectId}/analytics/correlate`, {
      method: 'POST',
    });
  },

  getExportUrl(projectId: string, format: 'json' | 'csv' | 'pdf'): string {
    return `${API_BASE}/projects/${projectId}/report/export?format=${format}`;
  },

  async downloadReport(projectId: string, format: 'json' | 'csv' | 'pdf'): Promise<void> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/projects/${projectId}/report/export?format=${format}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Export failed (${res.status}): ${errText}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${projectId}-report.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
