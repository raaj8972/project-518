-- ============================================================
-- Migration: Add landing page and navigation order to site_settings
-- Purpose:
--   1. default_landing_page (text) — The page users see when visiting /
--   2. navigation_order (jsonb) — An array of route paths to reorder Nav items
-- ============================================================

-- 1. Add columns to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS default_landing_page text NOT NULL DEFAULT '/',
  ADD COLUMN IF NOT EXISTS navigation_order jsonb DEFAULT NULL;

-- 2. No changes to RLS needed as site_settings already has read/write policies.
