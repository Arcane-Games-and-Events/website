-- ============================================================================
-- Courses: teachers build them, students buy and take them.
-- ============================================================================
-- The course, section (cms_module) and topic (cms_lesson) tables already
-- exist (018). This adds what selling and running a course needs:
--
--   cms_course        review before the first publish
--   cms_lesson        draft/published topics; when each first went live
--   checkout          a checkout can be for a course instead of an event
--   ca_view/ca_event  analytics views can belong to a course or a topic
--   course_enrollment who can take a course, and where they left off
--   course_sale       the teacher earnings ledger (90% share, 14-day hold)
--   teacher_payout    payouts AGE has made, marked by hand
--   course_post       the course discussion, with moderation
--   course_post_report
--   notification      replies, new topics, teacher updates
--
-- Everything is additive. Safe to re-run.
--
-- Rollback (only before any course is sold):
--   DROP TABLE IF EXISTS notification, course_post_report, course_post,
--     teacher_payout, course_sale, course_enrollment;
--   ALTER TABLE ca_event DROP CONSTRAINT IF EXISTS ca_event_owner_check, DROP COLUMN IF EXISTS course_id, DROP COLUMN IF EXISTS lesson_id;
--   ALTER TABLE ca_view DROP CONSTRAINT IF EXISTS ca_view_owner_check, DROP COLUMN IF EXISTS course_id, DROP COLUMN IF EXISTS lesson_id;
--   (then re-add the 028 owner checks)
--   ALTER TABLE checkout DROP CONSTRAINT IF EXISTS checkout_target_check, DROP COLUMN IF EXISTS course_id;
--   ALTER TABLE cms_lesson DROP COLUMN IF EXISTS published_at, DROP COLUMN IF EXISTS first_published_at;
--   ALTER TABLE cms_course DROP COLUMN IF EXISTS submitted_at, DROP COLUMN IF EXISTS review_note, DROP COLUMN IF EXISTS first_published_at;
-- ============================================================================

-- Review before the first publish. status gains 'in_review'.
ALTER TABLE cms_course
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS first_published_at timestamptz;

-- A topic is a draft until published. first_published_at never changes once
-- set: it decides whether a topic is "new since you enrolled" (Premium).
ALTER TABLE cms_lesson
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_published_at timestamptz;

