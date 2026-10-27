-- ============================================================================
-- Content analytics (v2) — replaces page_view / article_engagement /
-- analytics_event for Library content.
-- ============================================================================
-- Collected in the browser on article and video pages only, so edge-cached
-- pages, client-side navigation and video playback are all measured, and
-- bots/prefetches never create a row. One row per view of one piece; the
-- browser updates it with cumulative numbers every ~15s while it's open.
--
-- Additive and idempotent — safe to re-run. Row level security is on with
-- no policies: the app connects as the table owner / service role, which
-- bypass RLS, while Supabase's public REST API is shut out.
--
-- Rollback:
--   DROP TABLE IF EXISTS ca_event, ca_conversion, ca_view;
-- The legacy tables (page_view, article_engagement, analytics_event) are
-- NOT touched here.
-- ============================================================================

-- One view of one piece of content.
CREATE TABLE IF NOT EXISTS ca_view (
  id               UUID        PRIMARY KEY,                -- generated in the browser
  entry_id         UUID        NOT NULL REFERENCES cms_entry(id) ON DELETE CASCADE,
  visitor_id       UUID        NOT NULL,                   -- anonymous, first-party, per browser
  session_id       UUID        NOT NULL,                   -- per tab session (30 min idle)
  user_id          TEXT        REFERENCES "user"(id) ON DELETE SET NULL,
  audience         TEXT        NOT NULL,                   -- 'anonymous' | 'free' | 'premium' | 'staff'
  gated            BOOLEAN     NOT NULL DEFAULT false,     -- saw the paywall preview, not the full piece
  kind             TEXT        NOT NULL,                   -- 'article' | 'video' | 'article+video'
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualified        BOOLEAN     NOT NULL DEFAULT false,     -- visible for 3s+ (what counts as a view)

  -- where they came from
  source           TEXT        NOT NULL DEFAULT 'direct',  -- internal | search | social | community | email | referral | direct
  referrer_domain  TEXT,
  from_path        TEXT,                                   -- previous page on this site, for internal views
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,

  -- who / what device
  device           TEXT,                                   -- mobile | tablet | desktop
  browser          TEXT,
  os               TEXT,
  country          TEXT,
  viewport_w       INTEGER,

  -- how they read
  visible_seconds  INTEGER     NOT NULL DEFAULT 0,         -- tab visible
  engaged_seconds  INTEGER     NOT NULL DEFAULT 0,         -- visible AND active (or video playing)
  max_depth        SMALLINT    NOT NULL DEFAULT 0,         -- furthest % of the article body reached
  depth_seconds    JSONB       NOT NULL DEFAULT '[]'::jsonb, -- 20 bins: engaged seconds at each 5% of the body
  sections         JSONB       NOT NULL DEFAULT '{}'::jsonb, -- { headingId: { "t": title, "s": seconds, "i": order } }
  completed        BOOLEAN     NOT NULL DEFAULT false,

  -- how they watched
  video_seconds    INTEGER     NOT NULL DEFAULT 0,         -- seconds of video played
  video_duration   INTEGER,
  video_max_pct    SMALLINT    NOT NULL DEFAULT 0,
  video_bins       JSONB       NOT NULL DEFAULT '[]'::jsonb, -- 20 bins: seconds watched in each 5% of the video
  video_plays      INTEGER     NOT NULL DEFAULT 0,
  video_seeks      INTEGER     NOT NULL DEFAULT 0,
  video_completed  BOOLEAN     NOT NULL DEFAULT false,

  -- where they went next
  exit_type        TEXT,                                   -- internal | external | closed
  exit_target      TEXT
);

CREATE INDEX IF NOT EXISTS ca_view_entry_started_idx ON ca_view (entry_id, started_at);
CREATE INDEX IF NOT EXISTS ca_view_started_idx       ON ca_view (started_at);
CREATE INDEX IF NOT EXISTS ca_view_visitor_idx       ON ca_view (visitor_id, started_at);
CREATE INDEX IF NOT EXISTS ca_view_user_idx          ON ca_view (user_id, started_at);

-- Discrete interactions during a view (shares, CTA, decklists, links...).
CREATE TABLE IF NOT EXISTS ca_event (
  id        BIGSERIAL   PRIMARY KEY,
  view_id   UUID        NOT NULL REFERENCES ca_view(id) ON DELETE CASCADE,
  entry_id  UUID        NOT NULL REFERENCES cms_entry(id) ON DELETE CASCADE,
  type      TEXT        NOT NULL,
  label     TEXT,
  depth     SMALLINT,                                      -- body position (%) when it happened
  at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ca_event_entry_at_idx ON ca_event (entry_id, at);
CREATE INDEX IF NOT EXISTS ca_event_view_idx     ON ca_event (view_id);

-- Sign-ups and Premium upgrades, attributed to content at query time by
-- matching the visitor's (or user's) recent views.
CREATE TABLE IF NOT EXISTS ca_conversion (
  id          BIGSERIAL   PRIMARY KEY,
  visitor_id  UUID,
  user_id     TEXT        REFERENCES "user"(id) ON DELETE SET NULL,
  kind        TEXT        NOT NULL,                        -- 'signup' | 'premium'
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ca_conversion_at_idx      ON ca_conversion (at);
CREATE INDEX IF NOT EXISTS ca_conversion_visitor_idx ON ca_conversion (visitor_id);

ALTER TABLE ca_view       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ca_event      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ca_conversion ENABLE ROW LEVEL SECURITY;
