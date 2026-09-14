import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Filter, ShieldCheck, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { AuditFinding, AuditRun, auditService } from '../services/audits';
import { AuditProgressTracker } from '../components/AuditProgressTracker';
import { FindingCard } from '../components/FindingCard';
import { FindingDrawer } from '../components/FindingDrawer';

export const AuditPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [auditRun, setAuditRun] = useState<AuditRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);

  useEffect(() => {
    if (projectId) {
      loadAudit();
    }
  }, [projectId]);

  // Polling while audit is running
  useEffect(() => {
    let interval: any;
    if (auditRun && auditRun.status === 'running') {
      interval = setInterval(() => {
        if (projectId) loadAudit();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [auditRun?.status, projectId]);

  const loadAudit = async () => {
    if (!projectId) return;
    try {
      const run = await auditService.getLatest(projectId);
      setAuditRun(run);
    } catch (err) {
      console.error('Failed to load audit run', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAudit = async () => {
    if (!projectId) return;
    setTriggering(true);
    try {
      await auditService.trigger(projectId);
      // Immediately refresh audit run
      await loadAudit();
    } catch (err: any) {
      alert(`Audit trigger error: ${err.message || 'Unknown error'}`);
    } finally {
      setTriggering(false);
    }
  };

  const findings = auditRun?.findings || [];
  const filteredFindings = findings.filter((f) => {
    if (activeFilter === 'all') return true;
    return f.severity === activeFilter;
  });

  const counts = {
    all: findings.length,
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };

  return (
    <div className="main-container">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#ffffff', marginBottom: '6px' }}>
            Live Audit & Observable Bug Inspection
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Safe, non-destructive passive website analysis, security headers, and responsive rendering checks.
          </p>
        </div>

        <button
          onClick={handleTriggerAudit}
          disabled={triggering || auditRun?.status === 'running'}
          className="btn-primary"
          style={{ padding: '10px 20px' }}
        >
          {auditRun?.status === 'running' ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Auditing Target...
            </>
          ) : (
            <>
              <Play size={16} />
              Re-run Audit
            </>
          )}
        </button>
      </div>

      {/* Progress Tracker */}
      <AuditProgressTracker
        currentStage={auditRun?.stage || 'queued'}
        status={auditRun?.status || 'completed'}
        errorMessage={auditRun?.error_message}
      />

      {/* Findings Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Filter size={14} /> Filter Severity:
        </span>

        {[
          { id: 'all', label: `All (${counts.all})` },
          { id: 'critical', label: `Critical (${counts.critical})` },
          { id: 'high', label: `High (${counts.high})` },
          { id: 'medium', label: `Medium (${counts.medium})` },
          { id: 'low', label: `Low (${counts.low})` },
          { id: 'info', label: `Info (${counts.info})` },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setActiveFilter(btn.id)}
            style={{
              background: activeFilter === btn.id ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
              color: activeFilter === btn.id ? '#ffffff' : 'var(--text-secondary)',
              border: activeFilter === btn.id ? '1px solid #10b981' : '1px solid var(--border-subtle)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Findings List */}
      <div>
        {filteredFindings.length > 0 ? (
          filteredFindings.map((f) => (
            <FindingCard key={f.id} finding={f} onSelect={(finding) => setSelectedFinding(finding)} />
          ))
        ) : (
          <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No findings match the selected severity filter.
          </div>
        )}
      </div>

      {/* Finding Detail Drawer */}
      <FindingDrawer finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </div>
  );
};
