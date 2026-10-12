-- Migration 00005: Leads, Campaigns & Scheduling
-- Creates tables for Leads management, Campaign execution, Scheduler rules, and Appointments.

-- 1. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    role TEXT,
    status TEXT NOT NULL DEFAULT 'NEW',
    dnd BOOLEAN NOT NULL DEFAULT FALSE,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_called_at TIMESTAMPTZ,
    next_follow_up TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    agent_name TEXT NOT NULL DEFAULT 'Priya',
    status TEXT NOT NULL DEFAULT 'draft',
    call_window_start TEXT NOT NULL DEFAULT '10:00',
    call_window_end TEXT NOT NULL DEFAULT '18:00',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    max_attempts INTEGER NOT NULL DEFAULT 3,
    retry_gap_hours INTEGER NOT NULL DEFAULT 4,
    daily_cap INTEGER NOT NULL DEFAULT 20,
    calls_today INTEGER NOT NULL DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Campaign Leads Junction Table
CREATE TABLE IF NOT EXISTS public.campaign_leads (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'READY',
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, lead_id)
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    campaign_id TEXT REFERENCES public.campaigns(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    meeting_link TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    calendar_event_id TEXT,
    n8n_notified BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Scheduler Execution Logs
CREATE TABLE IF NOT EXISTS public.scheduler_logs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    leads_evaluated INTEGER NOT NULL DEFAULT 0,
    calls_dispatched INTEGER NOT NULL DEFAULT 0,
    skipped_summary JSONB DEFAULT '{}'::jsonb
);

-- Indexes for efficient scheduler lookups
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON public.leads(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lookup ON public.campaign_leads(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
