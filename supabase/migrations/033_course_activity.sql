-- 033: a history of what happened to each course and who did it.
--
-- One row per action: created, sent for approval, withdrawn, returned (with
-- the admin's note), approved, unlisted / listed again, details changed,
-- topics published / unpublished / updated, students added or removed,
-- discussion posts approved or removed, students muted, payouts recorded.
-- The admin course pages show it as a timeline next to what can be worked
-- out from other tables (sales, enrollments, first publishes).
--
-- Additive and idempotent: safe to re-run. The site works before it's
-- applied: actions simply aren't recorded and the timeline says so.

CREATE TABLE IF NOT EXISTS course_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES cms_course(id) ON DELETE CASCADE,
  actor_id    text REFERENCES "user"(id) ON DELETE SET NULL,
  kind        text NOT NULL,
  lesson_id   uuid REFERENCES cms_lesson(id) ON DELETE SET NULL,
  note        text,
  data        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_activity_course_idx ON course_activity (course_id, created_at DESC);

-- Row level security on with no policies, as in 031.
ALTER TABLE course_activity ENABLE ROW LEVEL SECURITY;
