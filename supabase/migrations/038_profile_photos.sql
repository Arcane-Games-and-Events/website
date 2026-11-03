-- 038: profile photos get an image library of their own.
--
-- Everyone can set a profile photo from their account page (whatever their
-- role), and teachers and writers from the Classroom and the Desk too. It's
-- one photo per person (cms_author_profile.avatar_media_id), shown on their
-- course pages and bylines. Profile photos live in the 'profile' library so
-- they never show up in the Desk's, Classroom's or Studio's image pickers.
--
-- Additive and idempotent: safe to re-run. Apply before deploying the code
-- that uploads profile photos (until then, uploads fail with a clear message).

ALTER TABLE cms_media DROP CONSTRAINT IF EXISTS cms_media_library_check;
ALTER TABLE cms_media ADD CONSTRAINT cms_media_library_check
  CHECK (library IN ('content', 'classroom', 'studio', 'profile'));
