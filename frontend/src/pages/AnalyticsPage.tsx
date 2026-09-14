import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  Users,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  FileText,
  MessageSquare,
  ArrowRight,
  Layers
} from 'lucide-react';
import { reportService, AnalyticsSummary } from '../services/reports';
import { projectService, Project } from '../services/projects';

export const AnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [correlating, setCorrelating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, projectData] = await Promise.all([
        reportService.getAnalytics(projectId),
        projectService.getProject(projectId),
      ]);
      setAnalytics(analyticsData);
      setProject(projectData);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCorrelation = async () => {
    if (!id) return;
    setCorrelating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await reportService.triggerCorrelation(id);
      setSuccessMsg('Successfully correlated feedback with technical audit findings! Recommendations updated.');
      await loadData(id);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger correlation analysis.');
    } finally {
      setCorrelating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel p-8 text-center max-w-sm w-full">
          <div className="spinner mx-auto mb-4" />
          <p className="text-slate-300 font-medium text-sm">Aggregating participant feedback & sentiment...</p>
        </div>
      </div>
    );
  }

  const sentiment = analytics?.sentiment_distribution || { positive: 0, neutral: 0, negative: 0 };
  const totalSentiment = (sentiment.positive || 0) + (sentiment.neutral || 0) + (sentiment.negative || 0) || 1;
  const posPct = Math.round(((sentiment.positive || 0) / totalSentiment) * 100);
  const neuPct = Math.round(((sentiment.neutral || 0) / totalSentiment) * 100);
  const negPct = Math.round(((sentiment.negative || 0) / totalSentiment) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">Projects</Link>
            <span>/</span>
            <Link to={`/projects/${id}`} className="hover:text-cyan-400 transition-colors">{project?.name || 'Project'}</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Feedback Analytics</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            Audience & Judge Insights
            <span className="badge badge-info">{analytics?.total_responses || 0} Responses</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time sentiment breakdown, recurring qualitative themes, and technical correlation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/projects/${id}/audit`} className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            Audit
          </Link>
          <Link to={`/projects/${id}/feedback`} className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Questionnaire
          </Link>
          <Link to={`/projects/${id}/report`} className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-400" />
            Health Report
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Responses</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {analytics?.total_responses ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">Collected from judges & participants</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Average Rating</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {analytics?.average_rating ? `${analytics.average_rating.toFixed(1)} / 5.0` : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500">Overall score average across questions</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Net Promoter Score</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {analytics?.nps_score !== undefined ? (
              <span className={analytics.nps_score > 30 ? 'text-emerald-400' : analytics.nps_score >= 0 ? 'text-amber-400' : 'text-red-400'}>
                {analytics.nps_score > 0 ? `+${analytics.nps_score}` : analytics.nps_score}
              </span>
            ) : (
              'N/A'
            )}
          </div>
          <p className="text-[11px] text-slate-500">Scale from -100 to +100</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Correlated Issues</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white text-amber-400">
            {analytics?.correlated_issues_count ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">Feedback mapped to technical audit</p>
        </div>
      </div>

      {/* AI Correlation Callout Banner */}
      <div className="glass-panel p-6 rounded-2xl border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            AI Audit & Feedback Correlation Agent
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Run the multi-agent synthesizer to cross-reference user complaints (e.g. broken flows, sluggish UI)
            against technical audit findings (security headers, JS console errors, accessibility contrast).
          </p>
        </div>

        <button
          onClick={handleTriggerCorrelation}
          disabled={correlating}
          className="btn btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          {correlating ? (
            <>
              <div className="spinner w-4 h-4" />
              Correlating with Technical Audit...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Run Correlation Synthesis
            </>
          )}
        </button>
      </div>

      {/* Sentiment Distribution */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Sentiment Distribution</h3>
            <p className="text-xs text-slate-400">Classified using zero-trust local deterministic NLP agent</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1 text-emerald-400">
              <Smile className="w-4 h-4" /> {posPct}% Positive
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Meh className="w-4 h-4" /> {neuPct}% Neutral
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <Frown className="w-4 h-4" /> {negPct}% Negative
            </span>
          </div>
        </div>

        {/* Segmented Bar */}
        <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex">
          <div style={{ width: `${posPct}%` }} className="bg-emerald-500 transition-all duration-500" />
          <div style={{ width: `${neuPct}%` }} className="bg-amber-500 transition-all duration-500" />
          <div style={{ width: `${negPct}%` }} className="bg-red-500 transition-all duration-500" />
        </div>
      </div>

      {/* Two Columns: Strengths vs Complaints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-emerald-500/20 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Key Strengths Identified
          </h3>
          {analytics?.top_strengths && analytics.top_strengths.length > 0 ? (
            <ul className="space-y-2.5">
              {analytics.top_strengths.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No strengths synthesized yet.</p>
          )}
        </div>

        <div className="glass-panel p-6 rounded-2xl border-amber-500/20 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Frequent Friction Points & Complaints
          </h3>
          {analytics?.top_complaints && analytics.top_complaints.length > 0 ? (
            <ul className="space-y-2.5">
              {analytics.top_complaints.map((c, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No complaints synthesized yet.</p>
          )}
        </div>
      </div>

      {/* Recurring Qualitative Themes */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white">Recurring Themes</h3>
          <p className="text-xs text-slate-400">
            Semantic clusters detected across respondent commentary.
          </p>
        </div>

        {analytics?.recurring_themes && analytics.recurring_themes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analytics.recurring_themes.map((theme) => {
              const isPositive = theme.sentiment === 'positive';
              const isNegative = theme.sentiment === 'negative';

              return (
                <div
                  key={theme.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isNegative
                      ? 'border-red-500/30 bg-red-950/20'
                      : isPositive
                      ? 'border-emerald-500/30 bg-emerald-950/20'
                      : 'border-slate-800 bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm text-white">{theme.theme_title}</h4>
                    <span
                      className={`badge text-[10px] uppercase font-mono ${
                        isNegative ? 'badge-danger' : isPositive ? 'badge-success' : 'badge-neutral'
                      }`}
                    >
                      {theme.sentiment} ({theme.occurrence_count})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{theme.ai_summary}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No recurring themes detected yet.</p>
        )}
      </div>

      {/* Bottom Action to Report */}
      <div className="flex justify-end pt-4">
        <Link
          to={`/projects/${id}/report`}
          className="btn btn-primary flex items-center gap-2 text-sm shadow-lg shadow-cyan-500/20"
        >
          <span>View Comprehensive Health Report</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
