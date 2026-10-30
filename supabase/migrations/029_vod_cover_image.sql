-- ============================================================================
-- A cover image for each bonus gameplay video.
-- ============================================================================
-- Picked from the image library in Desk → Videos → Gameplay, and shown
-- instead of a frame from the video wherever the match is listed (the
-- homepage, the Library, the gameplay page) and before it plays. Deleting
-- the image clears the cover; the video falls back to a frame from Mux.
-- Safe to re-run.
--
-- Rollback:
--   ALTER TABLE vods DROP COLUMN IF EXISTS cover_image_id;
-- ============================================================================

ALTER TABLE vods
  ADD COLUMN IF NOT EXISTS cover_image_id uuid REFERENCES cms_media(id) ON DELETE SET NULL;
