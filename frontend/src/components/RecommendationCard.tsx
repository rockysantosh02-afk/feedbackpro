import React from 'react';
import { CheckSquare, MessageSquare, Flame } from 'lucide-react';
import { Recommendation } from '../services/reports';

interface RecommendationCardProps {
  rec: Recommendation;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ rec }) => {
  const priorityClass = `badge badge-${rec.priority.toLowerCase()}`;

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={priorityClass}>{rec.priority}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Ease: <b style={{ color: '#ffffff' }}>{rec.ease_of_fixing}</b>
          </span>
        </div>

        {rec.correlated_feedback_count > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(244, 63, 94, 0.15)',
            color: '#fb7185',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            <Flame size={14} />
            Correlated with {rec.correlated_feedback_count} feedback reviews
          </div>
        )}
      </div>

      <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '8px' }}>
        {rec.title}
      </h3>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
        {rec.problem_statement}
      </p>

      <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
        <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
          Why It Matters
        </h5>
        <p style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
          {rec.why_it_matters}
        </p>
      </div>

      <div>
        <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Remediation Steps
        </h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Array.isArray(rec.remediation_steps) && rec.remediation_steps.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem' }}>
              <CheckSquare size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ color: '#ffffff' }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
