-- TrailBlaze CRM — Complete Database Schema
-- Migration 001: Initial schema
-- Stack: Supabase (PostgreSQL) + Next.js + Google Cloud

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. ORGANIZATIONS (multi-tenancy root)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  industry VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Nigeria',
  currency VARCHAR(3) DEFAULT 'NGN',
  plan_tier VARCHAR(20) DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'scale', 'enterprise', 'beta')),
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'cancelled', 'beta')),
  max_users INTEGER DEFAULT 1,
  max_accounts INTEGER DEFAULT 15,
  logo_url TEXT,
  website VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auth_id UUID UNIQUE, -- links to Supabase Auth
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'account_manager' CHECK (role IN ('admin', 'account_manager', 'viewer')),
  avatar_url TEXT,
  phone_number VARCHAR(20),
  whatsapp_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  notification_preferences JSONB DEFAULT '{"in_app": true, "email": true, "whatsapp_critical": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- ============================================
-- 3. PIPELINES
-- ============================================
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  pipeline_type VARCHAR(20) DEFAULT 'retention' CHECK (pipeline_type IN ('retention', 'sales')),
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PIPELINE STAGES
-- ============================================
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  color VARCHAR(7) DEFAULT '#7e7e7e', -- hex color
  auto_actions JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT FALSE, -- system stages can't be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ACCOUNTS (the core CRM object)
-- ============================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  website VARCHAR(255),
  annual_revenue DECIMAL(15,2),
  contract_value_monthly DECIMAL(15,2),
  contract_value_annual DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'NGN',
  contract_start_date DATE,
  contract_end_date DATE,
  renewal_date DATE,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  -- KEEP Framework scores
  health_score_know SMALLINT DEFAULT 0 CHECK (health_score_know BETWEEN 0 AND 5),
  health_score_engage SMALLINT DEFAULT 0 CHECK (health_score_engage BETWEEN 0 AND 5),
  health_score_exceed SMALLINT DEFAULT 0 CHECK (health_score_exceed BETWEEN 0 AND 5),
  health_score_prevent SMALLINT DEFAULT 0 CHECK (health_score_prevent BETWEEN 0 AND 5),
  health_score_total SMALLINT GENERATED ALWAYS AS (health_score_know + health_score_engage + health_score_exceed + health_score_prevent) STORED,
  health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'at_risk', 'critical')),
  churn_risk_percentage DECIMAL(5,2), -- AI-calculated, Scale tier
  status VARCHAR(20) DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'paused', 'churned')),
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. DEALS (sales pipeline objects)
-- ============================================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  value DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'NGN',
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  contact_id UUID, -- will reference contacts table
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- linked after won
  probability SMALLINT DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  actual_close_date DATE,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  loss_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. CONTACTS
-- ============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone_number VARCHAR(20),
  whatsapp_number VARCHAR(20),
  job_title VARCHAR(100),
  role_type VARCHAR(20) DEFAULT 'end_user' CHECK (role_type IN ('decision_maker', 'influencer', 'champion', 'end_user', 'billing')),
  is_primary BOOLEAN DEFAULT FALSE,
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for deals.contact_id
ALTER TABLE deals ADD CONSTRAINT deals_contact_fk FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- ============================================
-- 8. INTERACTIONS
-- ============================================
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'email', 'call', 'meeting', 'sms', 'in_person', 'other')),
  direction VARCHAR(10) DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject VARCHAR(255),
  content TEXT,
  whatsapp_message_id VARCHAR(255), -- WhatsApp Cloud API message ID
  sentiment VARCHAR(10) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. HEALTH SCORE HISTORY
