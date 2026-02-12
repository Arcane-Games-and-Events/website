-- Add player matchup columns to VODs
ALTER TABLE vods ADD COLUMN IF NOT EXISTS player1_name TEXT;
ALTER TABLE vods ADD COLUMN IF NOT EXISTS player1_hero TEXT;
ALTER TABLE vods ADD COLUMN IF NOT EXISTS player2_name TEXT;
ALTER TABLE vods ADD COLUMN IF NOT EXISTS player2_hero TEXT;

-- Drop old fields
ALTER TABLE vods DROP COLUMN IF EXISTS category;
ALTER TABLE vods DROP COLUMN IF EXISTS tags;
ALTER TABLE vods DROP COLUMN IF EXISTS match_count;

-- Drop old index, add new ones
DROP INDEX IF EXISTS idx_vods_category;
CREATE INDEX IF NOT EXISTS idx_vods_player1_name ON vods(player1_name);
CREATE INDEX IF NOT EXISTS idx_vods_player2_name ON vods(player2_name);
