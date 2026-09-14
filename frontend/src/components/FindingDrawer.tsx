import React from 'react';
import { X, ShieldAlert, CheckCircle, ExternalLink, Wrench } from 'lucide-react';
import { AuditFinding } from '../services/audits';

interface FindingDrawerProps {
  finding: AuditFinding | null;
  onClose: () => void;
}

export const FindingDrawer: React.FC<FindingDrawerProps> = ({ finding, onClose }) => {
  if (!finding) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '6px' }}>
                {finding.category}
              </span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '6px' }}>
                Confidence: {finding.confidence}
              </span>
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>{finding.title}</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* What's Wrong */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
              What Was Detected
            </h4>
            <p style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.5 }}>
              {finding.description}
            </p>
          </div>

          {/* Affected URL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <ExternalLink size={14} />
            <span>Affected URL:</span>
            <code style={{ color: '#06b6d4', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
              {finding.affected_url}
            </code>
          </div>

          {/* Evidence */}
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Empirical Evidence
            </h4>
            <div style={{
              background: '#070a12',
              padding: '14px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {finding.evidence}
            </div>
          </div>

          {/* How To Fix */}
          <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>
              <Wrench size={16} />
              Recommended Fix
            </div>
            <p style={{ fontSize: '0.9rem', color: '#ffffff', lineHeight: 1.5 }}>
              {finding.recommended_fix}
            </p>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 20px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
