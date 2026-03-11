-- Migration: Annual Sports Detail Tabs & Visibility Toggle
-- Adds visibility control and relationship fields to connect Teams/Auction/Schedule to Annual Events

-- 1. Add visibility and auction_status to annual_sports_events
ALTER TABLE public.annual_sports_events 
ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auction_status text DEFAULT 'draft'; -- draft, live, completed

-- 2. Add relationship fields to legacy sports tables to support Annual Events
ALTER TABLE public.sports_teams 
ADD COLUMN IF NOT EXISTS annual_event_id uuid REFERENCES public.annual_sports_events(id) ON DELETE CASCADE;

ALTER TABLE public.sports_players 
ADD COLUMN IF NOT EXISTS annual_event_id uuid REFERENCES public.annual_sports_events(id) ON DELETE CASCADE;

ALTER TABLE public.sports_matches 
ADD COLUMN IF NOT EXISTS annual_event_id uuid REFERENCES public.annual_sports_events(id) ON DELETE CASCADE;

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
