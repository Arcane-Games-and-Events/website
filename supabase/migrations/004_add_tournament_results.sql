-- Add tournament_results column to events table
-- Stores computed results from CSV processing to preserve Swiss standings order
ALTER TABLE events ADD COLUMN IF NOT EXISTS tournament_results JSONB;
