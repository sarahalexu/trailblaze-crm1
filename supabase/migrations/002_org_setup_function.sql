-- TrailBlaze CRM — Organization Setup Function
-- Called when a new organization is created to seed default data

CREATE OR REPLACE FUNCTION setup_new_organization(
  p_org_id UUID,
  p_plan_tier VARCHAR DEFAULT 'beta'
)
RETURNS VOID AS $$
DECLARE
  retention_pipeline_id UUID;
  sales_pipeline_id UUID;
  plan_limits JSONB;
BEGIN
  -- Set plan limits based on tier
  CASE p_plan_tier
    WHEN 'starter' THEN plan_limits := '{"max_users": 1, "max_accounts": 15, "wa_messages": 0, "pipelines_retention": 1, "pipelines_sales": 1}'::jsonb;
    WHEN 'growth' THEN plan_limits := '{"max_users": 10, "max_accounts": 500, "wa_messages": 1000, "pipelines_retention": 3, "pipelines_sales": 2}'::jsonb;
    WHEN 'scale' THEN plan_limits := '{"max_users": 50, "max_accounts": 99999, "wa_messages": 99999, "pipelines_retention": 99, "pipelines_sales": 99}'::jsonb;
    WHEN 'enterprise' THEN plan_limits := '{"max_users": 99999, "max_accounts": 99999, "wa_messages": 99999, "pipelines_retention": 99, "pipelines_sales": 99}'::jsonb;
    WHEN 'beta' THEN plan_limits := '{"max_users": 20, "max_accounts": 99999, "wa_messages": 5000, "pipelines_retention": 5, "pipelines_sales": 3}'::jsonb;
  END CASE;

  -- Update org with plan limits
  UPDATE organizations SET
    max_users = (plan_limits->>'max_users')::int,
    max_accounts = (plan_limits->>'max_accounts')::int,
    plan_tier = p_plan_tier,
    subscription_status = CASE WHEN p_plan_tier = 'beta' THEN 'beta' ELSE 'active' END
  WHERE id = p_org_id;

  -- Create default retention pipeline
  INSERT INTO pipelines (id, org_id, name, description, pipeline_type, is_default, sort_order)
  VALUES (uuid_generate_v4(), p_org_id, 'Account retention', 'Track accounts from onboarding to renewal', 'retention', TRUE, 1)
  RETURNING id INTO retention_pipeline_id;

  -- Retention pipeline stages
  INSERT INTO pipeline_stages (pipeline_id, org_id, name, description, sort_order, color, is_default) VALUES
  (retention_pipeline_id, p_org_id, 'Onboarding', 'New client, setup in progress', 1, '#85B7EB', TRUE),
  (retention_pipeline_id, p_org_id, 'Active', 'Healthy, engaged relationship', 2, '#97C459', TRUE),
  (retention_pipeline_id, p_org_id, 'Growth', 'Upsell or expansion opportunity identified', 3, '#AFA9EC', TRUE),
  (retention_pipeline_id, p_org_id, 'At risk', 'Health score declining, needs intervention', 4, '#F0997B', TRUE),
  (retention_pipeline_id, p_org_id, 'Renewal', 'Renewal window approaching', 5, '#FAC775', TRUE),
  (retention_pipeline_id, p_org_id, 'Churned', 'Client lost', 6, '#F09595', TRUE);

  -- Create default sales pipeline
  INSERT INTO pipelines (id, org_id, name, description, pipeline_type, is_default, sort_order)
  VALUES (uuid_generate_v4(), p_org_id, 'Sales pipeline', 'Track deals from lead to close', 'sales', TRUE, 2)
  RETURNING id INTO sales_pipeline_id;

  -- Sales pipeline stages
  INSERT INTO pipeline_stages (pipeline_id, org_id, name, description, sort_order, color, is_default) VALUES
  (sales_pipeline_id, p_org_id, 'Lead', 'New prospect identified', 1, '#7e7e7e', TRUE),
  (sales_pipeline_id, p_org_id, 'Qualified', 'Prospect meets ICP criteria', 2, '#85B7EB', TRUE),
  (sales_pipeline_id, p_org_id, 'Proposal', 'Proposal or quote sent', 3, '#AFA9EC', TRUE),
  (sales_pipeline_id, p_org_id, 'Negotiation', 'Terms being discussed', 4, '#FAC775', TRUE),
  (sales_pipeline_id, p_org_id, 'Won', 'Deal closed successfully', 5, '#97C459', TRUE),
  (sales_pipeline_id, p_org_id, 'Lost', 'Deal did not close', 6, '#F09595', TRUE);

  -- Set WhatsApp config placeholder
  INSERT INTO whatsapp_config (org_id, monthly_message_limit)
  VALUES (p_org_id, (plan_limits->>'wa_messages')::int);

END;
$$ LANGUAGE plpgsql;
