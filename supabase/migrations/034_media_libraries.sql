-- 034: two image libraries — the Desk's (articles, gameplay, author photos)
-- and the Classroom's (courses).
--
-- Each image now belongs to one library. The Desk's pickers and Images page
-- only show `content` images; the Classroom's only show `classroom` images.
-- Anything already placed keeps working either way: pages look images up by
-- id, whatever library they're in.
--
-- Existing images are sorted by what uses them:
--   * used by a course (cover, thumbnail, or inside a topic) and by nothing
--     in the Desk                                   -> classroom
--   * unused, uploaded by a teacher who can't use the Desk   -> classroom
--   * everything else, including images used by both          -> content
--
-- Additive and idempotent: safe to re-run (the sorting only ever moves
-- images that are still in `content` and still qualify). Apply before
-- deploying the code that reads `library`.

ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS library text NOT NULL DEFAULT 'content';
DO $$ BEGIN
  ALTER TABLE cms_media ADD CONSTRAINT cms_media_library_check CHECK (library IN ('content', 'classroom'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS cms_media_library_idx ON cms_media (library, created_at DESC);

WITH course_use AS (
  SELECT m.id FROM cms_media m
  WHERE EXISTS (
          SELECT 1 FROM cms_course c
          WHERE m.id IN (c.cover_image_id, c.thumbnail_image_id, c.draft_cover_image_id, c.draft_thumbnail_image_id))
     OR EXISTS (
          SELECT 1 FROM cms_lesson l
          WHERE l.body::text LIKE '%' || m.id::text || '%'
             OR l.draft_body::text LIKE '%' || m.id::text || '%')
),
content_use AS (
  SELECT m.id FROM cms_media m
  WHERE EXISTS (
          SELECT 1 FROM cms_entry e
          WHERE m.id IN (e.cover_image_id, e.thumbnail_image_id, e.draft_cover_image_id, e.draft_thumbnail_image_id)
             OR e.draft_meta ->> 'coverImageId' = m.id::text
             OR e.draft_meta ->> 'thumbnailImageId' = m.id::text
             OR e.body::text LIKE '%' || m.id::text || '%'
             OR e.draft_body::text LIKE '%' || m.id::text || '%')
     -- gameplay covers (read this way so it works before or after migration 029)
     OR EXISTS (SELECT 1 FROM vods v WHERE to_jsonb(v) ->> 'cover_image_id' = m.id::text)
     OR EXISTS (SELECT 1 FROM cms_author_profile p WHERE p.avatar_media_id = m.id)
),
teacher_only AS (
  SELECT u.id FROM "user" u
  WHERE u.role <> 'admin'
    AND 'creator' = ANY (coalesce(u.additional_roles, '{}'))
    AND NOT ('writer' = ANY (coalesce(u.additional_roles, '{}')))
    AND NOT ('editor' = ANY (coalesce(u.additional_roles, '{}')))
)
UPDATE cms_media m SET library = 'classroom'
WHERE m.library = 'content'
  AND m.id NOT IN (SELECT id FROM content_use)
  AND (m.id IN (SELECT id FROM course_use) OR m.uploaded_by IN (SELECT id FROM teacher_only));
