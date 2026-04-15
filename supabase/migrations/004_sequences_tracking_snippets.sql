-- TrailBlaze CRM — Migration 004
-- Automated Follow-Up Sequences, Email Tracking, Snippets
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. SEQUENCES (the automation templates)
-- ============================================
CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(20) DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'stage_change', 'date_trigger')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  -- trigger_config examples:
  -- stage_change: {"pipeline_id": "uuid", "stage_id": "uuid"}
  -- date_trigger: {"field": "renewal_date", "days_before": 90}
  channel VARCHAR(20) DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'mixed')),
  sender_name VARCHAR(255), -- appears as "from" name
  sender_email VARCHAR(255), -- appears as "from" email
  max_steps INTEGER DEFAULT 5,
  exit_on_reply BOOLEAN DEFAULT TRUE,
  exit_on_meeting_booked BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  total_enrolled INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SEQUENCE STEPS (individual messages)
-- ============================================
CREATE TABLE sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0, -- days after previous step (0 = same day as enrollment for step 1)
  channel VARCHAR(20) DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp')),
  subject VARCHAR(255), -- email subject (supports tokens)
  message_template TEXT NOT NULL, -- supports {first_name}, {company_name}, {account_manager_name}, {meeting_link} etc
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, step_number)
);

-- ============================================
-- 3. SEQUENCE ENROLLMENTS (contacts in sequences)
-- ============================================
CREATE TABLE sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enrolled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  current_step INTEGER DEFAULT 0, -- 0 = not started, 1 = first step sent, etc
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'replied', 'converted', 'bounced', 'unsubscribed')),
  next_send_at TIMESTAMPTZ, -- when the next step should fire
  last_sent_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reply_detected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. SEQUENCE SEND LOG (every message sent)
-- ============================================
CREATE TABLE sequence_send_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,
  subject VARCHAR(255),
  content TEXT, -- the rendered message (tokens replaced)
  message_id VARCHAR(255), -- email provider message ID or WhatsApp message ID
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed')),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. EMAIL TRACKING (pixel-based open tracking)
-- ============================================
CREATE TABLE email_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tracking_id VARCHAR(64) UNIQUE NOT NULL, -- unique ID embedded in tracking pixel
  interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
  send_log_id UUID REFERENCES sequence_send_log(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  recipient_email VARCHAR(255),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  user_agent TEXT, -- browser/client info from open event
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. SNIPPETS (reusable text blocks)
-- ============================================
CREATE TABLE snippets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL, -- e.g. "QBR Agenda", "Check-in Template"
  shortcut VARCHAR(50), -- e.g. "/qbr", "/checkin" — quick insert trigger
  content TEXT NOT NULL, -- the template text, supports {first_name} etc
  category VARCHAR(50) DEFAULT 'general', -- general, follow_up, onboarding, renewal, meeting, escalation
  channel VARCHAR(20) DEFAULT 'any' CHECK (channel IN ('any', 'email', 'whatsapp', 'call_notes')),
  is_shared BOOLEAN DEFAULT TRUE, -- visible to all org members
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_sequences_org ON sequences(org_id, status);
CREATE INDEX idx_seq_steps_seq ON sequence_steps(sequence_id, step_number);
CREATE INDEX idx_enrollments_next_send ON sequence_enrollments(next_send_at, status) WHERE status = 'active';
CREATE INDEX idx_enrollments_org ON sequence_enrollments(org_id, status);
CREATE INDEX idx_enrollments_contact ON sequence_enrollments(contact_id, status);
CREATE INDEX idx_send_log_enrollment ON sequence_send_log(enrollment_id, sent_at DESC);
CREATE INDEX idx_email_tracking_id ON email_tracking(tracking_id);
CREATE INDEX idx_email_tracking_org ON email_tracking(org_id, sent_at DESC);
CREATE INDEX idx_snippets_org ON snippets(org_id, category);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY sequences_org ON sequences FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY seq_steps_org ON sequence_steps FOR ALL USING (
  sequence_id IN (SELECT id FROM sequences WHERE org_id = auth_user_org_id())
);
CREATE POLICY enrollments_org ON sequence_enrollments FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY send_log_org ON sequence_send_log FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY tracking_org ON email_tracking FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY snippets_org ON snippets FOR ALL USING (org_id = auth_user_org_id());

-- ============================================
-- AUTO-UPDATE TRIGGERS
-- ============================================
CREATE TRIGGER trigger_updated_at_sequences BEFORE UPDATE ON sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_updated_at_snippets BEFORE UPDATE ON snippets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED: Default snippets for new orgs
-- ============================================
-- These would be inserted via the setup_new_organization function
-- For now, insert system-level snippets

INSERT INTO snippets (id, org_id, title, shortcut, content, category, channel, is_shared, created_by_user_id) VALUES
(uuid_generate_v4(), NULL, 'Quick check-in', '/checkin',
'Hi {first_name}, hope you''re doing well! Just wanted to check in and see how things are going at {company_name}. Anything I can help with?', 'follow_up', 'whatsapp', TRUE, NULL),

(uuid_generate_v4(), NULL, 'QBR agenda', '/qbr',
'Hi {first_name},

Looking forward to our quarterly review. Here''s what I''d like to cover:

1. Key wins and milestones from last quarter
2. Current challenges or blockers
3. Your priorities for next quarter
4. How we can better support {company_name}
5. Contract and renewal discussion

Please feel free to add anything you''d like to discuss. See you on [date].

Best,
{account_manager_name}', 'meeting', 'email', TRUE, NULL),

(uuid_generate_v4(), NULL, 'Thank you after meeting', '/thanks',
'Hi {first_name}, thank you for taking the time to meet today. Here''s a quick summary of what we discussed and the next steps we agreed on:

[Summary here]

I''ll follow up on these by [date]. Let me know if I missed anything.

Best,
{account_manager_name}', 'follow_up', 'email', TRUE, NULL),

(uuid_generate_v4(), NULL, 'Renewal intro', '/renew',
'Hi {first_name}, your contract with us is coming up for renewal in [X] days. I wanted to get ahead of it and schedule a quick chat to review how things have been going and discuss next steps. Would any time next week work? {meeting_link}', 'renewal', 'email', TRUE, NULL),

(uuid_generate_v4(), NULL, 'Gentle nudge', '/nudge',
'Hey {first_name}, just a gentle follow-up on my last message. I know things get busy — whenever you have a moment, I''d love to connect. No rush at all.', 'follow_up', 'whatsapp', TRUE, NULL);