-- ============================================
CREATE TABLE health_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scored_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  score_know SMALLINT CHECK (score_know BETWEEN 0 AND 5),
  score_engage SMALLINT CHECK (score_engage BETWEEN 0 AND 5),
  score_exceed SMALLINT CHECK (score_exceed BETWEEN 0 AND 5),
  score_prevent SMALLINT CHECK (score_prevent BETWEEN 0 AND 5),
  score_total SMALLINT GENERATED ALWAYS AS (score_know + score_engage + score_exceed + score_prevent) STORED,
  scoring_method VARCHAR(20) DEFAULT 'manual' CHECK (scoring_method IN ('manual', 'ai_suggested', 'hybrid')),
  notes TEXT,
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. PLAYBOOKS
-- ============================================
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for system defaults
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(20) CHECK (category IN ('onboarding', 'review', 'recovery', 'expansion', 'renewal', 'custom')),
  is_system_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. PLAYBOOK STEPS
-- ============================================
CREATE TABLE playbook_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  action_type VARCHAR(20) CHECK (action_type IN ('task', 'message', 'meeting', 'review', 'custom')),
  suggested_timeline_days INTEGER, -- do this by day X
  message_template TEXT, -- pre-written template for message steps
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. PLAYBOOK ASSIGNMENTS
-- ============================================
CREATE TABLE playbook_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. PLAYBOOK STEP PROGRESS
-- ============================================
CREATE TABLE playbook_step_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES playbook_assignments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES playbook_steps(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- ============================================
-- 14. NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('overdue_followup', 'health_change', 'renewal_approaching', 'ai_alert', 'team_mention', 'deal_won', 'deal_lost', 'system')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  reference_type VARCHAR(30), -- account, interaction, playbook, deal, pipeline
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  delivery_channel VARCHAR(20) DEFAULT 'in_app' CHECK (delivery_channel IN ('in_app', 'email', 'whatsapp')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. SUPPORT TICKETS
-- ============================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(20) CHECK (category IN ('billing', 'technical', 'feature_request', 'general')),
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  response_sla_hours INTEGER DEFAULT 24,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 16. TICKET MESSAGES
-- ============================================
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) CHECK (sender_type IN ('user', 'support_agent')),
  sender_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. KNOWLEDGE BASE ARTICLES
-- ============================================
CREATE TABLE knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(30) CHECK (category IN ('getting_started', 'accounts', 'whatsapp', 'playbooks', 'reporting', 'billing', 'pipelines', 'integrations')),
  tags JSONB DEFAULT '[]'::jsonb,
  related_feature_screen VARCHAR(50), -- contextual help mapping
  is_published BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 18. AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'exported', 'login', 'logout', 'scored', 'moved_stage')),
  entity_type VARCHAR(30) NOT NULL,
  entity_id UUID,
  changes JSONB, -- {field: {old: x, new: y}}
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 19. WHATSAPP CONFIGURATION
-- ============================================
CREATE TABLE whatsapp_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_account_id VARCHAR(255),
  phone_number_id VARCHAR(255),
  display_phone_number VARCHAR(20),
  access_token TEXT, -- encrypted at application level
  webhook_verify_token TEXT, -- encrypted at application level
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  monthly_message_count INTEGER DEFAULT 0,
  monthly_message_limit INTEGER DEFAULT 0, -- based on plan
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 20. WHATSAPP MESSAGES (detailed log)
-- ============================================
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  whatsapp_message_id VARCHAR(255), -- Meta's message ID
  direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'image', 'document', 'audio', 'video')),
  content TEXT,
  template_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES for performance
-- ============================================

-- Accounts
CREATE INDEX idx_accounts_org_status ON accounts(org_id, health_status);
CREATE INDEX idx_accounts_org_assigned ON accounts(org_id, assigned_user_id);
CREATE INDEX idx_accounts_org_renewal ON accounts(org_id, renewal_date);
CREATE INDEX idx_accounts_org_stage ON accounts(org_id, stage_id);
CREATE INDEX idx_accounts_health_total ON accounts(org_id, health_score_total);

-- Deals
CREATE INDEX idx_deals_org_stage ON deals(org_id, stage_id);
CREATE INDEX idx_deals_org_status ON deals(org_id, status);
CREATE INDEX idx_deals_org_assigned ON deals(org_id, assigned_user_id);

