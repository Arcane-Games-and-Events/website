-- 049: Desk images belong to their entry.
--
-- The Desk no longer has one shared image library (its Images tab is gone).
-- Each article or video entry has its own images: an entry's pickers (cover,
-- thumbnail, images in the body) show that entry's images, and uploads made
-- there are filed under it. The same as courses in migration 037.
--
-- Existing Desk images are filed by what uses them:
--   1. an entry's cover, thumbnail, draft cover or draft thumbnail;
--   2. an image inside an entry's body (live or draft);
--   3. otherwise, the uploader's entry, when they have exactly one.
-- Anything left keeps entry_id null and shows under "Older uploads" in the
-- pickers (its uploader's, and admins' and editors'). Author photos and
-- other Desk images not in an entry stay where they are.
--
-- Additive and idempotent: safe to re-run (only images with no entry yet
-- are filed). Apply before deploying the code that reads entry_id.

ALTER TABLE cms_media
  ADD COLUMN IF NOT EXISTS entry_id uuid REFERENCES cms_entry (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cms_media_entry_idx ON cms_media (entry_id, created_at DESC);

-- 1. covers and thumbnails
UPDATE cms_media m SET entry_id = e.id
FROM cms_entry e
WHERE m.library = 'content' AND m.entry_id IS NULL
  AND m.id IN (e.cover_image_id, e.thumbnail_image_id, e.draft_cover_image_id, e.draft_thumbnail_image_id);

-- 2. images inside an entry's body (the first entry found, if more than one uses it)
UPDATE cms_media m SET entry_id = (
  SELECT e.id FROM cms_entry e
  WHERE e.body::text LIKE '%' || m.id::text || '%'
     OR e.draft_body::text LIKE '%' || m.id::text || '%'
  ORDER BY e.created_at
  LIMIT 1)
WHERE m.library = 'content' AND m.entry_id IS NULL
  AND EXISTS (
    SELECT 1 FROM cms_entry e
    WHERE e.body::text LIKE '%' || m.id::text || '%'
       OR e.draft_body::text LIKE '%' || m.id::text || '%');

-- 3. the uploader's only entry
UPDATE cms_media m SET entry_id = sole.entry_id
FROM (
  SELECT author_id, min(id::text)::uuid AS entry_id
  FROM cms_entry
  WHERE author_id IS NOT NULL
  GROUP BY author_id
  HAVING count(*) = 1
) sole
WHERE m.library = 'content' AND m.entry_id IS NULL
  AND m.uploaded_by = sole.author_id;
