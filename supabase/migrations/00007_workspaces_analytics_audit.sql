-- Migration 00007: Workspaces, Analytics, Usage Metering & Audit Logs
-- Implements multi-client isolation, minute caps, encrypted API keys storage, and audit trail.

-- 1. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'growth',
    minute_cap INTEGER NOT NULL DEFAULT 500,
    minutes_used NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cost_per_lead NUMERIC(10, 2) DEFAULT 15.00,
    revenue_attributed NUMERIC(12, 2) DEFAULT 0.00,
    pii_retention_days INTEGER NOT NULL DEFAULT 90,
    encrypted_api_keys JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workspace Members Table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'client', -- 'admin' | 'client'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 3. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant RLS Isolation Policies
-- Client A can only view their own workspace data
CREATE POLICY "Users can only read workspaces they belong to"
    ON public.workspaces
    FOR SELECT
    USING (
        id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only read audit logs for their workspace"
    ON public.audit_logs
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Seed initial workspaces: Client A (Desynthic Enterprise) and Client B (AlphaTech Solutions)
INSERT INTO public.workspaces (id, name, slug, plan, minute_cap, minutes_used, cost_per_lead, revenue_attributed, pii_retention_days)
VALUES 
    ('ws_client_a', 'Desynthic Enterprise', 'desynthic', 'growth', 500, 142.50, 15.00, 48500.00, 90),
    ('ws_client_b', 'AlphaTech Solutions', 'alphatech', 'starter', 100, 98.20, 20.00, 12000.00, 60)
ON CONFLICT (id) DO NOTHING;
