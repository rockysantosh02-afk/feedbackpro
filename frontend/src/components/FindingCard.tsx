import React from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, ExternalLink } from 'lucide-react';
import { AuditFinding } from '../services/audits';

export interface FindingCardProps {
  finding: AuditFinding;
  onSelect?: (finding: AuditFinding) => void;
  onViewDetails?: (finding: AuditFinding) => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, onSelect, onViewDetails }) => {
  const badgeClass = `badge badge-${finding.severity}`;
  const handleSelect = () => {
    if (onViewDetails) onViewDetails(finding);
    else if (onSelect) onSelect(finding);
  };

  return (
    <div
      onClick={handleSelect}
      className="glass-card glass-card-interactive"
      style={{
        padding: '16px 20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
        <div style={{
          padding: '8px',
          borderRadius: '8px',
          background: finding.severity === 'critical' || finding.severity === 'high'
            ? 'rgba(244, 63, 94, 0.15)'
            : 'rgba(16, 185, 129, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {finding.verified ? (
            <CheckCircle2 size={18} color="#10b981" />
          ) : (
            <AlertCircle size={18} color="#f59e0b" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className={badgeClass}>{finding.severity}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {finding.category}
            </span>
          </div>
          <h4 style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {finding.title}
          </h4>
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {finding.description}
          </p>
        </div>
      </div>

      <ChevronRight size={18} color="var(--text-muted)" />
    </div>
  );
};