-- A checkout buys tickets to an event or one course.
ALTER TABLE checkout
  ALTER COLUMN event_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES cms_course(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkout_target_check') THEN
    ALTER TABLE checkout ADD CONSTRAINT checkout_target_check
      CHECK ((event_id IS NOT NULL) <> (course_id IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS checkout_course_idx ON checkout (course_id) WHERE course_id IS NOT NULL;

-- Analytics: a view belongs to an entry, a gameplay video, a course page or a topic.
ALTER TABLE ca_view
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES cms_course(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES cms_lesson(id) ON DELETE CASCADE;
ALTER TABLE ca_event
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES cms_course(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES cms_lesson(id) ON DELETE CASCADE;

ALTER TABLE ca_view DROP CONSTRAINT IF EXISTS ca_view_owner_check;
ALTER TABLE ca_view ADD CONSTRAINT ca_view_owner_check
  CHECK (entry_id IS NOT NULL OR vod_id IS NOT NULL OR course_id IS NOT NULL);
ALTER TABLE ca_event DROP CONSTRAINT IF EXISTS ca_event_owner_check;
ALTER TABLE ca_event ADD CONSTRAINT ca_event_owner_check
  CHECK (entry_id IS NOT NULL OR vod_id IS NOT NULL OR course_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS ca_view_course_started_idx ON ca_view (course_id, started_at) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ca_view_lesson_idx ON ca_view (lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ca_event_course_idx ON ca_event (course_id) WHERE course_id IS NOT NULL;

-- Who can take a course. One live enrollment per student per course.
CREATE TABLE IF NOT EXISTS course_enrollment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES cms_course(id) ON DELETE CASCADE,
  user_id         text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source          text NOT NULL,              -- purchase | comp
  order_id        uuid REFERENCES "order"(id) ON DELETE SET NULL,
  added_by        text REFERENCES "user"(id) ON DELETE SET NULL,
  last_lesson_id  uuid REFERENCES cms_lesson(id) ON DELETE SET NULL,
  last_seen_at    timestamptz,
  muted_at        timestamptz,
  muted_by        text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,
  revoked_reason  text
);
CREATE UNIQUE INDEX IF NOT EXISTS course_enrollment_live_unique
  ON course_enrollment (course_id, user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS course_enrollment_user_idx ON course_enrollment (user_id);

-- The teacher earnings ledger: one row per paid enrollment.
CREATE TABLE IF NOT EXISTS course_sale (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES cms_course(id) ON DELETE RESTRICT,
  teacher_id      text REFERENCES "user"(id) ON DELETE SET NULL,
  enrollment_id   uuid REFERENCES course_enrollment(id) ON DELETE SET NULL,
  order_id        uuid REFERENCES "order"(id) ON DELETE SET NULL,
  trans_id        text UNIQUE,
  gross_cents     integer NOT NULL,
  refunded_cents  integer NOT NULL DEFAULT 0,
  share_pct       smallint NOT NULL DEFAULT 90,
  sold_at         timestamptz NOT NULL DEFAULT now(),
  payable_at      timestamptz NOT NULL,
  payout_id       uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_sale_teacher_idx ON course_sale (teacher_id, payable_at);
CREATE INDEX IF NOT EXISTS course_sale_course_idx ON course_sale (course_id, sold_at);

-- Payouts AGE has made (outside the site), marked here by an admin.
CREATE TABLE IF NOT EXISTS teacher_payout (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  pay_date        date NOT NULL,
  amount_cents    integer NOT NULL,
  sale_count      integer NOT NULL,
  status          text NOT NULL DEFAULT 'paid',
  paid_at         timestamptz NOT NULL DEFAULT now(),
  paid_by         text REFERENCES "user"(id) ON DELETE SET NULL,
  reference       text,
  note            text
);
CREATE INDEX IF NOT EXISTS teacher_payout_teacher_idx ON teacher_payout (teacher_id, pay_date);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_sale_payout_fk') THEN
    ALTER TABLE course_sale ADD CONSTRAINT course_sale_payout_fk
      FOREIGN KEY (payout_id) REFERENCES teacher_payout(id) ON DELETE SET NULL;
  END IF;
END $$;

-- The course discussion. A thread has no parent; a reply points at its thread.
CREATE TABLE IF NOT EXISTS course_post (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES cms_course(id) ON DELETE CASCADE,
  lesson_id       uuid REFERENCES cms_lesson(id) ON DELETE SET NULL,
  parent_id       uuid REFERENCES course_post(id) ON DELETE CASCADE,
  author_id       text REFERENCES "user"(id) ON DELETE SET NULL,
  kind            text NOT NULL DEFAULT 'post',     -- post | update
  title           text,
  body            text NOT NULL,
  pinned          boolean NOT NULL DEFAULT false,
  locked          boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'visible',  -- visible | held | removed
  flag_reasons    text[] NOT NULL DEFAULT '{}',
  reviewed_by     text REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  edited_at       timestamptz,
  last_reply_at   timestamptz,
  deleted_at      timestamptz
);
CREATE INDEX IF NOT EXISTS course_post_threads_idx ON course_post (course_id, last_reply_at) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS course_post_parent_idx ON course_post (parent_id, created_at);
CREATE INDEX IF NOT EXISTS course_post_review_idx ON course_post (course_id) WHERE status = 'held';
CREATE INDEX IF NOT EXISTS course_post_author_idx ON course_post (author_id, created_at);

CREATE TABLE IF NOT EXISTS course_post_report (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES course_post(id) ON DELETE CASCADE,
  reporter_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  UNIQUE (post_id, reporter_id)
);

-- In-site notifications: replies, new threads, teacher updates, new topics.
CREATE TABLE IF NOT EXISTS notification (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind            text NOT NULL,   -- reply | new_thread | course_update | new_topic | post_removed
  course_id       uuid REFERENCES cms_course(id) ON DELETE CASCADE,
  lesson_id       uuid REFERENCES cms_lesson(id) ON DELETE CASCADE,
  post_id         uuid REFERENCES course_post(id) ON DELETE CASCADE,
  actor_id        text REFERENCES "user"(id) ON DELETE SET NULL,
  data            jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);
CREATE INDEX IF NOT EXISTS notification_user_idx ON notification (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_unread_idx ON notification (user_id) WHERE read_at IS NULL;

-- Row level security is on with no policies, as in 022 and 024: the site
-- reaches these tables only through its own server connection, and the
-- public API keys get nothing.
ALTER TABLE course_enrollment  ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sale        ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payout     ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_post        ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_post_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification       ENABLE ROW LEVEL SECURITY;
