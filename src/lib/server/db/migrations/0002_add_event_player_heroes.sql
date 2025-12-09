-- Track what hero each player played at each event
-- Organized by season/circuit/month to match standings structure

CREATE TABLE IF NOT EXISTS event_player_heroes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event context (matches standings structure)
    season TEXT NOT NULL,           -- e.g., "2025"
    circuit TEXT NOT NULL,          -- e.g., "Los Angeles", "St. Louis"
    month TEXT NOT NULL,            -- e.g., "January", "February"

    -- Player identification
    gem_id TEXT,
    player_name TEXT NOT NULL,

    -- Hero played
    hero TEXT NOT NULL,

    -- Optional metadata
    country_region TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Each player can only have one hero entry per season/circuit/month
    CONSTRAINT unique_event_player UNIQUE (season, circuit, month, gem_id)
);

-- Index for querying by event (metagame breakdown)
CREATE INDEX IF NOT EXISTS idx_event_player_heroes_event ON event_player_heroes(season, circuit, month);

-- Index for querying by player (hero history)
CREATE INDEX IF NOT EXISTS idx_event_player_heroes_gem_id ON event_player_heroes(gem_id);

-- Index for querying by hero (popularity stats)
CREATE INDEX IF NOT EXISTS idx_event_player_heroes_hero ON event_player_heroes(hero);
