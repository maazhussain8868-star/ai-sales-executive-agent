-- Migration 00006: Multi-channel (WhatsApp, Email) & Sequences
-- Creates tables for Channel Consents, Unified Message Timeline, Templates, Suppression, and Sequences.

-- 1. Channel Consents Table
CREATE TABLE IF NOT EXISTS public.channel_consents (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- 'voice' | 'whatsapp' | 'email'
    status TEXT NOT NULL DEFAULT 'opted_in', -- 'opted_in' | 'opted_out' | 'pending'
    source TEXT NOT NULL DEFAULT 'web_form',
    proof TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lead_id, channel)
);

-- 2. Unified Message Timeline Table
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- 'voice' | 'whatsapp' | 'email'
    direction TEXT NOT NULL, -- 'outbound' | 'inbound'
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT, -- for email
    content TEXT NOT NULL,
    template_id TEXT, -- for WhatsApp
    status TEXT NOT NULL DEFAULT 'sent', -- 'draft' | 'pending_approval' | 'sent' | 'delivered' | 'read' | 'failed' | 'replied'
    ai_drafted BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by TEXT,
    external_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WhatsApp Templates Table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'MARKETING', -- 'MARKETING' | 'UTILITY'
    language TEXT NOT NULL DEFAULT 'en_US',
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'APPROVED', -- 'APPROVED' | 'PENDING' | 'REJECTED'
    variables TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Email Suppression List Table
CREATE TABLE IF NOT EXISTS public.email_suppression (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL DEFAULT 'unsubscribed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Sequences Table
CREATE TABLE IF NOT EXISTS public.sequences (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sequence Steps Table
CREATE TABLE IF NOT EXISTS public.sequence_steps (
    id TEXT PRIMARY KEY,
    sequence_id TEXT NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    channel TEXT NOT NULL, -- 'voice' | 'whatsapp' | 'email'
    wait_hours INTEGER NOT NULL DEFAULT 0,
    condition TEXT DEFAULT 'no_answer', -- 'always' | 'no_answer' | 'not_booked'
    template_id TEXT,
    subject TEXT,
    body_prompt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sequence_id, step_order)
);

-- 7. Sequence Enrollments Table
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
    id TEXT PRIMARY KEY,
    sequence_id TEXT NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed' | 'halted' | 'replied'
    next_action_at TIMESTAMPTZ,
    halt_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sequence_id, lead_id)
);

-- Indexes for fast timeline and consent queries
CREATE INDEX IF NOT EXISTS idx_messages_lead ON public.messages(lead_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_channel_consents_lead ON public.channel_consents(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status ON public.sequence_enrollments(status, next_action_at);
