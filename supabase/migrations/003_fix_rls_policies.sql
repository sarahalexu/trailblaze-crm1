-- TrailBlaze CRM — RLS Policy Fix
-- Run this in Supabase SQL Editor
-- Fixes the circular dependency in Row Level Security policies

-- ============================================
-- Step 1: Drop all existing policies
-- ============================================
DROP POLICY IF EXISTS org_isolation_users ON users;
DROP POLICY IF EXISTS org_isolation_accounts ON accounts;
DROP POLICY IF EXISTS org_isolation_deals ON deals;
DROP POLICY IF EXISTS org_isolation_contacts ON contacts;
DROP POLICY IF EXISTS org_isolation_interactions ON interactions;
DROP POLICY IF EXISTS org_isolation_health_history ON health_score_history;
DROP POLICY IF EXISTS org_isolation_pipelines ON pipelines;
DROP POLICY IF EXISTS org_isolation_stages ON pipeline_stages;
DROP POLICY IF EXISTS org_isolation_playbook_assign ON playbook_assignments;
DROP POLICY IF EXISTS org_isolation_notifications ON notifications;
DROP POLICY IF EXISTS org_isolation_tickets ON support_tickets;
DROP POLICY IF EXISTS org_isolation_audit ON audit_log;
DROP POLICY IF EXISTS org_isolation_wa_config ON whatsapp_config;
DROP POLICY IF EXISTS org_isolation_wa_messages ON whatsapp_messages;
DROP POLICY IF EXISTS playbooks_access ON playbooks;
DROP POLICY IF EXISTS kb_public_read ON knowledge_base_articles;
DROP POLICY IF EXISTS org_self_access ON organizations;

-- ============================================
-- Step 2: Create helper function (no circular dependency)
-- ============================================
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Step 3: Users table — special policy using auth.uid() directly
-- ============================================
-- Users can see their own record by auth_id
CREATE POLICY users_own_record ON users
  FOR SELECT USING (auth_id = auth.uid());

-- Users can see other users in their org
CREATE POLICY users_same_org ON users
  FOR SELECT USING (org_id = auth_user_org_id());

-- Users can update their own record
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- Admins can insert users in their org (for invites)
CREATE POLICY users_insert ON users
  FOR INSERT WITH CHECK (org_id = auth_user_org_id());

-- ============================================
-- Step 4: Organizations — users see their own org
-- ============================================
CREATE POLICY org_select ON organizations
  FOR SELECT USING (id = auth_user_org_id());

CREATE POLICY org_update ON organizations
  FOR UPDATE USING (id = auth_user_org_id());

-- ============================================
-- Step 5: All other tables — use the helper function
-- ============================================
CREATE POLICY accounts_org ON accounts FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY deals_org ON deals FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY contacts_org ON contacts FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY interactions_org ON interactions FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY health_history_org ON health_score_history FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY pipelines_org ON pipelines FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY stages_org ON pipeline_stages FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY playbook_assign_org ON playbook_assignments FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY notifications_org ON notifications FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY tickets_org ON support_tickets FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY audit_org ON audit_log FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY wa_config_org ON whatsapp_config FOR ALL USING (org_id = auth_user_org_id());
CREATE POLICY wa_messages_org ON whatsapp_messages FOR ALL USING (org_id = auth_user_org_id());

-- Playbook step progress — through assignment
CREATE POLICY step_progress_org ON playbook_step_progress FOR ALL
  USING (assignment_id IN (SELECT id FROM playbook_assignments WHERE org_id = auth_user_org_id()));

-- Ticket messages — through ticket
CREATE POLICY ticket_messages_org ON ticket_messages FOR ALL
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE org_id = auth_user_org_id()));

-- Playbooks — system defaults visible to everyone, org playbooks to their org
CREATE POLICY playbooks_read ON playbooks
  FOR SELECT USING (is_system_default = TRUE OR org_id = auth_user_org_id());

CREATE POLICY playbooks_write ON playbooks
  FOR INSERT WITH CHECK (org_id = auth_user_org_id());

CREATE POLICY playbooks_update ON playbooks
  FOR UPDATE USING (org_id = auth_user_org_id());

-- Playbook steps — readable if playbook is readable
CREATE POLICY playbook_steps_read ON playbook_steps
  FOR SELECT USING (
    playbook_id IN (
      SELECT id FROM playbooks WHERE is_system_default = TRUE OR org_id = auth_user_org_id()
    )
  );

-- Knowledge base — public read
CREATE POLICY kb_read ON knowledge_base_articles
  FOR SELECT USING (is_published = TRUE);
