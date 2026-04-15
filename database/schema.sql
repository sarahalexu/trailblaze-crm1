-- ============================================
-- TRAILBLAZE CRM — DATABASE SCHEMA
-- Cloud-based, AI-powered Account Management Platform
-- Built for African businesses
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ORGANIZATIONS (Multi-tenancy root)
-- ============================================
CREATE TABLE organizations (
    org_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nigeria',
    currency VARCHAR(3) DEFAULT 'NGN',
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'beta' 
        CHECK (plan_tier IN ('starter', 'growth', 'scale', 'enterprise', 'beta')),
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (subscription_status IN ('active', 'trial', 'cancelled', 'past_due', 'beta')),
    max_users INT NOT NULL DEFAULT 20,
    max_accounts INT NOT NULL DEFAULT 500,
    logo_url TEXT,
    website VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. USERS
-- ============================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'account_manager'
        CHECK (role IN ('admin', 'account_manager', 'viewer')),
    avatar_url TEXT,
    phone_number VARCHAR(20),
    whatsapp_number VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    notification_preferences JSONB NOT NULL DEFAULT '{
        "in_app": true,
        "email": true,
        "whatsapp_critical": false,
        "overdue_followups": true,
        "health_changes": true,
        "renewal_approaching": true,
        "ai_alerts": true,
        "team_mentions": true
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 3. PIPELINES
-- ============================================
CREATE TABLE pipelines (
    pipeline_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    pipeline_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pipelines_org ON pipelines(org_id);

-- ============================================
-- 4. PIPELINE STAGES
-- ============================================
CREATE TABLE pipeline_stages (
    stage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(pipeline_id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    stage_color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    auto_actions JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stages_pipeline ON pipeline_stages(pipeline_id);
CREATE INDEX idx_stages_org ON pipeline_stages(org_id);

-- ============================================
-- 5. ACCOUNTS (Core CRM object)
-- ============================================
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    annual_revenue DECIMAL(15, 2),
    contract_value_monthly DECIMAL(15, 2),
    contract_value_annual DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'NGN',
    contract_start_date DATE,
    contract_end_date DATE,
    renewal_date DATE,
    assigned_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    pipeline_id UUID REFERENCES pipelines(pipeline_id) ON DELETE SET NULL,
    stage_id UUID REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
    
    -- KEEP Framework Health Scores
    health_score_total SMALLINT DEFAULT 0 CHECK (health_score_total >= 0 AND health_score_total <= 20),
    health_score_know SMALLINT DEFAULT 0 CHECK (health_score_know >= 0 AND health_score_know <= 5),
    health_score_engage SMALLINT DEFAULT 0 CHECK (health_score_engage >= 0 AND health_score_engage <= 5),
    health_score_exceed SMALLINT DEFAULT 0 CHECK (health_score_exceed >= 0 AND health_score_exceed <= 5),
    health_score_prevent SMALLINT DEFAULT 0 CHECK (health_score_prevent >= 0 AND health_score_prevent <= 5),
    health_status VARCHAR(20) NOT NULL DEFAULT 'healthy'
        CHECK (health_status IN ('healthy', 'at_risk', 'critical')),
    
    churn_risk_percentage DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'onboarding'
        CHECK (status IN ('onboarding', 'active', 'paused', 'churned')),
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    last_interaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_org ON accounts(org_id);
CREATE INDEX idx_accounts_org_health ON accounts(org_id, health_status);
CREATE INDEX idx_accounts_org_assigned ON accounts(org_id, assigned_user_id);
CREATE INDEX idx_accounts_org_renewal ON accounts(org_id, renewal_date);
CREATE INDEX idx_accounts_org_status ON accounts(org_id, status);
CREATE INDEX idx_accounts_stage ON accounts(stage_id);

-- ============================================
-- 6. CONTACTS
-- ============================================
CREATE TABLE contacts (
    contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(20),
    whatsapp_number VARCHAR(20),
    job_title VARCHAR(150),
    role_type VARCHAR(20) DEFAULT 'end_user'
        CHECK (role_type IN ('decision_maker', 'influencer', 'champion', 'end_user', 'billing')),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    last_contacted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_contacts_org ON contacts(org_id);

-- ============================================
-- 7. INTERACTIONS
-- ============================================
CREATE TABLE interactions (
    interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(contact_id) ON DELETE SET NULL,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('whatsapp', 'email', 'call', 'meeting', 'sms', 'in_person', 'other')),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    subject VARCHAR(255),
    content TEXT,
    whatsapp_message_id VARCHAR(255),
    sentiment VARCHAR(10) DEFAULT 'neutral'
        CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_account ON interactions(account_id, created_at DESC);
CREATE INDEX idx_interactions_org_channel ON interactions(org_id, channel);
CREATE INDEX idx_interactions_followup ON interactions(follow_up_required, follow_up_date) 
    WHERE follow_up_required = TRUE;

-- ============================================
-- 8. HEALTH SCORE HISTORY
-- ============================================
CREATE TABLE health_score_history (
    score_history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    scored_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    score_know SMALLINT NOT NULL CHECK (score_know >= 0 AND score_know <= 5),
    score_engage SMALLINT NOT NULL CHECK (score_engage >= 0 AND score_engage <= 5),
    score_exceed SMALLINT NOT NULL CHECK (score_exceed >= 0 AND score_exceed <= 5),
    score_prevent SMALLINT NOT NULL CHECK (score_prevent >= 0 AND score_prevent <= 5),
    score_total SMALLINT NOT NULL CHECK (score_total >= 0 AND score_total <= 20),
    scoring_method VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (scoring_method IN ('manual', 'ai_suggested', 'hybrid')),
    notes TEXT,
    scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_history_account ON health_score_history(account_id, scored_at DESC);

-- ============================================
-- 9. PLAYBOOKS
-- ============================================
CREATE TABLE playbooks (
    playbook_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
    playbook_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL
        CHECK (category IN ('onboarding', 'review', 'recovery', 'expansion', 'renewal', 'custom')),
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbooks_org ON playbooks(org_id);

-- ============================================
-- 10. PLAYBOOK STEPS
-- ============================================
CREATE TABLE playbook_steps (
    step_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID NOT NULL REFERENCES playbooks(playbook_id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    action_type VARCHAR(20) NOT NULL
        CHECK (action_type IN ('task', 'message', 'meeting', 'review', 'custom')),
    suggested_timeline_days INT,
    message_template TEXT,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbook_steps ON playbook_steps(playbook_id, step_number);

-- ============================================
-- 11. PLAYBOOK ASSIGNMENTS
-- ============================================
CREATE TABLE playbook_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID NOT NULL REFERENCES playbooks(playbook_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    assigned_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbook_assignments_account ON playbook_assignments(account_id);

-- ============================================
-- 12. PLAYBOOK STEP PROGRESS
-- ============================================
CREATE TABLE playbook_step_progress (
    progress_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES playbook_assignments(assignment_id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES playbook_steps(step_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX idx_step_progress_assignment ON playbook_step_progress(assignment_id);

-- ============================================
-- 13. NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL
        CHECK (type IN ('overdue_followup', 'health_change', 'renewal_approaching', 
                        'ai_alert', 'team_mention', 'system', 'playbook_reminder',
                        'account_stage_change', 'welcome')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT