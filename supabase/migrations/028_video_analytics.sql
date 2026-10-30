-- ============================================================================
-- Analytics for bonus gameplay videos.
-- ============================================================================
-- Library pieces already record a ca_view per visit, with watch time and a
-- retention histogram for their video. Gameplay (vods) pages recorded
-- nothing, because a view had to belong to an entry. This lets a view (and
-- its events) belong to a gameplay video instead. Nothing existing changes.
-- Safe to re-run.
--
-- Rollback (only once no gameplay views exist):
--   DELETE FROM ca_view WHERE entry_id IS NULL;
--   ALTER TABLE ca_event DROP CONSTRAINT IF EXISTS ca_event_owner_check, DROP COLUMN IF EXISTS vod_id,
--     ALTER COLUMN entry_id SET NOT NULL;
--   ALTER TABLE ca_view DROP CONSTRAINT IF EXISTS ca_view_owner_check, DROP COLUMN IF EXISTS vod_id,
--     ALTER COLUMN entry_id SET NOT NULL;
-- ============================================================================

ALTER TABLE ca_view
  ALTER COLUMN entry_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS vod_id uuid REFERENCES vods(id) ON DELETE CASCADE;

ALTER TABLE ca_event
  ALTER COLUMN entry_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS vod_id uuid REFERENCES vods(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ca_view_owner_check') THEN
    ALTER TABLE ca_view ADD CONSTRAINT ca_view_owner_check
      CHECK (entry_id IS NOT NULL OR vod_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ca_event_owner_check') THEN
    ALTER TABLE ca_event ADD CONSTRAINT ca_event_owner_check
      CHECK (entry_id IS NOT NULL OR vod_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ca_view_vod_started_idx ON ca_view (vod_id, started_at) WHERE vod_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ca_event_vod_idx ON ca_event (vod_id) WHERE vod_id IS NOT NULL;
