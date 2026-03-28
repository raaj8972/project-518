-- ==============================================================================
-- SPORTS DUMMY DATA SEED SCRIPT
-- WARNING: THIS WILL DELETE ALL CURRENT SPORTS DATA!
-- ==============================================================================

-- 1. Wipe existing data (order matters due to foreign keys)
DELETE FROM public.sports_matches;
DELETE FROM public.sports_players;
DELETE FROM public.sports_registrations;
DELETE FROM public.sports_teams;
DELETE FROM public.sports_seasons;

-- 2. Insert Dummy Seasons
INSERT INTO public.sports_seasons (name, season, description, icon, max_teams, max_owners, max_players, owner_fee, player_fee, auction_status, auction_days, enabled, order_position)
VALUES 
  ('RICO Box Cricket', '2026', 'High energy floodlight cricket', '🏏', 8, 8, 120, 5000, 200, 'live', 2, true, 1),
  ('Neon Futsal League', '2026', 'Fast-paced 5v5 action', '⚽', 6, 6, 60, 4000, 150, 'live', 1, true, 2);

-- 3. Insert Dummy Teams for Cricket
INSERT INTO public.sports_teams (sport_id, name, short_name, color, logo, owner_name, owner_image, enabled, order_position)
SELECT 
  id as sport_id,
  team_data.name, team_data.short_name, team_data.color, 'https://ui-avatars.com/api/?name=' || team_data.short_name || '&background=random&color=fff', team_data.owner_name, 'https://i.pravatar.cc/150?u=' || team_data.short_name, true, team_data.ord
FROM public.sports_seasons,
  (VALUES 
    ('Titan Strikers', 'TIT', '#3b82f6', 'Rajiv Singh', 1),
    ('Neon Knights', 'NNK', '#10b981', 'Amit Patel', 2),
    ('Cyber Spartans', 'CYB', '#ef4444', 'Priya Sharma', 3),
    ('Quantum Royals', 'QUA', '#8b5cf6', 'Neha Gupta', 4)
  ) AS team_data(name, short_name, color, owner_name, ord)
WHERE public.sports_seasons.name = 'RICO Box Cricket';

-- Insert Dummy Teams for Futsal
INSERT INTO public.sports_teams (sport_id, name, short_name, color, logo, owner_name, enabled, order_position)
SELECT 
  id as sport_id,
  team_data.name, team_data.short_name, team_data.color, 'https://ui-avatars.com/api/?name=' || team_data.short_name || '&background=random&color=fff', team_data.owner_name, true, team_data.ord
FROM public.sports_seasons,
  (VALUES 
    ('Flash FC', 'FFC', '#fb923c', 'Vikram Das', 1),
    ('Velocity United', 'VUN', '#06b6d4', 'Sanjay Roy', 2)
  ) AS team_data(name, short_name, color, owner_name, ord)
WHERE public.sports_seasons.name = 'Neon Futsal League';

-- 4. Insert Dummy Players for Cricket
-- We use a DO block here because we need variable ids for teams
DO $$
DECLARE
  cricket_id int;
  t_tit int;
  t_nnk int;
  t_cyb int;
  t_qua int;
BEGIN
  SELECT id INTO cricket_id FROM public.sports_seasons WHERE name = 'RICO Box Cricket';
  SELECT id INTO t_tit FROM public.sports_teams WHERE short_name = 'TIT';
  SELECT id INTO t_nnk FROM public.sports_teams WHERE short_name = 'NNK';
  SELECT id INTO t_cyb FROM public.sports_teams WHERE short_name = 'CYB';
  SELECT id INTO t_qua FROM public.sports_teams WHERE short_name = 'QUA';

  -- Sold Players (Day 1)
  INSERT INTO public.sports_players (sport_id, team_id, name, position, base_price, sold_price, sold_day, category, role, status, is_motm_count, enabled, image) VALUES
  (cricket_id, t_tit, 'Arjun Kapoor', 'All-rounder', 200, 1500, 1, 'gold', 'captain', 'sold', 0, true, 'https://i.pravatar.cc/150?u=arjun'),
  (cricket_id, t_tit, 'Rahul Verma', 'Batsman', 200, 800, 1, 'silver', 'player', 'sold', 0, true, 'https://i.pravatar.cc/150?u=rahul'),
  (cricket_id, t_nnk, 'Hardik Shah', 'All-rounder', 200, 1800, 1, 'gold', 'captain', 'sold', 0, true, 'https://i.pravatar.cc/150?u=hardik'),
  (cricket_id, t_cyb, 'Virat Das', 'Batsman', 200, 2000, 1, 'gold', 'captain', 'sold', 0, true, 'https://i.pravatar.cc/150?u=virat');

  -- Sold Players (Day 2)
  INSERT INTO public.sports_players (sport_id, team_id, name, position, base_price, sold_price, sold_day, category, role, status, is_motm_count, enabled, image) VALUES
  (cricket_id, t_nnk, 'Rohit Kumar', 'Bowler', 200, 450, 2, 'bronze', 'player', 'sold', 0, true, 'https://i.pravatar.cc/150?u=rohit'),
  (cricket_id, t_cyb, 'Smriti Sen', 'Batsman', 200, 600, 2, 'silver', 'player', 'sold', 0, true, 'https://i.pravatar.cc/150?u=smriti'),
  (cricket_id, t_qua, 'MS Dhoni', 'Wicketkeeper', 200, 2500, 2, 'gold', 'captain', 'sold', 0, true, 'https://i.pravatar.cc/150?u=msd');

  -- Available Players (In the pool)
  INSERT INTO public.sports_players (sport_id, team_id, name, position, base_price, category, role, status, is_motm_count, enabled, image) VALUES
  (cricket_id, NULL, 'Jasprit Singh', 'Bowler', 200, 'gold', 'player', 'available', 0, true, 'https://i.pravatar.cc/150?u=jasp'),
  (cricket_id, NULL, 'Shubman Gill', 'Batsman', 200, 'silver', 'player', 'available', 0, true, 'https://i.pravatar.cc/150?u=shub'),
  (cricket_id, NULL, 'Rishabh Pant', 'Wicketkeeper', 200, 'gold', 'player', 'available', 0, true, 'https://i.pravatar.cc/150?u=rish');

  -- Unsold Players
  INSERT INTO public.sports_players (sport_id, team_id, name, position, base_price, category, role, status, is_motm_count, enabled, image) VALUES
  (cricket_id, NULL, 'Amit Mishra', 'Bowler', 200, 'bronze', 'player', 'unsold', 0, true, 'https://i.pravatar.cc/150?u=amit'),
  (cricket_id, NULL, 'Ishant Ghosh', 'Bowler', 200, 'bronze', 'player', 'unsold', 0, true, 'https://i.pravatar.cc/150?u=ishant');

  -- 5. Insert Dummy Matches for Cricket
  INSERT INTO public.sports_matches (sport_id, team_a_id, team_b_id, match_date, match_time, venue, round, score_a, score_b, winner_team_id, status) VALUES
  (cricket_id, t_tit, t_nnk, '2026-04-10', '18:00', 'Main Ground', 'Pool Stage', '45/3 (5.0)', '42/5 (5.0)', t_tit, 'completed'),
  (cricket_id, t_cyb, t_qua, '2026-04-12', '19:00', 'Main Ground', 'Pool Stage', '', '', NULL, 'upcoming');
END $$;
