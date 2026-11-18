-- 047: the status page, and the roadmap's table.
--
--   status_check     one row per part of the site per check (every 5
--                    minutes, /api/cron/status): up or not, how long it
--                    took, and why when it failed. Kept 90 days.
--   status_incident  an incident (something broke) or a maintenance window
--                    (planned), with the parts of the site it touches and
--                    whether the site shows a banner while it's on.
--   status_update    the posts on an incident, newest last.
--   roadmap_item     what's coming (/roadmap: Now, Next, Later, Shipped);
--                    filled in by the roadmap work.
--
-- RLS on, no policies: only the server (service role) reads and writes.
-- Additive and safe to re-run. Apply before deploying the status page.

CREATE TABLE IF NOT EXISTS status_check (
  id         bigserial PRIMARY KEY,
  component  text NOT NULL,
  ok         boolean NOT NULL,
  ms         integer,
  note       text,
  at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS status_check_component_at_idx ON status_check (component, at DESC);
CREATE INDEX IF NOT EXISTS status_check_at_idx ON status_check (at);
ALTER TABLE status_check ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS status_incident (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL DEFAULT 'incident' CHECK (kind IN ('incident', 'maintenance')),
  title        text NOT NULL,
  -- incident: minor | major; maintenance: maintenance
  impact       text NOT NULL DEFAULT 'minor' CHECK (impact IN ('minor', 'major', 'maintenance')),
  components   text[] NOT NULL DEFAULT ARRAY[]::text[],
  -- incident: investigating | identified | monitoring | resolved
  -- maintenance: scheduled | in_progress | completed
  status       text NOT NULL DEFAULT 'investigating',
  starts_at    timestamptz NOT NULL DEFAULT now(),
  ends_at      timestamptz,
  resolved_at  timestamptz,
  banner       boolean NOT NULL DEFAULT true,
  created_by   text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS status_incident_open_idx ON status_incident (resolved_at, starts_at DESC);
ALTER TABLE status_incident ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS status_update (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  uuid NOT NULL REFERENCES status_incident(id) ON DELETE CASCADE,
  status       text NOT NULL,
  body         text NOT NULL,
  created_by   text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS status_update_incident_idx ON status_update (incident_id, created_at);
ALTER TABLE status_update ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS roadmap_item (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  body        text,
  stage       text NOT NULL DEFAULT 'later' CHECK (stage IN ('now', 'next', 'later', 'shipped')),
  area        text,
  position    integer NOT NULL DEFAULT 0,
  is_public   boolean NOT NULL DEFAULT true,
  shipped_at  timestamptz,
  created_by  text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS roadmap_item_stage_idx ON roadmap_item (stage, position);
ALTER TABLE roadmap_item ENABLE ROW LEVEL SECURITY;
