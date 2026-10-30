-- ============================================================================
-- One tag per Library entry.
-- ============================================================================
-- Each piece is filed under a single topic: it is the rubric printed above
-- the title and the tag page the piece appears on. The Desk only ever sets
-- one, and this makes the database hold to that.
--
-- If an entry somehow has several, the first tag by name is kept (the one
-- the article page already shows as its rubric). Safe to re-run.
--
-- Rollback:
--   DROP INDEX IF EXISTS cms_entry_tag_entry_id_unique;
-- ============================================================================

DELETE FROM cms_entry_tag et
USING cms_tag t
WHERE et.tag_id = t.id
  AND EXISTS (
    SELECT 1
    FROM cms_entry_tag et2
    JOIN cms_tag t2 ON t2.id = et2.tag_id
    WHERE et2.entry_id = et.entry_id
      AND (t2.name, t2.id) < (t.name, t.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS cms_entry_tag_entry_id_unique ON cms_entry_tag (entry_id);
