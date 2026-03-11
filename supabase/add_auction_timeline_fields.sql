-- Add auction_days to sports_seasons
ALTER TABLE sports_seasons
ADD COLUMN auction_days INTEGER NOT NULL DEFAULT 1;

-- Add sold_day to sports_players
ALTER TABLE sports_players
ADD COLUMN sold_day INTEGER DEFAULT NULL;
