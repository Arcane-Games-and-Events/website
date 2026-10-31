-- 036: the AGE Network — outside creators on AGE Studios.
--
-- A creator (`studio_channel`) is added once from their YouTube channel
-- link. Their recent uploads are pulled in (`studio_channel_video`) for
-- staff to choose from; only videos staff feature reach the public site
-- (/studios/network). Network videos play through YouTube's embed and are
-- free to everyone.
--
-- Additive and idempotent: safe to re-run. Apply before deploying the code
-- that reads these tables.

CREATE TABLE IF NOT EXISTS studio_channel (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  name                text NOT NULL,
  kind                text NOT NULL DEFAULT 'video',
  youtube_channel_id  text NOT NULL UNIQUE,
  youtube_url         text NOT NULL,
  handle              text,
  avatar_url          text,
  banner_url          text,
  description         text,
  cover_image_id      uuid REFERENCES cms_media(id) ON DELETE SET NULL,
  is_active           boolean NOT NULL DEFAULT true,
  sort_order          integer NOT NULL DEFAULT 0,
  last_synced_at      timestamptz,
  sync_error          text,
  created_by          text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE studio_channel ADD CONSTRAINT studio_channel_kind_check CHECK (kind IN ('podcast', 'video'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS studio_channel_video (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id        uuid NOT NULL REFERENCES studio_channel(id) ON DELETE CASCADE,
  youtube_video_id  text NOT NULL UNIQUE,
  title             text NOT NULL,
  description       text,
  published_at      timestamptz,
  thumbnail_url     text,
  duration          integer,
  is_short          boolean NOT NULL DEFAULT false,
  -- false once the video has gone from the channel (deleted or private).
  is_available      boolean NOT NULL DEFAULT true,
  is_featured       boolean NOT NULL DEFAULT false,
  featured_at       timestamptz,
  featured_by       text REFERENCES "user"(id) ON DELETE SET NULL,
  sort_order        integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio_channel_video_channel_idx
  ON studio_channel_video (channel_id, published_at DESC);
CREATE INDEX IF NOT EXISTS studio_channel_video_featured_idx
  ON studio_channel_video (is_featured, featured_at DESC) WHERE is_featured;

-- Row level security on with no policies, as in 031.
ALTER TABLE studio_channel ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_channel_video ENABLE ROW LEVEL SECURITY;
