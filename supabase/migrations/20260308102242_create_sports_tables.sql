-- Create Sports Seasons Table
CREATE TABLE IF NOT EXISTS public.sports_seasons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  year text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Sports Teams Table
CREATE TABLE IF NOT EXISTS public.sports_teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  captain_name text NOT NULL,
  captain_phone text,
  logo_url text,
  season_id uuid REFERENCES public.sports_seasons(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Sports Players Table
CREATE TABLE IF NOT EXISTS public.sports_players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  team_id uuid REFERENCES public.sports_teams(id) ON DELETE CASCADE,
  photo_url text,
  role text,
  base_price numeric,
  sold_price numeric,
  is_sold boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Sports Matches Table
CREATE TABLE IF NOT EXISTS public.sports_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id uuid REFERENCES public.sports_seasons(id) ON DELETE CASCADE,
  team1_id uuid REFERENCES public.sports_teams(id) ON DELETE CASCADE,
  team2_id uuid REFERENCES public.sports_teams(id) ON DELETE CASCADE,
  match_date timestamp with time zone NOT NULL,
  venue text,
  status text DEFAULT 'scheduled', -- scheduled, ongoing, completed
  winner_id uuid REFERENCES public.sports_teams(id) ON DELETE SET NULL,
  score1 text,
  score2 text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sports_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_matches ENABLE ROW LEVEL SECURITY;

-- Create Policies for sports_seasons
CREATE POLICY "Public can view sports seasons" ON public.sports_seasons
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert sports seasons" ON public.sports_seasons
  FOR INSERT WITH CHECK ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));
CREATE POLICY "Admins can update sports seasons" ON public.sports_seasons
  FOR UPDATE USING ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));
CREATE POLICY "Admins can delete sports seasons" ON public.sports_seasons
  FOR DELETE USING ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));

-- Create Policies for sports_teams
CREATE POLICY "Public can view sports teams" ON public.sports_teams
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert sports teams" ON public.sports_teams
  FOR INSERT WITH CHECK ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));
CREATE POLICY "Admins can update sports teams" ON public.sports_teams
  FOR UPDATE USING ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));
CREATE POLICY "Admins can delete sports teams" ON public.sports_teams
  FOR DELETE USING ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));

-- Create Policies for sports_players
CREATE POLICY "Public can view sports players" ON public.sports_players
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert sports players" ON public.sports_players
  FOR INSERT WITH CHECK ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));
CREATE POLICY "Admins can update sports players" ON public.sports_players
  FOR UPDATE USING ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));
CREATE POLICY "Admins can delete sports players" ON public.sports_players
  FOR DELETE USING ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));

-- Create Policies for sports_matches
CREATE POLICY "Public can view sports matches" ON public.sports_matches
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert sports matches" ON public.sports_matches
  FOR INSERT WITH CHECK ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));
CREATE POLICY "Admins can update sports matches" ON public.sports_matches
  FOR UPDATE USING ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));
CREATE POLICY "Admins can delete sports matches" ON public.sports_matches
  FOR DELETE USING ((SELECT role FROM admin_users WHERE user_id = auth.uid()) IN ('admin', 'owner', 'council'));
