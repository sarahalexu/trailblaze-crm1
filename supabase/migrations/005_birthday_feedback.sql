-- TrailBlaze CRM — Migration 005
-- Birthday field, feedback table, rate limit tracking
-- Run in Supabase SQL Editor

-- Add birthday to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add birthday to contacts (for client birthday reminders)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Feedback/bug report table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(20) DEFAULT 'bug' CHECK (type IN ('bug', 'feature', 'feedback', 'question')),
  page VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  browser_info TEXT,
  screenshot_url TEXT,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_org ON feedback FOR ALL USING (
  org_id = auth_user_org_id() OR
  -- Super admin can see all
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND email = 'sarah@trailblazeafrica.com')
);

CREATE INDEX idx_feedback_status ON feedback(status, created_at DESC);
CREATE INDEX idx_users_birthday ON users(date_of_birth);
CREATE INDEX idx_contacts_birthday ON contacts(date_of_birth);
