-- ============================================================================
-- Custom CMS — Phase 1 foundation
-- ============================================================================
-- Adds all tables needed for the CMS: entries, tags, media, revisions, plus
-- courses/modules/lessons/progress. Extends `user` with an `additional_roles`
-- array for capability roles (writer, creator, tournament staff).
--
-- Nothing in this migration is user-visible on its own — subsequent phases
-- wire up the editor UI, reader pages, and course purchase flow. See the
-- CMS plan for the full rollout.
--
-- Idempotent guards throughout so re-running against a partially-applied
-- database is safe.
-- ============================================================================

-- ------------------------------------------------------------------
-- User: capability roles
-- ------------------------------------------------------------------
-- Independent of the existing `role` column (which is billing tier).
-- Stackable strings: 'writer', 'creator', 'tournament staff'.
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS additional_roles TEXT[] NOT NULL DEFAULT ARRAY[]::text[];


-- ------------------------------------------------------------------
-- Media — uploaded images. Videos go through Mux, not this table.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_media (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by   TEXT        REFERENCES "user"(id),
  storage_path  TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  mime_type     TEXT,
  width         INTEGER,
  height        INTEGER,
  alt           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------------
-- Tag — shared across entries
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_tag (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------------
-- Entry — the main content object. Article-only, video-only, or both.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_entry (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     TEXT        NOT NULL UNIQUE,
  title                    TEXT        NOT NULL,
  excerpt                  TEXT,

  cover_image_id           UUID        REFERENCES cms_media(id),
  thumbnail_image_id       UUID        REFERENCES cms_media(id),

  body                     JSONB,
  read_time                INTEGER,

  -- Video slot (Mux OR YouTube)
  video_provider           TEXT,        -- 'mux' | 'youtube' | NULL
  mux_upload_id            TEXT,
  mux_asset_id             TEXT,
  mux_playback_id          TEXT,
  video_status             TEXT,        -- 'preparing' | 'ready' | 'errored'
  video_duration           INTEGER,     -- seconds
  video_aspect_ratio       TEXT,
  youtube_url              TEXT,
  youtube_video_id         TEXT,
  youtube_title            TEXT,
  youtube_thumbnail_url    TEXT,
  youtube_duration         INTEGER,

  access_mode              TEXT        NOT NULL DEFAULT 'free',   -- 'free' | 'premium'
  status                   TEXT        NOT NULL DEFAULT 'draft',  -- 'draft' | 'scheduled' | 'published' | 'archived'
  published_at             TIMESTAMPTZ,
  scheduled_for            TIMESTAMPTZ,

  author_id                TEXT        REFERENCES "user"(id),

  -- Draft buffer (edits to published/scheduled entries)
  draft_title              TEXT,
  draft_excerpt            TEXT,
  draft_body               JSONB,
  draft_cover_image_id     UUID        REFERENCES cms_media(id),
  draft_thumbnail_image_id UUID        REFERENCES cms_media(id),
  draft_read_time          INTEGER,
  draft_updated_at         TIMESTAMPTZ,
  draft_updated_by         TEXT        REFERENCES "user"(id),

  source                   TEXT        NOT NULL DEFAULT 'custom', -- 'custom' | 'payload'

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cms_entry_status_idx        ON cms_entry (status);
CREATE INDEX IF NOT EXISTS cms_entry_published_at_idx  ON cms_entry (published_at);
CREATE INDEX IF NOT EXISTS cms_entry_author_idx        ON cms_entry (author_id);
CREATE INDEX IF NOT EXISTS cms_entry_draft_updated_idx ON cms_entry (draft_updated_at);


-- ------------------------------------------------------------------
-- Entry <-> Tag many-to-many join
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_entry_tag (
  entry_id UUID NOT NULL REFERENCES cms_entry(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES cms_tag(id)   ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);


-- ------------------------------------------------------------------
-- Course
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_course (
  id                            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                          TEXT        NOT NULL UNIQUE,
  title                         TEXT        NOT NULL,
  description                   TEXT,

  cover_image_id                UUID        REFERENCES cms_media(id),
  thumbnail_image_id            UUID        REFERENCES cms_media(id),

  -- Trailer video (Mux OR YouTube), same shape as entries
  trailer_video_provider        TEXT,
  trailer_mux_upload_id         TEXT,
  trailer_mux_asset_id          TEXT,
  trailer_mux_playback_id       TEXT,
  trailer_video_status          TEXT,
  trailer_video_duration        INTEGER,
  trailer_video_aspect_ratio    TEXT,
  trailer_youtube_url           TEXT,
  trailer_youtube_video_id      TEXT,
  trailer_youtube_title         TEXT,
  trailer_youtube_thumbnail_url TEXT,
  trailer_youtube_duration      INTEGER,

  price                         NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  premium_discount_pct          INTEGER     NOT NULL DEFAULT 0,

  status                        TEXT        NOT NULL DEFAULT 'draft',
  published_at                  TIMESTAMPTZ,

  author_id                     TEXT        REFERENCES "user"(id),

  draft_title                   TEXT,
  draft_description             TEXT,
  draft_cover_image_id          UUID        REFERENCES cms_media(id),
  draft_thumbnail_image_id      UUID        REFERENCES cms_media(id),
  draft_updated_at              TIMESTAMPTZ,
  draft_updated_by              TEXT        REFERENCES "user"(id),

  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cms_course_status_idx       ON cms_course (status);
CREATE INDEX IF NOT EXISTS cms_course_published_at_idx ON cms_course (published_at);


-- ------------------------------------------------------------------
-- Module — chapter inside a course
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_module (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID        NOT NULL REFERENCES cms_course(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  position   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cms_module_course_position_idx ON cms_module (course_id, position);


-- ------------------------------------------------------------------
-- Lesson — leaf inside a module.
--
-- `course_id` is denormalized from `cms_module.course_id` so we can
-- enforce `(course_id, slug)` uniqueness in the DB rather than trusting
-- the application layer. Server-side handlers MUST keep this in sync
-- with the parent module if a lesson is ever reparented.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_lesson (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id                UUID        NOT NULL REFERENCES cms_module(id) ON DELETE CASCADE,
  course_id                UUID        NOT NULL REFERENCES cms_course(id) ON DELETE CASCADE,
  slug                     TEXT        NOT NULL,
  title                    TEXT        NOT NULL,
  position                 INTEGER     NOT NULL DEFAULT 0,
  is_preview               BOOLEAN     NOT NULL DEFAULT FALSE,

  body                     JSONB,
  read_time                INTEGER,

  video_provider           TEXT,
  mux_upload_id            TEXT,
  mux_asset_id             TEXT,
  mux_playback_id          TEXT,
  video_status             TEXT,
  video_duration           INTEGER,
  video_aspect_ratio       TEXT,
  youtube_url              TEXT,
  youtube_video_id         TEXT,
  youtube_title            TEXT,
  youtube_thumbnail_url    TEXT,
  youtube_duration         INTEGER,

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_lesson_course_slug_unique ON cms_lesson (course_id, slug);
CREATE INDEX        IF NOT EXISTS cms_lesson_module_position_idx ON cms_lesson (module_id, position);


-- ------------------------------------------------------------------
-- Lesson progress — per user, per lesson
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_lesson_progress (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT        NOT NULL REFERENCES "user"(id)  ON DELETE CASCADE,
  lesson_id             UUID        NOT NULL REFERENCES cms_lesson(id) ON DELETE CASCADE,
  completed_at          TIMESTAMPTZ,
  last_position_seconds INTEGER     NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_lesson_progress_user_lesson_unique ON cms_lesson_progress (user_id, lesson_id);
CREATE INDEX        IF NOT EXISTS cms_lesson_progress_user_idx           ON cms_lesson_progress (user_id);


-- ------------------------------------------------------------------
-- Revision — shared across entries + lessons
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_revision (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  TEXT        NOT NULL,   -- 'entry' | 'lesson'
  entity_id    UUID        NOT NULL,
  body         JSONB       NOT NULL,
  saved_by     TEXT        REFERENCES "user"(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cms_revision_entity_idx ON cms_revision (entity_type, entity_id, created_at);
