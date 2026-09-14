import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, ArrowLeft, Check, AlertTriangle, Link2, Sparkles } from 'lucide-react';
import { projectService } from '../services/projects';

export const ProjectWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Event
    event_name: '',
    event_organizer: '',
    event_type: 'Hackathon',
    event_date: '',
    // Step 2: Project Profile
    name: '',
    category: 'AI & Machine Learning',
    short_description: '',
    problem_statement: '',
    solution: '',
    target_users: '',
    // Step 3: Tech Stack
    tech_frontend: 'React / Vite',
    tech_backend: 'FastAPI / Python',
    tech_database: 'PostgreSQL',
    tech_ai: 'Gemini / OpenAI',
    tech_hosting: 'Render',
    // Step 4: Links
    live_url: '',
    github_url: '',
    // Step 5: Audit Authorization
    authorize_audit: false,
    // Step 6: Feedback Goal
    feedback_goal: 'General Usability & Judging Prep',
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setError(null);
    if (step === 1 && !formData.event_name.trim()) {
      setError('Please enter the hackathon or event name.');
      return;
    }
    if (step === 2 && (!formData.name.trim() || !formData.short_description.trim())) {
      setError('Please enter the project name and short description.');
      return;
    }
    if (step === 4 && !formData.live_url.trim()) {
      setError('Please provide the live demo or website URL.');
      return;
    }
    if (step === 5 && !formData.authorize_audit) {
      setError('You must explicitly authorize the non-destructive automated audit to proceed.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const links = [];
    if (formData.live_url) {
      links.push({ link_type: 'live_website', url: formData.live_url, label: 'Live Website' });
    }
    if (formData.github_url) {
      links.push({ link_type: 'github', url: formData.github_url, label: 'GitHub Repository' });
    }

    try {
      const project = await projectService.create({
        ...formData,
        links,
      });
      navigate(`/projects/${project.id}/audit`);
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    'Event',
    'Profile',
    'Tech Stack',
    'Links',
    'Authorization',
    'Goals',
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px' }}>
      {/* Stepper Header */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          {stepsList.map((label, idx) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: step > idx + 1
                  ? '#10b981'
                  : step === idx + 1
                  ? '#06b6d4'
                  : 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
                marginBottom: '6px'
              }}>
                {step > idx + 1 ? <Check size={16} /> : idx + 1}
              </div>
              <span style={{ fontSize: '0.75rem', color: step === idx + 1 ? '#ffffff' : 'var(--text-muted)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((step - 1) / (stepsList.length - 1)) * 100}%`, background: '#10b981', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div className="glass-card" style={{ padding: '36px' }}>
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#fda4af',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: EVENT */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 1: Event Information</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Where is this project being presented or judged?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Event / Hackathon Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Global AI Hackathon 2026"
                  value={formData.event_name}
                  onChange={(e) => updateField('event_name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Organizer / Host
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. MIT Health Lab / Devpost"
                  value={formData.event_organizer}
                  onChange={(e) => updateField('event_organizer', e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Event Type
                </label>
                <select
                  className="input-field"
                  value={formData.event_type}
                  onChange={(e) => updateField('event_type', e.target.value)}
                >
                  <option value="Hackathon">Hackathon</option>
                  <option value="Demo Day">Demo Day</option>
                  <option value="Showcase">Showcase</option>
                  <option value="Class Project">Class Project</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PROFILE */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 2: Project Profile</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Explain what you built so the AI can craft contextual audit heuristics and questions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. HealthPulse AI"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Short Summary / Pitch *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Preventive cardiovascular fatigue triage assistant."
                  value={formData.short_description}
                  onChange={(e) => updateField('short_description', e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Problem Statement
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="What problem does your project solve?"
                  value={formData.problem_statement}
                  onChange={(e) => updateField('problem_statement', e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Solution Description
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="How does your application address this problem?"
                  value={formData.solution}
                  onChange={(e) => updateField('solution', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: TECH STACK */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 3: Tech Stack</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Technologies used help the AI evaluate architectural compatibility and security posture.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Frontend
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.tech_frontend}
                  onChange={(e) => updateField('tech_frontend', e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Backend
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.tech_backend}
                  onChange={(e) => updateField('tech_backend', e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Database
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.tech_database}
                  onChange={(e) => updateField('tech_database', e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  AI / LLM Models
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.tech_ai}
                  onChange={(e) => updateField('tech_ai', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: LINKS */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 4: Public Links</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Provide the live website or deployment URL to be audited.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Live Demo / Website URL *
                </label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://my-project.onrender.com"
                  value={formData.live_url}
                  onChange={(e) => updateField('live_url', e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  GitHub Repository URL (Optional)
                </label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://github.com/my-org/my-project"
                  value={formData.github_url}
                  onChange={(e) => updateField('github_url', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: AUDIT AUTHORIZATION */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 5: Explicit Audit Authorization</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              In compliance with zero-trust security policy, you must explicitly authorize automated scanning.
            </p>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>
                <Shield size={20} />
                Non-Destructive Passive Audit Scope
              </div>
              <p style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5, marginBottom: '12px' }}>
                FeedbackPro performs strictly passive, non-destructive checks (HTTP response codes, security headers, mobile viewport rendering, broken assets, and accessibility attributes). It will never perform invasive exploitation, credential stuffing, SQL injection, or destructive payload execution.
              </p>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#10b981' }}
                  checked={formData.authorize_audit}
                  onChange={(e) => updateField('authorize_audit', e.target.checked)}
                />
                <span style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>
                  I am the authorized owner of this project and explicitly authorize FeedbackPro to perform automated non-destructive audits on the provided URL.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 6: FEEDBACK GOAL */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 6: Feedback Goal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              What feedback is most valuable to your team right now?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'General Usability & Judging Prep', desc: 'Holistic feedback on presentation, design, and first impressions.' },
                { id: 'Bug Discovery & Stress Testing', desc: 'Identify edge-case bugs and mobile layout glitches.' },
                { id: 'Feature Validation & Value Prop', desc: 'Evaluate whether the core solution solves the target problem.' },
                { id: 'Judge & Mentor Evaluation', desc: 'Focus specifically on judging criteria and competitive viability.' }
              ].map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => updateField('feedback_goal', goal.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: formData.feedback_goal === goal.id ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                    background: formData.feedback_goal === goal.id ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 600, color: formData.feedback_goal === goal.id ? '#10b981' : '#ffffff', marginBottom: '4px' }}>
                    {goal.id}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {goal.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((p) => p - 1)}
              className="btn-secondary"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : <div />}

          {step < 6 ? (
            <button type="button" onClick={handleNext} className="btn-primary">
              Next Step
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary"
            >
              <Sparkles size={16} />
              {loading ? 'Creating Project & Launching...' : 'Create & Run Audit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
