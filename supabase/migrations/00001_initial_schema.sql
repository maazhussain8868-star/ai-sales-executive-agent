-- 00001_initial_schema.sql
-- Initial schema for AI Sales Employee: Admin authentication & Profiles

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT DEFAULT 'Admin User',
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'client', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Function to handle new user signups automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Admin User'),
        COALESCE(new.raw_user_meta_data->>'role', 'admin')
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute handle_new_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed initial admin user if not exists (Desynthic Admin)
-- Password can be set via Supabase Auth dashboard or SQL
DO $$
DECLARE
    new_user_id UUID := uuid_generate_v4();
    admin_email TEXT := 'admin@desynthic.com';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role
        )
        VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            admin_email,
            -- Default bcrypt hash for 'password123'
            '$2a$10$7Z8KqDfv2E.L91s3dF37UerV3zS2/cHQx.y/7mXjQ40eJ4g4aJm7u',
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Admin User","role":"admin"}',
            false,
            'authenticated'
        );
    END IF;
END $$;
