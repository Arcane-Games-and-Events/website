-- ============================================================================
-- CMS author profiles
-- ============================================================================
-- One row per CMS user: how they appear on the pieces they write (byline
-- name, title, bio, photo, links). Kept in its own table so the auth
-- `user` table stays untouched. Additive and idempotent — safe to re-run.
--
-- Rollback: DROP TABLE IF EXISTS cms_author_profile;
-- ============================================================================

CREATE TABLE IF NOT EXISTS cms_author_profile (
  user_id          TEXT        PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  display_name     TEXT,
  title            TEXT,
  bio              TEXT,
  avatar_media_id  UUID        REFERENCES cms_media(id) ON DELETE SET NULL,
  -- [{ "platform": "twitter" | "youtube" | ... | "other", "url": "...", "customLabel": "..." }]
  links            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
