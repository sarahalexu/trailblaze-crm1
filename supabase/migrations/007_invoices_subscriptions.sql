-- TrailBlaze CRM — Migration 007
-- Invoices, subscription tracking, and downgrade support
-- Run in Supabase SQL Editor

-- Add subscription fields to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'past_due', 'cancelled', 'trialing'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS paystack_customer_code VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS paystack_subscription_code VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_payment_amount DECIMAL(12,2);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  plan_tier VARCHAR(20) NOT NULL,
  billing_cycle VARCHAR(10) DEFAULT 'monthly',
  user_count INTEGER DEFAULT 1,
  paystack_reference VARCHAR(255),
  status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  customer_email VARCHAR(255),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_org ON invoices FOR SELECT USING (org_id = auth_user_org_id());
CREATE INDEX idx_invoices_org ON invoices(org_id, created_at DESC);

-- Downgrade requests table (for tracking requested downgrades)
CREATE TABLE IF NOT EXISTS downgrade_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES users(id),
  from_plan VARCHAR(20) NOT NULL,
  to_plan VARCHAR(20) NOT NULL DEFAULT 'starter',
  reason TEXT,
  effective_at TIMESTAMPTZ NOT NULL, -- downgrade happens at end of billing cycle
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE downgrade_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY downgrade_org ON downgrade_requests FOR ALL USING (org_id = auth_user_org_id());
