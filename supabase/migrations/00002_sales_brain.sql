-- 00002_sales_brain.sql
-- Phase 1: Sales Brain Builder data models

CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Priya',
    role TEXT NOT NULL DEFAULT 'AI Sales Representative',
    industry TEXT NOT NULL DEFAULT 'Technology & AI Automation',
    personality TEXT NOT NULL DEFAULT 'Warm, confident, and professional',
    sales_style TEXT NOT NULL DEFAULT 'Consultative and empathetic',
    goal TEXT NOT NULL DEFAULT 'Book qualified discovery meetings',
    voice_prompt TEXT,
    max_prompt_length INT NOT NULL DEFAULT 4000,
    sample_objections JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.interview_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_business_section UNIQUE (business_id, section)
);

CREATE TABLE IF NOT EXISTS public.brain_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL, -- e.g. 01_company, 02_products, ...
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.source_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_materials ENABLE ROW LEVEL SECURITY;

-- Open policies for authenticated / dev sessions
CREATE POLICY "Allow all actions on businesses" ON public.businesses FOR ALL USING (true);
CREATE POLICY "Allow all actions on agents" ON public.agents FOR ALL USING (true);
CREATE POLICY "Allow all actions on interview_answers" ON public.interview_answers FOR ALL USING (true);
CREATE POLICY "Allow all actions on brain_files" ON public.brain_files FOR ALL USING (true);
CREATE POLICY "Allow all actions on source_materials" ON public.source_materials FOR ALL USING (true);
