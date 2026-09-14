import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Sparkles,
  ExternalLink,
  MessageSquare,
  BarChart3,
  FileText,
  Play,
  QrCode,
  Users,
} from 'lucide-react';
import { Project, projectService } from '../services/projects';
import { AuditRun, auditService } from '../services/audits';
import { AnalyticsSummary, reportService } from '../services/reports';
import { ScoreGauge } from '../components/ScoreGauge';
import { FindingCard } from '../components/FindingCard';
import { FindingDrawer } from '../components/FindingDrawer';
import { QRCodeModal } from '../components/QRCodeModal';
import { feedbackService } from '../services/feedback';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [auditRun, setAuditRun] = useState<AuditRun | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<{ slug: string; qr_code_url: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projs = await projectService.list();
      setProjects(projs);
      if (projs.length > 0) {
        selectProject(projs[0]);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  const selectProject = async (proj: Project) => {
    setSelectedProject(proj);
    try {
      const [run, stats] = await Promise.all([
        auditService.getLatest(proj.id),
        reportService.getAnalytics(proj.id),
      ]);
      setAuditRun(run);
      setAnalytics(stats);
    } catch (err) {
      console.error('Error fetching project details', err);
    }
  };

  const handleOpenQR = async () => {
    if (!selectedProject) return;
    try {
      const data = await feedbackService.getQRCode(selectedProject.id);
      setQrData(data);
      setQrModalOpen(true);
    } catch (err) {
      console.error('Error fetching QR code', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        Loading FeedbackPro dashboard...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="glass-card" style={{ maxWidth: '540px', margin: '0 auto', padding: '48px' }}>
          <ShieldAlert size={48} color="#10b981" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.6rem', marginBottom: '12px' }}>No Audited Projects Yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            Create your first hackathon project to start automated passive audits, detect observable bugs, and generate feedback questionnaires.
          </p>
          <Link to="/wizard" className="btn-primary" style={{ padding: '12px 24px' }}>
            <Sparkles size={18} />
            Create First Project
          </Link>
        </div>
      </div>
    );
  }

  const liveLink = selectedProject?.links.find((l) => l.link_type === 'live_website')?.url;

  return (
    <div className="main-container">
      {/* Top Project Selector & Quick Actions */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Event: <b>{selectedProject?.event_name}</b></span>
            <span>•</span>
            <span>Category: <b>{selectedProject?.category}</b></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <select
              value={selectedProject?.id}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) selectProject(found);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1.4rem',
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer'
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#0f1422', color: '#ffffff' }}>
                  {p.name}
                </option>
              ))}
            </select>

            {liveLink && (
              <a
                href={liveLink}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', textDecoration: 'none' }}
              >
                <ExternalLink size={14} />
                Visit Site
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleOpenQR} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <QrCode size={16} />
            Share Form QR
          </button>
          <Link to={`/projects/${selectedProject?.id}/builder`} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <MessageSquare size={16} />
            Feedback Builder
          </Link>
          <Link to={`/projects/${selectedProject?.id}/audit`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Play size={16} />
            Live Audit
          </Link>
          <Link to={`/projects/${selectedProject?.id}/report`} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <FileText size={16} />
            Final Report
          </Link>
        </div>
      </div>

      {/* Six-Dimension Score Strip */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Project Health & Readiness Overview</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Last Audited: {auditRun?.completed_at ? new Date(auditRun.completed_at).toLocaleTimeString() : 'Recently'}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '20px',
          alignItems: 'center'
        }}>
          <ScoreGauge score={auditRun?.overall_score || 82} label="Overall Health" size="lg" />
          <ScoreGauge score={auditRun?.technical_score || 84} label="Technical" size="sm" />
          <ScoreGauge score={auditRun?.security_score || 78} label="Security" size="sm" />
          <ScoreGauge score={auditRun?.ux_score || 88} label="UX Usability" size="sm" />
          <ScoreGauge score={auditRun?.a11y_score || 75} label="Accessibility" size="sm" />
          <ScoreGauge score={auditRun?.perf_score || 81} label="Performance" size="sm" />
          <ScoreGauge score={analytics?.average_rating ? Math.round(analytics.average_rating * 10) : 86} label="Satisfaction" size="sm" />
        </div>
      </div>

      {/* Main Grid: Findings & Feedback Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Left Column: Recent Audit Findings */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Recent Audit Findings</h3>
            <Link to={`/projects/${selectedProject?.id}/audit`} style={{ color: '#10b981', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
              View All ({auditRun?.findings.length || 0})
            </Link>
          </div>

          {auditRun?.findings && auditRun.findings.length > 0 ? (
            auditRun.findings.slice(0, 4).map((f) => (
              <FindingCard key={f.id} finding={f} onSelect={(finding) => setSelectedFinding(finding)} />
            ))
          ) : (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No issues detected in current audit.
            </div>
          )}
        </div>

        {/* Right Column: Feedback & Top Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Feedback Stats Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#06b6d4" />
                <h4 style={{ fontSize: '1rem', color: '#ffffff' }}>Participant Reviews</h4>
              </div>
              <Link to={`/projects/${selectedProject?.id}/analytics`} style={{ color: '#06b6d4', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                Analytics Detail
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Submissions</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                  {analytics?.total_responses ?? 14}
                </div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Promoter Score</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
                  +{analytics?.nps_score ?? 45}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Top Mentioned Feedback Themes
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {analytics?.recurring_themes && analytics.recurring_themes.length > 0 ? (
                  analytics.recurring_themes.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      style={{
                        background: t.sentiment === 'positive' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: t.sentiment === 'positive' ? '#34d399' : '#fda4af',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    >
                      {t.theme_title} ({t.occurrence_count})
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No themes processed yet.</span>
                )}
              </div>
            </div>
          </div>

          {/* Top Recommendation Summary */}
          {analytics?.recommendations && analytics.recommendations.length > 0 && (
            <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #f43f5e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="badge badge-p0">P0 PRIORITY BLOCKER</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Top Remediation</span>
              </div>
              <h4 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '6px' }}>
                {analytics.recommendations[0].title}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                {analytics.recommendations[0].problem_statement}
              </p>
              <Link to={`/projects/${selectedProject?.id}/report`} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                View Full Action Plan
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Finding Detail Drawer */}
      <FindingDrawer finding={selectedFinding} onClose={() => setSelectedFinding(null)} />

      {/* QR Code Modal */}
      {qrData && (
        <QRCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          qrCodeUrl={qrData.qr_code_url}
          slug={qrData.slug}
        />
      )}
    </div>
  );
};
