-- Migration: Add FAB Card Lookup table
-- Purpose: Store card image URLs for fast decklist resolution

CREATE TABLE IF NOT EXISTS fab_card_lookup (
    lookup_key TEXT PRIMARY KEY,  -- "snatch" or "snatch:red"
    name TEXT NOT NULL,
    image_url TEXT,
    fallback_url TEXT,
    pitch INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching by name
CREATE INDEX IF NOT EXISTS idx_fab_card_lookup_name ON fab_card_lookup(name);

-- Upload history tracking
CREATE TABLE IF NOT EXISTS fab_card_upload_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by TEXT,
    filename TEXT,
    total_cards INTEGER NOT NULL,
    lookup_entries INTEGER NOT NULL,
    sets_included JSONB,  -- Array of set IDs found in the upload
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
