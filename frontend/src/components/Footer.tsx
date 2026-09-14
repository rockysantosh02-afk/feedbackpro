import React from 'react';
import { Shield, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      background: 'rgba(10, 13, 20, 0.95)',
      padding: '48px 24px 32px',
      marginTop: '64px',
      color: 'var(--text-secondary)',
      fontSize: '0.9rem'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',
          marginBottom: '32px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Shield size={20} color="#10b981" />
              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.1rem' }}>FeedbackPro</span>
            </div>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Autonomous Hackathon Project Auditor & Feedback Platform. Designed for builders, judges, and mentors.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>
              <Lock size={16} />
              Zero-Trust Architecture
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              All target websites, user feedback, and AI generations are treated as untrusted data with multi-layer SSRF, IDOR, and prompt boundaries.
            </p>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <b>Notice:</b> This automated audit performs limited, non-destructive checks and is not a substitute for a professional penetration test.
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            &copy; 2026 FeedbackPro. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
