-- Phase 7: Advanced Enterprise Scale Migration
-- Adds Multilingual configs, A/B Experiments, Sales Coaching, CRM Sync, Inbound & Human Sales Teams, and Minute Wallets

CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'concluded')),
  variant_a_prompt TEXT NOT NULL,
  variant_b_prompt TEXT NOT NULL,
  traffic_split_percent INT NOT NULL DEFAULT 50 CHECK (traffic_split_percent BETWEEN 1 AND 99),
  variant_a_calls INT NOT NULL DEFAULT 0,
  variant_a_meetings INT NOT NULL DEFAULT 0,
  variant_b_calls INT NOT NULL DEFAULT 0,
  variant_b_meetings INT NOT NULL DEFAULT 0,
  winning_variant TEXT CHECK (winning_variant IN ('A', 'B', NULL)),
  confidence_score NUMERIC DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS sales_coaching_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  call_id UUID,
  prospect_name TEXT NOT NULL,
  talk_to_listen_ratio NUMERIC NOT NULL DEFAULT 0.50,
  speech_pace_wpm INT NOT NULL DEFAULT 140,
  filler_words_count INT NOT NULL DEFAULT 0,
  objection_handling_score INT NOT NULL DEFAULT 85 CHECK (objection_handling_score BETWEEN 0 AND 100),
  strengths TEXT[] NOT NULL DEFAULT '{}',
  improvement_areas TEXT[] NOT NULL DEFAULT '{}',
  recommended_prompt_patch TEXT,
  applied_to_brain BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS methodology_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  source_call_id UUID,
  category TEXT NOT NULL CHECK (category IN ('objection_response', 'value_proposition', 'closing_hook')),
  suggested_patch TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hubspot', 'zoho', 'salesforce', 'webhook')),
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  api_key_masked TEXT,
  webhook_url TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_stats JSONB NOT NULL DEFAULT '{"leadsSynced": 0, "callsSynced": 0, "dealsCreated": 0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS human_sales_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Account Executive',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_call', 'offline')),
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'enterprise')),
  assigned_meetings_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS inbound_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  caller_number TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  intent_detected TEXT NOT NULL,
  routed_to TEXT NOT NULL CHECK (routed_to IN ('ai_agent', 'human_rep', 'voicemail')),
  transferred_to_rep_name TEXT,
  resolution TEXT NOT NULL CHECK (resolution IN ('qualified', 'meeting_booked', 'escalated', 'inquiry_resolved', 'dropped')),
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS wallet_ledgers (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  current_minutes_balance INT NOT NULL DEFAULT 500,
  total_minutes_purchased INT NOT NULL DEFAULT 500,
  total_minutes_consumed INT NOT NULL DEFAULT 0,
  plan_name TEXT NOT NULL DEFAULT 'Growth',
  recharge_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS) Enablement
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_coaching_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE methodology_patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledgers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspaces isolate ab_experiments" ON ab_experiments
  FOR ALL USING (workspace_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Workspaces isolate sales_coaching_reports" ON sales_coaching_reports
  FOR ALL USING (workspace_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Workspaces isolate methodology_patches" ON methodology_patches
  FOR ALL USING (workspace_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Workspaces isolate crm_integrations" ON crm_integrations
  FOR ALL USING (workspace_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Workspaces isolate human_sales_reps" ON human_sales_reps
  FOR ALL USING (workspace_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Workspaces isolate inbound_call_logs" ON inbound_call_logs
  FOR ALL USING (workspace_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Workspaces isolate wallet_ledgers" ON wallet_ledgers
  FOR ALL USING (workspace_id = auth.uid() OR auth.role() = 'service_role');
