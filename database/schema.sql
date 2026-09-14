-- FeedbackPro Database Schema
-- Target: PostgreSQL 14+
-- Features: UUID primary keys, foreign key constraints, indexes, timestamps

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    firebase_uid VARCHAR(128) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- 2. Refresh Tokens Table (Rotation & Revocation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_description TEXT NOT NULL,
    detailed_description TEXT,
    problem_statement TEXT,
    solution TEXT,
    target_users TEXT,
    category VARCHAR(100) DEFAULT 'general',
    event_name VARCHAR(255) NOT NULL,
    event_organizer VARCHAR(255),
    event_type VARCHAR(100),
    event_date VARCHAR(100),
    event_description TEXT,
    tech_frontend VARCHAR(255),
    tech_backend VARCHAR(255),
    tech_database VARCHAR(255),
    tech_ai VARCHAR(255),
    tech_apis VARCHAR(255),
    tech_hosting VARCHAR(255),
    tech_other TEXT,
    feedback_goal VARCHAR(100) DEFAULT 'General Feedback',
    authorized_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_event_name ON projects(event_name);

-- 4. Project Links Table
CREATE TABLE IF NOT EXISTS project_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL, -- live_website, github, demo_video, docs, presentation
    url TEXT NOT NULL,
    label VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_links_project_id ON project_links(project_id);

-- 5. Audit Jobs Table (For Background Worker Queue)
CREATE TABLE IF NOT EXISTS audit_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    stage VARCHAR(100) DEFAULT 'queued',
    worker_id VARCHAR(100),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    locked_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_jobs_status ON audit_jobs(status);
CREATE INDEX IF NOT EXISTS idx_audit_jobs_project_id ON audit_jobs(project_id);

-- 6. Audit Runs Table
CREATE TABLE IF NOT EXISTS audit_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    job_id UUID REFERENCES audit_jobs(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'running', -- running, completed, failed, partial
    stage VARCHAR(100) DEFAULT 'validating_url',
    target_url TEXT NOT NULL,
    overall_score INTEGER DEFAULT 0,
    technical_score INTEGER DEFAULT 0,
    security_score INTEGER DEFAULT 0,
    ux_score INTEGER DEFAULT 0,
    a11y_score INTEGER DEFAULT 0,
    perf_score INTEGER DEFAULT 0,
    summary TEXT,
    error_message TEXT,
    disclaimer TEXT DEFAULT 'This automated audit performs limited, non-destructive checks. It is not a substitute for a professional penetration test or comprehensive security assessment.',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_project_id ON audit_runs(project_id);

-- 7. Audit Findings Table
CREATE TABLE IF NOT EXISTS audit_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- Functional, UI, UX, Performance, Accessibility, Compatibility, Navigation, Forms, Content, Configuration, Security posture
    severity VARCHAR(50) NOT NULL, -- critical, high, medium, low, info
    confidence VARCHAR(50) NOT NULL, -- high, medium, low
    verified BOOLEAN DEFAULT TRUE,
    description TEXT NOT NULL,
    evidence TEXT NOT NULL,
    affected_url TEXT NOT NULL,
    recommended_fix TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'scanner', -- scanner, browser, ai
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_run_id ON audit_findings(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_project_id ON audit_findings(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_severity ON audit_findings(severity);

-- 8. Audit Evidence Table
CREATE TABLE IF NOT EXISTS audit_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_finding_id UUID NOT NULL REFERENCES audit_findings(id) ON DELETE CASCADE,
    evidence_type VARCHAR(100) NOT NULL, -- http_status, response_header, console_error, network_error, dom_snippet, responsive_viewport
    data JSONB,
    raw_snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_finding_id ON audit_evidence(audit_finding_id);

-- 9. Feedback Forms Table
CREATE TABLE IF NOT EXISTS feedback_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, closed
    allow_anonymous BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_forms_slug ON feedback_forms(slug);
CREATE INDEX IF NOT EXISTS idx_feedback_forms_project_id ON feedback_forms(project_id);

-- 10. Feedback Sections Table
CREATE TABLE IF NOT EXISTS feedback_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_form_id UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_sections_form_id ON feedback_sections(feedback_form_id);

-- 11. Feedback Questions Table
CREATE TABLE IF NOT EXISTS feedback_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_form_id UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
    section_id UUID REFERENCES feedback_sections(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    description TEXT,
    question_type VARCHAR(50) NOT NULL, -- rating, multiple_choice, checkbox, yes_no, likert, nps, short_text, long_text, emoji_rating
    is_required BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    min_label VARCHAR(100),
    max_label VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_questions_form_id ON feedback_questions(feedback_form_id);

-- 12. Feedback Options Table
CREATE TABLE IF NOT EXISTS feedback_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES feedback_questions(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_options_question_id ON feedback_options(question_id);

-- 13. Feedback Responses Table
CREATE TABLE IF NOT EXISTS feedback_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_form_id UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
    respondent_name VARCHAR(255),
    respondent_email VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT TRUE,
    ip_hash VARCHAR(64), -- SHA-256 salted hash for privacy-safe deduplication
    user_agent TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_responses_form_id ON feedback_responses(feedback_form_id);

-- 14. Response Answers Table
CREATE TABLE IF NOT EXISTS response_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_response_id UUID NOT NULL REFERENCES feedback_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES feedback_questions(id) ON DELETE CASCADE,
    numeric_value NUMERIC,
    text_value TEXT,
    selected_options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_response_answers_response_id ON response_answers(feedback_response_id);
CREATE INDEX IF NOT EXISTS idx_response_answers_question_id ON response_answers(question_id);

-- 15. Feedback Themes Table
CREATE TABLE IF NOT EXISTS feedback_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    feedback_form_id UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
    theme_title VARCHAR(255) NOT NULL,
    sentiment VARCHAR(50) NOT NULL, -- positive, negative, neutral
    occurrence_count INTEGER DEFAULT 1,
    severity VARCHAR(50), -- high, medium, low
    ai_summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_themes_project_id ON feedback_themes(project_id);

-- 16. AI Generations Table
CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    generation_type VARCHAR(100) NOT NULL, -- project_understanding, form_generation, response_analysis, correlation, recommendations
    model_used VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0,
    raw_output JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_project_id ON ai_generations(project_id);

-- 17. AI Analysis Table
CREATE TABLE IF NOT EXISTS ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    audit_run_id UUID REFERENCES audit_runs(id) ON DELETE SET NULL,
    executive_summary TEXT NOT NULL,
    sentiment_distribution JSONB NOT NULL,
    positive_themes JSONB,
    negative_themes JSONB,
    feature_requests JSONB,
    common_complaints JSONB,
    most_praised JSONB,
    user_satisfaction_score INTEGER DEFAULT 0,
    sample_size INTEGER DEFAULT 0,
    is_sample_size_limited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_project_id ON ai_analysis(project_id);

-- 18. Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    audit_finding_id UUID REFERENCES audit_findings(id) ON DELETE SET NULL,
    priority VARCHAR(10) NOT NULL, -- P0, P1, P2, P3
    title VARCHAR(255) NOT NULL,
    problem_statement TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    remediation_steps JSONB NOT NULL,
    rationale TEXT NOT NULL,
    correlated_feedback_count INTEGER DEFAULT 0,
    ease_of_fixing VARCHAR(50) DEFAULT 'Medium', -- Easy, Medium, Hard
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendations_project_id ON recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON recommendations(priority);

-- 19. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    feedback_form_id UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_project_id ON campaigns(project_id);

-- 20. Campaign Recipients Table
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);

-- 21. Audit Logs Table (Security Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
