-- Migration: Add podcast tables for AGE Studios
-- Created: 2025-02-11

-- PODCASTS table (podcast series like "Cardboard and Beyond")
CREATE TABLE IF NOT EXISTS podcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    youtube_playlist_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_by TEXT REFERENCES "user"(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PODCAST EPISODES table (individual episodes from YouTube)
CREATE TABLE IF NOT EXISTS podcast_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,

    -- YouTube data (scraped)
    youtube_url TEXT NOT NULL,
    youtube_video_id TEXT,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    published_at TIMESTAMPTZ,

    -- Manual metadata
    description TEXT,
    guest TEXT,
    season INTEGER,
    episode INTEGER,
    duration TEXT,

    -- Status
    is_published BOOLEAN DEFAULT TRUE,

    created_by TEXT REFERENCES "user"(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_podcast_id ON podcast_episodes(podcast_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_published ON podcast_episodes(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_podcasts_active ON podcasts(is_active, sort_order);

-- Insert default podcast: Cardboard and Beyond
INSERT INTO podcasts (name, description, is_active, sort_order)
VALUES (
    'Cardboard and Beyond',
    'The official AGE podcast covering Flesh and Blood strategy, meta analysis, and community stories.',
    TRUE,
    0
) ON CONFLICT DO NOTHING;
