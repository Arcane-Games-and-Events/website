-- Add player name columns to rge_tournament_pairing for simple pairing display
ALTER TABLE rge_tournament_pairing
ADD COLUMN player1_name TEXT DEFAULT '',
ADD COLUMN player2_name TEXT DEFAULT '';
