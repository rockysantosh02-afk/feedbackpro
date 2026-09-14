import React from 'react';

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label, size = 'md', subtitle }) => {
  // Determine color theme
  let color = '#10b981'; // Emerald
  let bgGradient = 'rgba(16, 185, 129, 0.15)';
  if (score < 60) {
    color = '#f43f5e'; // Rose
    bgGradient = 'rgba(244, 63, 94, 0.15)';
  } else if (score < 75) {
    color = '#f59e0b'; // Amber
    bgGradient = 'rgba(245, 158, 11, 0.15)';
  } else if (score < 85) {
    color = '#06b6d4'; // Cyan
    bgGradient = 'rgba(6, 182, 212, 0.15)';
  }

  const dim = size === 'lg' ? 140 : size === 'md' ? 100 : 70;
  const strokeWidth = size === 'lg' ? 10 : size === 'md' ? 8 : 6;
  const radius = (dim - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * radius;
  const strokeDashoffset = circ - (score / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: dim, height: dim }}>
        <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: size === 'lg' ? '2.2rem' : size === 'md' ? '1.5rem' : '1.1rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1
          }}>
            {score}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            /100
          </span>
        </div>
      </div>
      <span style={{
        marginTop: '10px',
        fontSize: size === 'lg' ? '1.05rem' : '0.85rem',
        fontWeight: 600,
        color: '#ffffff'
      }}>
        {label}
      </span>
      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
