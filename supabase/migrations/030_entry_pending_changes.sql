-- ============================================================================
-- Pending changes to a live Library entry, beyond its text.
-- ============================================================================
-- A writer's edits to a published or scheduled piece wait for an editor or
-- admin. The title, summary and text already wait in the draft_* columns;
-- this holds the rest: web address, who can read it, tag, cover, thumbnail
-- and video. A key present in draft_meta is a pending change (null means
-- "remove"); approving copies them onto the live piece, discarding drops
-- them. Safe to re-run.
--
-- Rollback (pending non-text changes are lost):
--   ALTER TABLE cms_entry DROP COLUMN IF EXISTS draft_meta;
-- ============================================================================

ALTER TABLE cms_entry ADD COLUMN IF NOT EXISTS draft_meta jsonb;
