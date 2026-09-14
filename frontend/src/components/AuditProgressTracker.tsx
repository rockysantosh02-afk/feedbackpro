import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface AuditProgressTrackerProps {
  currentStage: string;
  status: string;
  errorMessage?: string;
}

const STAGES = [
  { id: 'queued', label: 'Queued' },
  { id: 'validating', label: 'URL & SSRF Safety' },
  { id: 'inspecting', label: 'Safe HTTP Inspection' },
  { id: 'security_checks', label: 'Security Posture Checks' },
  { id: 'ux_accessibility', label: 'UX & Accessibility Checks' },
  { id: 'bug_detection', label: 'Observable Bug Detection' },
  { id: 'scoring', label: 'Health Scoring' },
  { id: 'completed', label: 'Completed' },
];

export const AuditProgressTracker: React.FC<AuditProgressTrackerProps> = ({
  currentStage,
  status,
  errorMessage,
}) => {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>Audit Pipeline Progress</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Status: <b style={{ color: status === 'completed' ? '#10b981' : status === 'failed' ? '#f43f5e' : '#06b6d4' }}>{status.toUpperCase()}</b>
        </span>
      </div>

      {status === 'failed' && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: '#fda4af',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem'
        }}>
          <AlertTriangle size={18} />
          <span>Audit failed: {errorMessage || 'An error occurred during inspection'}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
        {STAGES.map((stg, idx) => {
          const isPassed = status === 'completed' || idx < currentIndex;
          const isCurrent = status !== 'completed' && status !== 'failed' && idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div
              key={stg.id}
              style={{
                background: isCurrent
                  ? 'rgba(6, 182, 212, 0.15)'
                  : isPassed
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: isCurrent
                  ? '1px solid #06b6d4'
                  : isPassed
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              {isPassed ? (
                <CheckCircle2 size={20} color="#10b981" />
              ) : isCurrent ? (
                <Loader2 size={20} color="#06b6d4" className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
              ) : (
                <Clock size={20} color="var(--text-muted)" />
              )}
              <span style={{
                fontSize: '0.75rem',
                fontWeight: isCurrent ? 700 : 500,
                color: isCurrent ? '#06b6d4' : isPassed ? '#10b981' : 'var(--text-muted)'
              }}>
                {stg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
