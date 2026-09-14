import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Bug,
  Lock,
  MessageSquareCode,
  GitMerge,
  ListOrdered,
  ArrowRight,
  ExternalLink,
  Cpu,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div>
      {/* Hero Section */}
      <section style={{
        padding: '96px 24px 64px',
        textAlign: 'center',
        maxWidth: '960px',
        margin: '0 auto',
        position: 'relative'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '9999px',
          padding: '6px 16px',
          color: '#34d399',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '24px'
        }}>
          <span className="pulse-dot" />
          Production-Oriented Hackathon Auditor
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          lineHeight: 1.15,
          marginBottom: '24px',
          background: 'linear-gradient(180deg, #FFFFFF 30%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Find Problems Before Your Judges Do.
        </h1>

        <p style={{
          fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
          color: 'var(--text-secondary)',
          maxWidth: '720px',
          margin: '0 auto 36px',
          lineHeight: 1.6
        }}>
          Autonomous passive security audits, observable bug discovery, AI feedback questionnaire generation, and real-time issue correlation for high-stakes hackathons.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn-primary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
            Audit My Project
            <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn-secondary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
            Demo Workspace
          </Link>
        </div>
      </section>

      {/* Six Pillars Showcase */}
      <section style={{ maxWidth: '1280px', margin: '48px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '12px' }}>Autonomous Hackathon Intelligence</h2>
          <p style={{ color: 'var(--text-muted)' }}>From live website inspection to judge feedback correlation in 6 steps.</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {/* 1. Safe HTTP & Browser Audit */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Cpu size={24} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>6-Layer Safe Scanner</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Multi-layer SSRF validation, DNS rebinding protection, and headless browser inspection. Completely passive and non-destructive.
            </p>
          </div>

          {/* 2. Bug Detection */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Bug size={24} color="#f43f5e" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Observable Bug Detection</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Captures uncaught JavaScript errors, failed network sub-requests, broken assets, and layout rendering bottlenecks.
            </p>
          </div>

          {/* 3. Security Posture */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Lock size={24} color="#06b6d4" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Passive Security Posture</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Checks HTTPS, HSTS, CSP, X-Frame-Options, cookie hygiene, and exposed configuration indicators without intrusive penetration tests.
            </p>
          </div>

          {/* 4. AI Feedback Form Builder */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <MessageSquareCode size={24} color="#6366f1" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>AI Questionnaire Generator</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Tailors questions to your exact problem statement, tech stack, and audience. Supports 9 question types with QR code sharing.
            </p>
          </div>

          {/* 5. Issue Correlation */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <GitMerge size={24} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Issue Correlation Engine</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Connects participant feedback complaints with technical audit findings to boost confidence on high-impact blockers.
            </p>
          </div>

          {/* 6. Prioritized Action Plan */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <ListOrdered size={24} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>P0–P3 Actionable Remediation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Generates executive health reports with concrete remediation steps. Export clean JSON, formula-safe CSV, or PDF summaries.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
