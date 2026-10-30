-- ============================================================================
-- Image library: names, credits, processing state and resized copies.
-- ============================================================================
-- Every uploaded image gets resized WebP and AVIF copies stored beside the
-- original in its own folder, a tiny blurred preview shown while it loads,
-- and a credit shown beneath it on the site. The Desk's Images page lists,
-- edits and deletes uploads; crop / rotate saves a new copy that points back
-- at its source.
--
-- Additive only: existing rows stay valid (status defaults to 'ready', and a
-- null variant_prefix means "no copies, serve the original"). Safe to re-run.
--
-- Rollback:
--   ALTER TABLE cms_media
--     DROP COLUMN IF EXISTS name, DROP COLUMN IF EXISTS file_size,
--     DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS variant_prefix,
--     DROP COLUMN IF EXISTS variant_widths, DROP COLUMN IF EXISTS has_avif,
--     DROP COLUMN IF EXISTS blur, DROP COLUMN IF EXISTS credit,
--     DROP COLUMN IF EXISTS credit_url, DROP COLUMN IF EXISTS derived_from,
--     DROP COLUMN IF EXISTS updated_at;
--   DROP INDEX IF EXISTS cms_media_uploaded_by_created_idx;
--   DROP INDEX IF EXISTS cms_media_created_idx;
-- ============================================================================

ALTER TABLE cms_media
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS file_size integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS variant_prefix text,
  ADD COLUMN IF NOT EXISTS variant_widths integer[],
  ADD COLUMN IF NOT EXISTS has_avif boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blur text,
  ADD COLUMN IF NOT EXISTS credit text,
  ADD COLUMN IF NOT EXISTS credit_url text,
  ADD COLUMN IF NOT EXISTS derived_from uuid REFERENCES cms_media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cms_media_status_check') THEN
    ALTER TABLE cms_media ADD CONSTRAINT cms_media_status_check
      CHECK (status IN ('uploading', 'processing', 'ready', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cms_media_uploaded_by_created_idx
  ON cms_media (uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS cms_media_created_idx
  ON cms_media (created_at DESC);

-- Give existing uploads a name from their file path so the library can show
-- and search them.
UPDATE cms_media
SET name = regexp_replace(regexp_replace(storage_path, '^.*/', ''), '\.[A-Za-z0-9]+$', '')
WHERE name IS NULL;
