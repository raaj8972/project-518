-- Migration: council_suite_modules
-- Timestamp: 20261121133000
-- Description: Council Suite schema with strict RLS policies and Realtime sync

SET search_path = public, extensions;

-- 1. Council Tasks Table
CREATE TABLE IF NOT EXISTS public.council_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  team text NOT NULL,
  assignee_name text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Council Announcements Table
CREATE TABLE IF NOT EXISTS public.council_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all',
  is_urgent boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Council Budgets Table
CREATE TABLE IF NOT EXISTS public.council_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL UNIQUE,
  allocated_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Council Expenses Table
CREATE TABLE IF NOT EXISTS public.council_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL,
  requested_by text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  bill_url text,
  notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.council_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_expenses ENABLE ROW LEVEL SECURITY;

-- Revoke default public access
REVOKE ALL ON public.council_tasks FROM PUBLIC, anon;
REVOKE ALL ON public.council_announcements FROM PUBLIC, anon;
REVOKE ALL ON public.council_budgets FROM PUBLIC, anon;
REVOKE ALL ON public.council_expenses FROM PUBLIC, anon;

-- Grant permissions to service_role and authenticated
GRANT ALL ON public.council_tasks TO service_role, authenticated;
GRANT ALL ON public.council_announcements TO service_role, authenticated;
GRANT ALL ON public.council_budgets TO service_role, authenticated;
GRANT ALL ON public.council_expenses TO service_role, authenticated;

-- Service Role Policies (Backend API access)
DROP POLICY IF EXISTS "service_role_all_council_tasks" ON public.council_tasks;
DROP POLICY IF EXISTS "admin_all_council_tasks" ON public.council_tasks;
DROP POLICY IF EXISTS "service_role_all_council_announcements" ON public.council_announcements;
DROP POLICY IF EXISTS "admin_all_council_announcements" ON public.council_announcements;
DROP POLICY IF EXISTS "service_role_all_council_budgets" ON public.council_budgets;
DROP POLICY IF EXISTS "admin_all_council_budgets" ON public.council_budgets;
DROP POLICY IF EXISTS "service_role_all_council_expenses" ON public.council_expenses;
DROP POLICY IF EXISTS "admin_all_council_expenses" ON public.council_expenses;

CREATE POLICY "service_role_all_council_tasks" ON public.council_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_council_announcements" ON public.council_announcements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_council_budgets" ON public.council_budgets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_council_expenses" ON public.council_expenses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin Policies (Authorized Admin access)
CREATE POLICY "admin_all_council_tasks" ON public.council_tasks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_council_announcements" ON public.council_announcements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_council_budgets" ON public.council_budgets FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_council_expenses" ON public.council_expenses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
