-- 00003_voice_calls.sql
-- Phase 2: Voice Provider Connection, Calls, and Webhook Storage

CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_call_id TEXT,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    to_number TEXT NOT NULL,
    from_number TEXT,
    status TEXT NOT NULL DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'queued', 'ringing', 'in_progress', 'completed', 'failed', 'blocked')),
    duration_seconds INT DEFAULT 0,
    transcript TEXT,
    summary TEXT,
    extracted_variables JSONB DEFAULT '{}'::jsonb,
    call_context JSONB DEFAULT '{}'::jsonb,
    compliance_notes TEXT,
    raw_webhook_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.voice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'omnidimension',
    agent_id TEXT DEFAULT 'priya_agent_01',
    allow_listed_numbers TEXT[] NOT NULL DEFAULT ARRAY['+919876543210', '+919999999999'],
    calling_hours_start TEXT DEFAULT '10:00',
    calling_hours_end TEXT DEFAULT '18:30',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    enforce_dnd BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions on calls" ON public.calls FOR ALL USING (true);
CREATE POLICY "Allow all actions on voice_settings" ON public.voice_settings FOR ALL USING (true);
