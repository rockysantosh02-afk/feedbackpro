import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  Layers,
  Sparkles,
  ArrowLeft,
  Flame,
  ExternalLink,
  Info
} from 'lucide-react';
import { reportService, FinalHealthReport } from '../services/reports';
import { projectService, Project } from '../services/projects';
import { ScoreGauge } from '../components/ScoreGauge';
import { RecommendationCard } from '../components/RecommendationCard';
import { FindingCard } from '../components/FindingCard';
import { FindingDrawer } from '../components/FindingDrawer';
import { AuditFinding } from '../services/audits';

export const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<FinalHealthReport | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'findings' | 'themes'>('recommendations');

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [repData, projData] = await Promise.all([
        reportService.getReport(projectId),
        projectService.getProject(projectId),
      ]);
      setReport(repData);
      setProject(projData);
    } catch (err: any) {
      setError(err.message || 'Failed to generate comprehensive health report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    if (!id) return;
    setDownloadingFormat(format);
    try {
      await reportService.downloadReport(id, format);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel p-8 text-center max-w-sm w-full">
          <div className="spinner mx-auto mb-4" />
          <p className="text-slate-300 font-medium text-sm">Compiling complete project health report...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel p-8 text-center max-w-md w-full border-red-500/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Report Not Available</h2>
          <p className="text-slate-400 mb-6 text-sm">{error}</p>
          <div className="flex gap-3">
            <Link to={`/projects/${id}/audit`} className="btn btn-primary flex-1 text-xs">
              Run Audit First
            </Link>
            <button onClick={() => id && loadData(id)} className="btn btn-secondary flex-1 text-xs">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const scores = report?.scores || {
    overall: 0,
    technical: 0,
    security: 0,
    ux: 0,
    accessibility: 0,
    performance: 0,
    satisfaction: 0,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">Projects</Link>
            <span>/</span>
            <Link to={`/projects/${id}`} className="hover:text-cyan-400 transition-colors">{project?.name || 'Project'}</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Project Health Report</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            {report?.project_name || project?.name}
            <span className="badge badge-info">{report?.event_name || project?.event_name}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Generated {report?.generated_at ? new Date(report.generated_at).toLocaleDateString() : 'Today'} • Automated Multi-Agent Synthesis
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('json')}
            disabled={downloadingFormat !== null}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingFormat === 'json' ? 'Exporting...' : 'JSON'}
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={downloadingFormat !== null}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingFormat === 'csv' ? 'Exporting...' : 'CSV'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={downloadingFormat !== null}
            className="btn btn-primary text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingFormat === 'pdf' ? 'Exporting...' : 'PDF Report'}
          </button>
        </div>
      </div>

      {/* MANDATORY SECURITY DISCLAIMER BANNER */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-start gap-3.5 text-xs text-slate-300">
        <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Passive & Non-Destructive Audit Notice</p>
          <p className="text-slate-400 leading-relaxed">
            {report?.disclaimer ||
              'No issues were detected within the checks performed. This automated audit performs limited, non-destructive checks and is not a substitute for a professional penetration test.'}
          </p>
        </div>
      </div>

      {/* Overall Score & Key Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Gauge */}
        <div className="glass-panel p-8 rounded-2xl border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
          <ScoreGauge score={scores.overall} size="lg" label="Health Score" />
          <div>
            <h3 className="text-lg font-bold text-white">Overall Project Health</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Correlated weighted index across technical stability, security posture, accessibility, and audience reception.
            </p>
          </div>
        </div>

        {/* 5 Pillar Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-4 rounded-xl border-slate-800 space-y-2">
            <div className="text-slate-400 text-xs font-semibold uppercase">Security Posture</div>
            <div className="text-2xl font-extrabold text-emerald-400">{scores.security}/100</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div style={{ width: `${scores.security}%` }} className="bg-emerald-400 h-full" />
            </div>
            <p className="text-[11px] text-slate-500">Headers, SSL, HTTPS</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border-slate-800 space-y-2">
            <div className="text-slate-400 text-xs font-semibold uppercase">Usability & UX</div>
            <div className="text-2xl font-extrabold text-cyan-400">{scores.ux}/100</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div style={{ width: `${scores.ux}%` }} className="bg-cyan-400 h-full" />
            </div>
            <p className="text-[11px] text-slate-500">Layout, navigation, errors</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border-slate-800 space-y-2">
            <div className="text-slate-400 text-xs font-semibold uppercase">Accessibility</div>
            <div className="text-2xl font-extrabold text-indigo-400">{scores.accessibility}/100</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div style={{ width: `${scores.accessibility}%` }} className="bg-indigo-400 h-full" />
            </div>
            <p className="text-[11px] text-slate-500">WCAG, contrast, ARIA</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border-slate-800 space-y-2">
            <div className="text-slate-400 text-xs font-semibold uppercase">Technical Readiness</div>
            <div className="text-2xl font-extrabold text-amber-400">{scores.technical}/100</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div style={{ width: `${scores.technical}%` }} className="bg-amber-400 h-full" />
            </div>
            <p className="text-[11px] text-slate-500">Console errors, network latency</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border-slate-800 space-y-2">
            <div className="text-slate-400 text-xs font-semibold uppercase">Audience Sentiment</div>
            <div className="text-2xl font-extrabold text-purple-400">{scores.satisfaction}/100</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div style={{ width: `${scores.satisfaction}%` }} className="bg-purple-400 h-full" />
            </div>
            <p className="text-[11px] text-slate-500">Judge & participant survey</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border-slate-800 space-y-2">
            <div className="text-slate-400 text-xs font-semibold uppercase">Total Findings</div>
            <div className="text-2xl font-extrabold text-white">
              {(report?.verified_findings_count || 0) + (report?.potential_findings_count || 0)}
            </div>
            <div className="flex gap-1.5 text-[10px] font-mono">
              <span className="text-emerald-400">{report?.verified_findings_count || 0} Verified</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">{report?.potential_findings_count || 0} Potential</span>
            </div>
            <p className="text-[11px] text-slate-500">Observable checks</p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {report?.executive_summary && (
        <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Executive Summary
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {report.executive_summary}
          </p>
        </div>
      )}

      {/* Strengths & Problems Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-emerald-500/20 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Key Competitive Strengths
          </h3>
          <ul className="space-y-2">
            {(report?.top_strengths || []).map((strength, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-amber-500/20 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Top Areas Requiring Remediation
          </h3>
          <ul className="space-y-2">
            {(report?.top_problems || []).map((problem, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span>{problem}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tabs: Recommendations / Findings / Qualitative Themes */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`text-sm font-bold pb-2 transition-all border-b-2 ${
              activeTab === 'recommendations'
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Prioritized Action Plan ({report?.recommendations?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('findings')}
            className={`text-sm font-bold pb-2 transition-all border-b-2 ${
              activeTab === 'findings'
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Technical Audit Findings ({report?.findings?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`text-sm font-bold pb-2 transition-all border-b-2 ${
              activeTab === 'themes'
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Audience Themes ({report?.feedback_themes?.length || 0})
          </button>
        </div>

        {/* Tab 1: Prioritized Recommendations (P0-P3) */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {report?.recommendations && report.recommendations.length > 0 ? (
              report.recommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">No recommendations generated.</p>
            )}
          </div>
        )}

        {/* Tab 2: Technical Findings */}
        {activeTab === 'findings' && (
          <div className="space-y-3">
            {report?.findings && report.findings.length > 0 ? (
              report.findings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  onViewDetails={(f) => setSelectedFinding(f)}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">No audit findings recorded.</p>
            )}
          </div>
        )}

        {/* Tab 3: Themes */}
        {activeTab === 'themes' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {report?.feedback_themes && report.feedback_themes.length > 0 ? (
              report.feedback_themes.map((theme) => (
                <div key={theme.id} className="glass-panel p-5 rounded-xl border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{theme.theme_title}</h4>
                    <span className="badge badge-info text-[10px]">{theme.sentiment}</span>
                  </div>
                  <p className="text-xs text-slate-400">{theme.ai_summary}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">No feedback themes recorded.</p>
            )}
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedFinding && (
        <FindingDrawer
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </div>
  );
};
