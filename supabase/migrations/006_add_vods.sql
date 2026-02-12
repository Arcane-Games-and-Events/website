-- VODs table for Mux-hosted tournament and event videos
CREATE TABLE IF NOT EXISTS vods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mux_asset_id TEXT UNIQUE,
  mux_playback_id TEXT,
  mux_upload_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  duration REAL,
  aspect_ratio TEXT,
  category TEXT,
  tags TEXT[],
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  is_premium BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'waiting',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  match_count INTEGER,
  created_by TEXT REFERENCES "user"(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vods_status ON vods(status);
CREATE INDEX IF NOT EXISTS idx_vods_is_published ON vods(is_published);
CREATE INDEX IF NOT EXISTS idx_vods_category ON vods(category);
CREATE INDEX IF NOT EXISTS idx_vods_event_id ON vods(event_id);
CREATE INDEX IF NOT EXISTS idx_vods_mux_asset_id ON vods(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_vods_mux_upload_id ON vods(mux_upload_id);
