-- 032: changes to a live topic wait for the teacher's Update.
--
-- Once a course is live, editing one of its published topics saves into
-- these draft columns (privately, as you type) instead of the topic itself.
-- Students keep reading the published version until the teacher presses
-- Update topic, which copies the draft over and clears it; Discard clears
-- it without publishing. Topics in a course that isn't live yet, and
-- unpublished topics, still save straight to title/body.
--
-- Additive and idempotent: safe to re-run. Apply before deploying the code
-- that reads these columns.

ALTER TABLE cms_lesson ADD COLUMN IF NOT EXISTS draft_title text;
ALTER TABLE cms_lesson ADD COLUMN IF NOT EXISTS draft_body jsonb;
ALTER TABLE cms_lesson ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz;
