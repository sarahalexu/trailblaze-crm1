-- TrailBlaze CRM — Migration 006
-- Access Codes System for Beta Testing & Promotions
-- Run in Supabase SQL Editor

-- ============================================
-- ACCESS CODES TABLE
-- ============================================
CREATE TABLE access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL, -- e.g. "BETA-LAUNCH-2026", "FOUNDER50"
  plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('starter', 'growth', 'scale', 'enterprise', 'beta')),
  description TEXT, -- internal note: "Beta tester batch 1", "AIC cohort discount"
  
  -- Usage limits
  max_uses INTEGER DEFAULT 1, -- how many orgs can use this code (1 = single-use, 100 = bulk)
  times_used INTEGER DEFAULT 0,
  
  -- Time limits
  duration_days INTEGER DEFAULT 60, -- how long the unlocked plan lasts after redemption
  starts_at TIMESTAMPTZ DEFAULT NOW(), -- code can't be used before this date
  expires_at TIMESTAMPTZ, -- code can't be used after this date (null = no code expiry)
  
  -- Metadata
  created_by VARCHAR(255) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CODE REDEMPTIONS (who used which code)
-- ============================================
CREATE TABLE code_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_id UUID NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  redeemed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  plan_granted VARCHAR(20) NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  access_expires_at TIMESTAMPTZ NOT NULL, -- when this org's access reverts to starter
  is_expired BOOLEAN DEFAULT FALSE, -- set to TRUE by cron when access_expires_at passes
  reverted_at TIMESTAMPTZ, -- when the plan was actually downgraded
  UNIQUE(code_id, org_id) -- one org can only use each code once
);

-- ============================================
-- ADD FIELDS TO ORGANIZATIONS
-- ============================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS access_code_id UUID REFERENCES access_codes(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS previous_plan_tier VARCHAR(20);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_access_codes_code ON access_codes(code);
CREATE INDEX idx_access_codes_active ON access_codes(is_active, expires_at);
CREATE INDEX idx_redemptions_org ON code_redemptions(org_id);
CREATE INDEX idx_redemptions_expiry ON code_redemptions(access_expires_at, is_expired) WHERE is_expired = FALSE;
CREATE INDEX idx_orgs_access_expiry ON organizations(access_expires_at) WHERE access_expires_at IS NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_redemptions ENABLE ROW LEVEL SECURITY;

-- Only super admin can manage codes
CREATE POLICY codes_admin ON access_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND email = 'sarah@trailblazeafrica.com')
);

-- Users can see their own redemptions
CREATE POLICY redemptions_own ON code_redemptions FOR SELECT USING (org_id = auth_user_org_id());
-- Admin can see all
CREATE POLICY redemptions_admin ON code_redemptions FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND email = 'sarah@trailblazeafrica.com')
);

-- ============================================
-- SEED: Create initial beta access codes
-- ============================================
INSERT INTO access_codes (code, plan_tier, description, max_uses, duration_days, expires_at) VALUES
('BETA-LAUNCH-2026', 'beta', 'Main beta launch code — all features unlocked', 50, 60, '2026-08-31 23:59:59+01'),
('BETA-VIP', 'beta', 'VIP beta — extended 90-day access', 10, 90, '2026-08-31 23:59:59+01'),
('FOUNDER50', 'growth', 'Founding member — Growth plan for 180 days', 30, 180, '2026-12-31 23:59:59+01'),
('AIC-COHORT6', 'beta', 'AIC Bootcamp Cohort 6 members', 20, 60, '2026-09-30 23:59:59+01'),
('AIESEC-2026', 'growth', 'AIESEC partnership — Growth plan for 90 days', 25, 90, '2026-12-31 23:59:59+01');
