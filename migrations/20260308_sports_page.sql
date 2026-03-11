-- ============================================================
-- Sports Page — Full Schema Migration
-- Tables: sports_seasons, sports_teams, sports_players,
--         sports_registrations, sports_matches
-- ============================================================

-- 1. Sports Seasons (each sport + season combo)
CREATE TABLE IF NOT EXISTS sports_seasons (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,           -- e.g. "Cricket"
  season         TEXT DEFAULT '2026',     -- e.g. "2026"
  description    TEXT DEFAULT '',
  image          TEXT DEFAULT '',         -- sport banner image
  icon           TEXT DEFAULT '',         -- emoji or icon identifier
  max_teams      INT DEFAULT 8,
  registration_open BOOLEAN DEFAULT false,
  auction_status TEXT DEFAULT 'draft' CHECK (auction_status IN ('draft','live','completed')),
  auction_starts_at TIMESTAMPTZ,
  enabled        BOOLEAN DEFAULT true,
  order_position INT DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 2. Sports Teams
CREATE TABLE IF NOT EXISTS sports_teams (
  id             SERIAL PRIMARY KEY,
  sport_id       INT NOT NULL REFERENCES sports_seasons(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,           -- e.g. "Thunder Hawks"
  short_name     TEXT DEFAULT '',         -- e.g. "THK"
  color          TEXT DEFAULT '#6366f1',  -- team brand color (hex)
  logo           TEXT DEFAULT '',         -- team logo image URL (Supabase storage)
  owner_name     TEXT DEFAULT '',
  owner_image    TEXT DEFAULT '',
  captain_name   TEXT DEFAULT '',         -- denormalized for quick display
  enabled        BOOLEAN DEFAULT true,
  order_position INT DEFAULT 1,
  -- Standings
  played         INT DEFAULT 0,
  wins           INT DEFAULT 0,
  losses         INT DEFAULT 0,
  draws          INT DEFAULT 0,
  points         INT DEFAULT 0,
  nrr            NUMERIC(6,3) DEFAULT 0, -- net run rate / goal diff
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 3. Sports Players (auction pool + team rosters)
CREATE TABLE IF NOT EXISTS sports_players (
  id             SERIAL PRIMARY KEY,
  sport_id       INT NOT NULL REFERENCES sports_seasons(id) ON DELETE CASCADE,
  team_id        INT REFERENCES sports_teams(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  image          TEXT DEFAULT '',         -- player photo (Supabase storage)
  role           TEXT DEFAULT 'player' CHECK (role IN ('player','captain','vice_captain','owner')),
  position       TEXT DEFAULT '',         -- e.g. "Batsman", "Goalkeeper"
  base_price     INT DEFAULT 0,          -- auction base price
  sold_price     INT,                    -- final auction price (null = not yet sold)
  category       TEXT DEFAULT 'bronze' CHECK (category IN ('gold','silver','bronze','emerging')),
  stats          JSONB DEFAULT '{}',     -- flexible stats (batting_avg, goals, etc.)
  status         TEXT DEFAULT 'available' CHECK (status IN ('available','sold','unsold','retained')),
  is_motm_count  INT DEFAULT 0,          -- man of the match count
  enabled        BOOLEAN DEFAULT true,
  order_position INT DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 4. Sports Registrations (public sign-ups)
CREATE TABLE IF NOT EXISTS sports_registrations (
  id             SERIAL PRIMARY KEY,
  sport_id       INT NOT NULL REFERENCES sports_seasons(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  email          TEXT DEFAULT '',
  phone          TEXT DEFAULT '',
  year_or_class  TEXT DEFAULT '',
  institution    TEXT DEFAULT '',
  position_preference TEXT DEFAULT '',
  experience     TEXT DEFAULT '',
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 5. Sports Matches (schedule + results)
CREATE TABLE IF NOT EXISTS sports_matches (
  id             SERIAL PRIMARY KEY,
  sport_id       INT NOT NULL REFERENCES sports_seasons(id) ON DELETE CASCADE,
  team_a_id      INT REFERENCES sports_teams(id) ON DELETE SET NULL,
  team_b_id      INT REFERENCES sports_teams(id) ON DELETE SET NULL,
  match_date     DATE,
  match_time     TIME,
  venue          TEXT DEFAULT '',
  round          TEXT DEFAULT '',         -- e.g. "Group Stage", "Semi-Final", "Final"
  score_a        TEXT DEFAULT '',         -- flexible score (e.g. "156/4", "3")
  score_b        TEXT DEFAULT '',
  winner_team_id INT REFERENCES sports_teams(id) ON DELETE SET NULL,
  motm_player_id INT REFERENCES sports_players(id) ON DELETE SET NULL,
  highlights     TEXT DEFAULT '',         -- brief match summary
  status         TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed','cancelled')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE sports_seasons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_matches       ENABLE ROW LEVEL SECURITY;

-- Public read for enabled records
CREATE POLICY "sports_seasons_public_read" ON sports_seasons FOR SELECT USING (true);
CREATE POLICY "sports_teams_public_read"   ON sports_teams   FOR SELECT USING (true);
CREATE POLICY "sports_players_public_read" ON sports_players  FOR SELECT USING (true);
CREATE POLICY "sports_matches_public_read" ON sports_matches  FOR SELECT USING (true);

-- Public can INSERT registrations (anyone can register)
CREATE POLICY "sports_registrations_public_insert" ON sports_registrations FOR INSERT WITH CHECK (true);
-- Public can read own registrations by email
CREATE POLICY "sports_registrations_public_read"   ON sports_registrations FOR SELECT USING (true);

-- Admin write (all tables) — uses admin_users lookup
CREATE POLICY "sports_seasons_admin_write" ON sports_seasons
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "sports_teams_admin_write" ON sports_teams
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "sports_players_admin_write" ON sports_players
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "sports_registrations_admin_write" ON sports_registrations
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "sports_matches_admin_write" ON sports_matches
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sports_teams_sport_id       ON sports_teams(sport_id);
CREATE INDEX IF NOT EXISTS idx_sports_players_sport_id     ON sports_players(sport_id);
CREATE INDEX IF NOT EXISTS idx_sports_players_team_id      ON sports_players(team_id);
CREATE INDEX IF NOT EXISTS idx_sports_registrations_sport_id ON sports_registrations(sport_id);
CREATE INDEX IF NOT EXISTS idx_sports_matches_sport_id     ON sports_matches(sport_id);