-- Interactions
CREATE INDEX idx_interactions_account ON interactions(account_id, created_at DESC);
CREATE INDEX idx_interactions_org_channel ON interactions(org_id, channel);
CREATE INDEX idx_interactions_followup ON interactions(org_id, follow_up_required, follow_up_date) WHERE follow_up_required = TRUE;

-- Health score history
CREATE INDEX idx_health_history_account ON health_score_history(account_id, scored_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Audit log
CREATE INDEX idx_audit_org_created ON audit_log(org_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- WhatsApp messages
CREATE INDEX idx_wa_messages_org ON whatsapp_messages(org_id, sent_at DESC);
CREATE INDEX idx_wa_messages_contact ON whatsapp_messages(contact_id, sent_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update health_status based on score
CREATE OR REPLACE FUNCTION update_health_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.health_score_total >= 15 THEN
    NEW.health_status := 'healthy';
  ELSIF NEW.health_score_total >= 10 THEN
    NEW.health_status := 'at_risk';
  ELSE
    NEW.health_status := 'critical';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_health_status
BEFORE INSERT OR UPDATE OF health_score_know, health_score_engage, health_score_exceed, health_score_prevent
ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_health_status();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_updated_at_organizations BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_updated_at_accounts BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_updated_at_pipelines BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_updated_at_deals BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update last_interaction_at on account when new interaction is logged
CREATE OR REPLACE FUNCTION update_account_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE accounts SET last_interaction_at = NEW.created_at WHERE id = NEW.account_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_account_last_interaction
AFTER INSERT ON interactions
FOR EACH ROW
EXECUTE FUNCTION update_account_last_interaction();

-- Auto-create retention account when deal is won
CREATE OR REPLACE FUNCTION handle_deal_won()
RETURNS TRIGGER AS $$
DECLARE
  retention_pipeline_id UUID;
  onboarding_stage_id UUID;
  new_account_id UUID;
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') THEN
    -- Find default retention pipeline
    SELECT id INTO retention_pipeline_id FROM pipelines
    WHERE org_id = NEW.org_id AND pipeline_type = 'retention' AND is_default = TRUE LIMIT 1;

    IF retention_pipeline_id IS NOT NULL THEN
      -- Find onboarding stage
      SELECT id INTO onboarding_stage_id FROM pipeline_stages
      WHERE pipeline_id = retention_pipeline_id AND sort_order = 1 LIMIT 1;

      -- Create account from deal
      INSERT INTO accounts (org_id, name, contract_value_annual, currency, assigned_user_id, pipeline_id, stage_id, status)
      VALUES (NEW.org_id, NEW.name, NEW.value, NEW.currency, NEW.assigned_user_id, retention_pipeline_id, onboarding_stage_id, 'onboarding')
      RETURNING id INTO new_account_id;

      -- Link deal to new account
      UPDATE deals SET account_id = new_account_id, actual_close_date = NOW() WHERE id = NEW.id;

      -- Move contact to new account if exists
      IF NEW.contact_id IS NOT NULL THEN
        UPDATE contacts SET account_id = new_account_id WHERE id = NEW.contact_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deal_won
AFTER UPDATE OF status ON deals
FOR EACH ROW
EXECUTE FUNCTION handle_deal_won();

-- ============================================
-- SEED DATA: System playbooks
-- ============================================

-- New Client Onboarding Playbook
INSERT INTO playbooks (id, org_id, name, description, category, is_system_default) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'New client onboarding', 'First 30 days checklist for new accounts. Build the foundation for a long-term relationship.', 'onboarding', TRUE);

INSERT INTO playbook_steps (playbook_id, step_number, title, description, action_type, suggested_timeline_days, is_required) VALUES
('00000000-0000-0000-0000-000000000001', 1, 'Send welcome message', 'Introduce yourself and the team. Set expectations for the partnership.', 'message', 1, TRUE),
('00000000-0000-0000-0000-000000000001', 2, 'Schedule kickoff call', 'Align on goals, timelines, deliverables, and communication preferences.', 'meeting', 3, TRUE),
('00000000-0000-0000-0000-000000000001', 3, 'Map stakeholders', 'Identify all key contacts: decision-maker, champion, influencer, billing.', 'task', 5, TRUE),
('00000000-0000-0000-0000-000000000001', 4, 'Complete KEEP assessment', 'Run the first health score assessment across all four dimensions.', 'review', 7, TRUE),
('00000000-0000-0000-0000-000000000001', 5, 'Deliver first value', 'Execute on the first quick win to build momentum and trust.', 'task', 14, TRUE),
('00000000-0000-0000-0000-000000000001', 6, '30-day check-in', 'Review progress, gather feedback, adjust approach if needed.', 'meeting', 30, TRUE);

-- Quarterly Business Review Playbook
INSERT INTO playbooks (id, org_id, name, description, category, is_system_default) VALUES
('00000000-0000-0000-0000-000000000002', NULL, 'Quarterly business review', 'Structured review to assess relationship health, celebrate wins, and plan ahead.', 'review', TRUE);

INSERT INTO playbook_steps (playbook_id, step_number, title, description, action_type, suggested_timeline_days, is_required) VALUES
('00000000-0000-0000-0000-000000000002', 1, 'Prepare health score review', 'Pull current KEEP scores and compare to last quarter. Note trends.', 'review', -7, TRUE),
('00000000-0000-0000-0000-000000000002', 2, 'Compile achievement highlights', 'List key wins, milestones met, and value delivered this quarter.', 'task', -5, TRUE),
('00000000-0000-0000-0000-000000000002', 3, 'Draft agenda and send to client', 'Share the QBR agenda so the client can prepare their input.', 'message', -3, TRUE),
('00000000-0000-0000-0000-000000000002', 4, 'Conduct QBR meeting', 'Walk through achievements, health scores, challenges, and next quarter goals.', 'meeting', 0, TRUE),
('00000000-0000-0000-0000-000000000002', 5, 'Send summary and action items', 'Document outcomes and agreed next steps within 24 hours.', 'message', 1, TRUE);

-- At-Risk Account Recovery Playbook
INSERT INTO playbooks (id, org_id, name, description, category, is_system_default) VALUES
('00000000-0000-0000-0000-000000000003', NULL, 'At-risk account recovery', 'Intervention workflow when an account health score drops below 10.', 'recovery', TRUE);

INSERT INTO playbook_steps (playbook_id, step_number, title, description, action_type, suggested_timeline_days, is_required) VALUES
('00000000-0000-0000-0000-000000000003', 1, 'Diagnose the risk', 'Review KEEP scores to identify which dimension dropped. Check interaction history for patterns.', 'review', 0, TRUE),
('00000000-0000-0000-0000-000000000003', 2, 'Internal escalation', 'Brief your team or leadership on the situation and agree on recovery approach.', 'task', 1, TRUE),
('00000000-0000-0000-0000-000000000003', 3, 'Reach out to client', 'Send a check-in message. Be direct but empathetic. Acknowledge the gap.', 'message', 2, TRUE),
('00000000-0000-0000-0000-000000000003', 4, 'Recovery conversation', 'Deep-dive meeting to understand what went wrong and what the client needs.', 'meeting', 5, TRUE),
('00000000-0000-0000-0000-000000000003', 5, 'Execute recovery actions', 'Deliver on the specific commitments made during the recovery conversation.', 'task', 14, TRUE),
('00000000-0000-0000-0000-000000000003', 6, 'Re-assess health score', 'Score the account again. If improved, move back to Active. If not, escalate.', 'review', 21, TRUE);

-- Upsell & Expansion Playbook
INSERT INTO playbooks (id, org_id, name, description, category, is_system_default) VALUES
('00000000-0000-0000-0000-000000000004', NULL, 'Upsell and expansion', 'Identify and close expansion opportunities within existing accounts.', 'expansion', TRUE);

INSERT INTO playbook_steps (playbook_id, step_number, title, description, action_type, suggested_timeline_days, is_required) VALUES
('00000000-0000-0000-0000-000000000004', 1, 'Identify expansion signals', 'Look for growth indicators: new team members, new projects, budget season, expressed interest.', 'review', 0, TRUE),
('00000000-0000-0000-0000-000000000004', 2, 'Build the business case', 'Calculate the ROI of expansion. Frame it in terms of the client business outcomes.', 'task', 3, TRUE),
('00000000-0000-0000-0000-000000000004', 3, 'Engage the champion', 'Present the opportunity to your internal champion first. Get their buy-in.', 'message', 5, TRUE),
('00000000-0000-0000-0000-000000000004', 4, 'Present to decision-maker', 'Formal presentation of the expansion proposal with clear outcomes and pricing.', 'meeting', 10, TRUE),
('00000000-0000-0000-0000-000000000004', 5, 'Close the expansion', 'Handle objections, negotiate terms, and secure the expansion agreement.', 'task', 20, TRUE);

-- Renewal Management Playbook
INSERT INTO playbooks (id, org_id, name, description, category, is_system_default) VALUES
('00000000-0000-0000-0000-000000000005', NULL, 'Renewal management', '90-day workflow to ensure smooth contract renewals.', 'renewal', TRUE);

INSERT INTO playbook_steps (playbook_id, step_number, title, description, action_type, suggested_timeline_days, is_required) VALUES
('00000000-0000-0000-0000-000000000005', 1, '90-day health check', 'Review KEEP score and interaction history. Flag any concerns early.', 'review', -90, TRUE),
('00000000-0000-0000-0000-000000000005', 2, '60-day value recap', 'Send the client a summary of value delivered. Reinforce the ROI before renewal discussions.', 'message', -60, TRUE),
('00000000-0000-0000-0000-000000000005', 3, '45-day renewal conversation', 'Initiate the renewal discussion. Gauge satisfaction and address concerns.', 'meeting', -45, TRUE),
('00000000-0000-0000-0000-000000000005', 4, '30-day proposal', 'Send the renewal proposal with terms. Include any expansion options.', 'message', -30, TRUE),
('00000000-0000-0000-0000-000000000005', 5, '14-day follow-up', 'Check in on the proposal. Handle objections and negotiate if needed.', 'message', -14, TRUE),
('00000000-0000-0000-0000-000000000005', 6, 'Secure renewal', 'Get the signed agreement and confirm next period details.', 'task', -7, TRUE);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_step_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see data from their own organization
CREATE POLICY org_isolation_users ON users FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_accounts ON accounts FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_deals ON deals FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_contacts ON contacts FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_interactions ON interactions FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_health_history ON health_score_history FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_pipelines ON pipelines FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_stages ON pipeline_stages FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_playbook_assign ON playbook_assignments FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_notifications ON notifications FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_tickets ON support_tickets FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_audit ON audit_log FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_wa_config ON whatsapp_config FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY org_isolation_wa_messages ON whatsapp_messages FOR ALL USING (org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid()));

-- Playbooks: users can see system defaults + their own org's playbooks
CREATE POLICY playbooks_access ON playbooks FOR SELECT USING (
  is_system_default = TRUE OR org_id = (SELECT org_id FROM users WHERE auth_id = auth.uid())
);

-- Knowledge base: public read access
CREATE POLICY kb_public_read ON knowledge_base_articles FOR SELECT USING (is_published = TRUE);

-- Organizations: users can see their own org
CREATE POLICY org_self_access ON organizations FOR ALL USING (
  id = (SELECT org_id FROM users WHERE auth_id = auth.uid())
);
