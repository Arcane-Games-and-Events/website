-- 039: a public page for every writer and teacher, at /people/<handle>.
--
-- Clicking a byline on a Library piece or the instructor on a course opens a
-- page with everything that person has made for AGE. The handle is the short
-- name in that address (e.g. "elliot-silva"). It's made from their name the
-- first time they need one and then kept, so links people share keep working
-- even if they change the name they go by.
--
-- This backfills handles for everyone who has written an entry or made a
-- course; the code gives newer people one the first time their page is linked.
--
-- Additive and idempotent: safe to re-run. Until it's applied, names just
-- aren't links (nothing breaks).

ALTER TABLE cms_author_profile ADD COLUMN IF NOT EXISTS handle text;
CREATE UNIQUE INDEX IF NOT EXISTS cms_author_profile_handle_unique
  ON cms_author_profile (handle);

-- A profile row for every writer and teacher who doesn't have one yet.
INSERT INTO cms_author_profile (user_id)
SELECT u.id FROM "user" u
WHERE (EXISTS (SELECT 1 FROM cms_entry e WHERE e.author_id = u.id)
    OR EXISTS (SELECT 1 FROM cms_course c WHERE c.author_id = u.id))
ON CONFLICT (user_id) DO NOTHING;

-- Handles from the name they go by, numbered when two people share a name.
WITH named AS (
  SELECT p.user_id,
         coalesce(nullif(trim(both '-' from lower(regexp_replace(
           coalesce(nullif(trim(p.display_name), ''), u.first_name || ' ' || u.last_name),
           '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'contributor') AS base
  FROM cms_author_profile p
  JOIN "user" u ON u.id = p.user_id
  WHERE p.handle IS NULL
    AND (EXISTS (SELECT 1 FROM cms_entry e WHERE e.author_id = p.user_id)
      OR EXISTS (SELECT 1 FROM cms_course c WHERE c.author_id = p.user_id))
),
taken AS (SELECT handle FROM cms_author_profile WHERE handle IS NOT NULL),
numbered AS (
  SELECT user_id, base,
         row_number() OVER (PARTITION BY base ORDER BY user_id) AS n
  FROM named
)
UPDATE cms_author_profile p
SET handle = CASE
    WHEN n = 1 AND NOT EXISTS (SELECT 1 FROM taken WHERE taken.handle = numbered.base)
      THEN numbered.base
    ELSE numbered.base || '-' || (n + 1)
  END
FROM numbered
WHERE p.user_id = numbered.user_id;
