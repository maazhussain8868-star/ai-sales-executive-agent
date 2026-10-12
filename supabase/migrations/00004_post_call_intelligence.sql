-- 00004_post_call_intelligence.sql
-- Phase 3: Post-call intelligence, call analysis, follow-ups, prospect memory, and analysis logs

CREATE TABLE IF NOT EXISTS public.call_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
    intent TEXT NOT NULL CHECK (intent IN ('positive', 'negative', 'neutral', 'curious', 'high_intent')),
    objections_raised TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    buying_signals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    conversation_signals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    qualification_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    lead_score INT NOT NULL CHECK (lead_score >= 0 AND lead_score <= 100),
    lead_score_reasons TEXT NOT NULL,
    next_action TEXT NOT NULL,
    summary TEXT NOT NULL,
    human_handoff BOOLEAN NOT NULL DEFAULT false,
    human_handoff_reasons TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    call_quality_score INT NOT NULL CHECK (call_quality_score >= 0 AND call_quality_score <= 100),
    call_quality_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    coaching_notes TEXT NOT NULL,
    confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0.95,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
    lead_phone TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    context_summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.prospect_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT,
    company TEXT,
    role TEXT,
    pain TEXT,
    past_objections TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    promises TEXT,
    last_contact TIMESTAMPTZ,
    next_follow_up TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.analysis_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID,
    status TEXT NOT NULL CHECK (status IN ('success', 'retry', 'failed')),
    attempts INT NOT NULL DEFAULT 1,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.call_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on call_analysis" ON public.call_analysis FOR ALL USING (true);
CREATE POLICY "Allow all on follow_ups" ON public.follow_ups FOR ALL USING (true);
CREATE POLICY "Allow all on prospect_memory" ON public.prospect_memory FOR ALL USING (true);
CREATE POLICY "Allow all on analysis_logs" ON public.analysis_logs FOR ALL USING (true);
