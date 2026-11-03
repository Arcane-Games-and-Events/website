-- 037: course images belong to their course.
--
-- The Classroom no longer has one shared image library. Each course has its
-- own images: a course's pickers (cover, thumbnail, images inside a topic)
-- show that course's images, and uploads made there are filed under it.
--
-- Existing Classroom images are filed by what uses them:
--   1. a course's cover, thumbnail, draft cover or draft thumbnail;
--   2. an image inside one of the course's topics (live or draft text);
--   3. otherwise, the uploader's course, when they have exactly one.
-- Anything left keeps course_id null and shows under "Older uploads" in the
-- pickers (its uploader's, and admins' and editors').
--
-- Additive and idempotent: safe to re-run (only images with no course yet
-- are filed). Apply before deploying the code that reads course_id.

ALTER TABLE cms_media
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES cms_course (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cms_media_course_idx ON cms_media (course_id, created_at DESC);

-- 1. covers and thumbnails
UPDATE cms_media m SET course_id = c.id
FROM cms_course c
WHERE m.library = 'classroom' AND m.course_id IS NULL
  AND m.id IN (c.cover_image_id, c.thumbnail_image_id, c.draft_cover_image_id, c.draft_thumbnail_image_id);

-- 2. images inside a topic (the first course found, if more than one uses it)
UPDATE cms_media m SET course_id = (
  SELECT l.course_id FROM cms_lesson l
  WHERE l.body::text LIKE '%' || m.id::text || '%'
     OR l.draft_body::text LIKE '%' || m.id::text || '%'
  ORDER BY l.created_at
  LIMIT 1)
WHERE m.library = 'classroom' AND m.course_id IS NULL
  AND EXISTS (
    SELECT 1 FROM cms_lesson l
    WHERE l.body::text LIKE '%' || m.id::text || '%'
       OR l.draft_body::text LIKE '%' || m.id::text || '%');

-- 3. the uploader's only course
UPDATE cms_media m SET course_id = sole.course_id
FROM (
  SELECT author_id, min(id::text)::uuid AS course_id
  FROM cms_course
  WHERE author_id IS NOT NULL
  GROUP BY author_id
  HAVING count(*) = 1
) sole
WHERE m.library = 'classroom' AND m.course_id IS NULL
  AND m.uploaded_by = sole.author_id;
