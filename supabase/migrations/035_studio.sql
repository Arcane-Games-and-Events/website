-- 035: the Studio — bonus gameplay, podcasts, interviews and other video.
--
-- The Studio (/studio) is a staff tool of its own, beside the Desk and the
-- Classroom. Its media keeps living in `vods`, which already has the Mux
-- upload pipeline, the analytics link (ca_view.vod_id), covers and Premium
-- gating. Each row now says what it is:
--   kind        gameplay | podcast | interview | video   (existing rows: gameplay)
--   media_type  video | audio   (podcast episodes can be audio-only)
-- Podcasts and interview series are shows (`studio_show`); an episode
-- points at its show and can carry a season, an episode number and guests.
--
-- The Studio also gets its own image library: `cms_media.library` gains
-- 'studio', and images used only as gameplay or show covers move there.
--
-- Additive and idempotent: safe to re-run. Apply before deploying the code
-- that reads these columns. The old `podcasts` / `podcast_episodes` tables
-- (retired, YouTube links) are left alone.

CREATE TABLE IF NOT EXISTS studio_show (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  kind            text NOT NULL DEFAULT 'podcast',
  description     text,
  host            text,
  cover_image_id  uuid REFERENCES cms_media(id) ON DELETE SET NULL,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_by      text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE studio_show ADD CONSTRAINT studio_show_kind_check CHECK (kind IN ('podcast', 'interview', 'video'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE vods ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'gameplay';
ALTER TABLE vods ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'video';
ALTER TABLE vods ADD COLUMN IF NOT EXISTS show_id uuid REFERENCES studio_show(id) ON DELETE SET NULL;
ALTER TABLE vods ADD COLUMN IF NOT EXISTS guests text;
ALTER TABLE vods ADD COLUMN IF NOT EXISTS season integer;
ALTER TABLE vods ADD COLUMN IF NOT EXISTS episode_number integer;
DO $$ BEGIN
  ALTER TABLE vods ADD CONSTRAINT vods_kind_check CHECK (kind IN ('gameplay', 'podcast', 'interview', 'video'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE vods ADD CONSTRAINT vods_media_type_check CHECK (media_type IN ('video', 'audio'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS vods_kind_published_idx ON vods (kind, is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS vods_show_idx ON vods (show_id);

-- The Studio's image library.
ALTER TABLE cms_media DROP CONSTRAINT IF EXISTS cms_media_library_check;
ALTER TABLE cms_media ADD CONSTRAINT cms_media_library_check
  CHECK (library IN ('content', 'classroom', 'studio'));

-- Covers used only by gameplay or shows move to the Studio's library.
-- (Gameplay covers are read through to_jsonb so this works before or after
-- migration 029 added vods.cover_image_id.)
WITH studio_use AS (
  SELECT m.id FROM cms_media m
  WHERE EXISTS (SELECT 1 FROM vods v WHERE to_jsonb(v) ->> 'cover_image_id' = m.id::text)
     OR EXISTS (SELECT 1 FROM studio_show s WHERE s.cover_image_id = m.id)
),
other_use AS (
  SELECT m.id FROM cms_media m
  WHERE EXISTS (
          SELECT 1 FROM cms_entry e
          WHERE m.id IN (e.cover_image_id, e.thumbnail_image_id, e.draft_cover_image_id, e.draft_thumbnail_image_id)
             OR e.draft_meta ->> 'coverImageId' = m.id::text
             OR e.draft_meta ->> 'thumbnailImageId' = m.id::text
             OR e.body::text LIKE '%' || m.id::text || '%'
             OR e.draft_body::text LIKE '%' || m.id::text || '%')
     OR EXISTS (
          SELECT 1 FROM cms_course c
          WHERE m.id IN (c.cover_image_id, c.thumbnail_image_id, c.draft_cover_image_id, c.draft_thumbnail_image_id))
     OR EXISTS (SELECT 1 FROM cms_lesson l WHERE l.body::text LIKE '%' || m.id::text || '%')
     OR EXISTS (SELECT 1 FROM cms_author_profile p WHERE p.avatar_media_id = m.id)
)
UPDATE cms_media m SET library = 'studio'
WHERE m.library = 'content'
  AND m.id IN (SELECT id FROM studio_use)
  AND m.id NOT IN (SELECT id FROM other_use);

-- Row level security on with no policies, as in 031.
ALTER TABLE studio_show ENABLE ROW LEVEL SECURITY;
