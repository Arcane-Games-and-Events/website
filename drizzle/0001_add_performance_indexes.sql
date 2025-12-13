-- Performance indexes for age-open page queries
-- These indexes speed up the most common queries by avoiding full table scans

-- Index for event ordering by date (used in event lists)
CREATE INDEX IF NOT EXISTS idx_event_date ON events(event_date);

-- Composite index for match lookups by year/circuit/month (used in results computation)
CREATE INDEX IF NOT EXISTS idx_match_lookup ON matches(year, circuit, month);

-- Index for match ordering by round
CREATE INDEX IF NOT EXISTS idx_match_round ON matches(round);

-- Composite index for standing lookups and sorting
CREATE INDEX IF NOT EXISTS idx_standing_lookup ON standings(season, circuit);
CREATE INDEX IF NOT EXISTS idx_standing_points ON standings(total_points DESC);

-- Partial index for public decklists (only indexes rows where is_public = true)
CREATE INDEX IF NOT EXISTS idx_decklist_public ON decklists(event_id) WHERE is_public = true;

-- Partial index for active LSS events
CREATE INDEX IF NOT EXISTS idx_lss_active ON lss_events(start_date) WHERE is_active = true;

-- Index for decklist event joins
CREATE INDEX IF NOT EXISTS idx_decklist_event ON decklists(event_id);
