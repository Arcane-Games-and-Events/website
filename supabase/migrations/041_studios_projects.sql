-- 041: AGE Studios projects, and a round for matches.
--
-- A project is anything AGE makes that isn't a video in the Studio: an
-- interactive page (a top-100 ranking), a stats page, a piece of software,
-- a film hosted elsewhere. Staff add a card for it in the Studio
-- (/studio/projects) and AGE Studios (/studios) lists it. The card links to
-- the project's own page on the site, or to an outside address.
--
-- `vods.round` says where in an event a match was played ("Round 5",
-- "Top 8", "Finals"), for the Library's match archive (/library/matches).
--
-- Additive and idempotent: safe to re-run. Apply before deploying the code
-- that reads these.

CREATE TABLE IF NOT EXISTS studio_project (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  dek             text,
  type            text NOT NULL DEFAULT 'interactive',
  cover_image_id  uuid REFERENCES cms_media(id) ON DELETE SET NULL,
  href            text,
  is_premium      boolean NOT NULL DEFAULT false,
  is_featured     boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  sort_order      integer NOT NULL DEFAULT 0,
  created_by      text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE studio_project ADD CONSTRAINT studio_project_type_check
    CHECK (type IN ('interactive', 'stats', 'software', 'film', 'feature'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE studio_project ADD CONSTRAINT studio_project_status_check
    CHECK (status IN ('draft', 'published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS studio_project_live_idx
  ON studio_project (status, is_featured DESC, published_at DESC);

ALTER TABLE vods ADD COLUMN IF NOT EXISTS round text;

-- Row level security on with no policies, and nothing granted to the
-- public roles, as 040 does for every table.
ALTER TABLE studio_project ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON studio_project FROM anon, authenticated;
