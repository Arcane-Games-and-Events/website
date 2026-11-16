-- ============================================================================
-- 045: circuits and stores (the franchise model)
-- ============================================================================
-- Each AGE Open circuit is run by a local game store. A store belongs to a
-- circuit, any number of AGE accounts manage it, and it creates its own
-- events (live as soon as they're saved). AGE takes the ticket money and
-- pays each store its share once a month, recorded by hand.
--
--   circuit               the circuits, with their colour, time zone and the
--                         picture admins upload, so a new one needs no code
--                         change. name matches the
--                         free-text circuit on events, standings, heroes and
--                         matches, which keep working as they are.
--   store                 a store: its circuit, address and contact, and an
--                         optional revenue share that overrides the default.
--   store_member          the accounts that manage a store. An owner can add
--                         and remove members; a manager runs events.
--   events.store_id       the store that runs an event (none = run by AGE).
--   store_program         one row: the default revenue share and who pays
--                         the card fees. Unset until the owner decides.
--   store_ledger          what each store earns: one row per ticket sold at
--                         its events, one per refund, and manual adjustments,
--                         each in a statement month. Written from the tickets
--                         by the site (safe to repeat), never by hand.
--   store_statement       one per store per month: open, locked (totals
--                         frozen) or paid (date, method, reference).
--   store_activity        what happened in a store and who did it.
--
-- Then the existing circuits are copied in: Los Angeles, St. Louis and New
-- England with their colours and time zones, plus any other circuit name
-- already on an event (grey, Central time, to be edited in admin).
--
-- Additive and safe to re-run. The site works before it's applied: the
-- store pages say the migration is needed and nothing else changes.
--
-- Rollback (deploy the code from before this migration first; this loses
-- stores, members and payout history, so download the statements first):
--   ALTER TABLE events DROP COLUMN IF EXISTS store_id;
--   DROP TABLE IF EXISTS store_activity, store_statement, store_ledger,
--     store_program, store_member, store, circuit;
-- ============================================================================

CREATE TABLE IF NOT EXISTS circuit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,          -- "Los Angeles": what events.circuit holds
  slug        text NOT NULL UNIQUE,          -- "los-angeles"
  short       text NOT NULL,                 -- "LA"
  region      text,                          -- "West Coast"
  timezone    text NOT NULL DEFAULT 'America/Chicago',  -- the venues' clock
  color       text NOT NULL DEFAULT '#5c5a52' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  blurb       text,                          -- a line or two for the AGE Open pages
  sort        integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- The circuit's picture, uploaded in admin (Stores → a circuit). Added
-- after 045 first went out, so re-running this file adds it.
ALTER TABLE circuit ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE circuit ADD COLUMN IF NOT EXISTS image_path text;

CREATE TABLE IF NOT EXISTS store (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id     uuid NOT NULL REFERENCES circuit(id) ON DELETE RESTRICT,
  name           text NOT NULL,
  slug           text NOT NULL UNIQUE,       -- /store/<slug>
  address        text,
  city           text,
  state          text,
  website        text,
  phone          text,
  contact_email  text,
  -- The store's share of ticket revenue, 0–1. Null = the program default.
  revenue_share  numeric(5,4) CHECK (revenue_share IS NULL OR (revenue_share >= 0 AND revenue_share <= 1)),
  active         boolean NOT NULL DEFAULT true,
  created_by     text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_circuit_idx ON store (circuit_id);

CREATE TABLE IF NOT EXISTS store_member (
  store_id    uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager')),
  added_by    text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, user_id)
);
CREATE INDEX IF NOT EXISTS store_member_user_idx ON store_member (user_id);

ALTER TABLE events ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES store(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS events_store_idx ON events (store_id, event_date);

CREATE TABLE IF NOT EXISTS store_program (
  id             integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_share  numeric(5,4) CHECK (default_share IS NULL OR (default_share >= 0 AND default_share <= 1)),
  fee_payer      text NOT NULL DEFAULT 'age' CHECK (fee_payer IN ('age', 'store')),
  updated_by     text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
INSERT INTO store_program (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS store_ledger (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES store(id) ON DELETE RESTRICT,
  entry_type       text NOT NULL CHECK (entry_type IN ('sale', 'refund', 'adjustment')),
  event_id         text REFERENCES events(id) ON DELETE SET NULL,
  ticket_id        uuid REFERENCES ticket(id) ON DELETE SET NULL,
  gross_cents      integer NOT NULL DEFAULT 0,   -- what the player paid (negative on refunds)
  fee_cents        integer NOT NULL DEFAULT 0,   -- card fee charged to the store, if it pays them
  share_rate       numeric(5,4),                 -- the store's share when the row was written
  store_cents      integer NOT NULL,             -- what the store earns (negative on refunds)
  age_cents        integer NOT NULL DEFAULT 0,   -- what AGE keeps
  statement_month  date NOT NULL,                -- the first of the month it's paid in
  note             text,                         -- required on adjustments (the admin's reason)
  created_by       text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
-- One sale and at most one refund per ticket, so writing them again is harmless.
CREATE UNIQUE INDEX IF NOT EXISTS store_ledger_ticket_entry_key
  ON store_ledger (ticket_id, entry_type) WHERE ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS store_ledger_statement_idx ON store_ledger (store_id, statement_month);
CREATE INDEX IF NOT EXISTS store_ledger_event_idx ON store_ledger (event_id);

CREATE TABLE IF NOT EXISTS store_statement (
  store_id      uuid NOT NULL REFERENCES store(id) ON DELETE RESTRICT,
  month         date NOT NULL,                  -- the first of the month
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'paid')),
  -- Frozen when the statement is locked.
  gross_cents   integer,
  refund_cents  integer,
  fee_cents     integer,
  adjust_cents  integer,
  amount_cents  integer,                        -- what the store is owed
  locked_at     timestamptz,
  locked_by     text REFERENCES "user"(id) ON DELETE SET NULL,
  paid_at       timestamptz,
  paid_by       text REFERENCES "user"(id) ON DELETE SET NULL,
  method        text,                           -- check, ACH, PayPal…
  reference     text,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, month)
);

CREATE TABLE IF NOT EXISTS store_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
  actor_id    text REFERENCES "user"(id) ON DELETE SET NULL,
  kind        text NOT NULL,   -- event_created, event_updated, event_cancelled, member_added, …
  event_id    text REFERENCES events(id) ON DELETE SET NULL,
  note        text,
  data        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_activity_store_idx ON store_activity (store_id, created_at DESC);

-- The circuits so far. Colours match the site's --ed-cc-* tokens.
INSERT INTO circuit (name, slug, short, region, timezone, color, sort) VALUES
  ('Los Angeles', 'los-angeles', 'LA',  'West Coast', 'America/Los_Angeles', '#1b4f9c', 1),
  ('St. Louis',   'st-louis',    'STL', 'Midwest',    'America/Chicago',     '#2f7d46', 2),
  ('New England', 'new-england', 'NE',  'East Coast', 'America/New_York',    '#6a4a86', 3)
ON CONFLICT (name) DO NOTHING;

-- Their story, as the AGE Open's circuit pop-out tells it (edited in admin
-- from then on). Only fills an empty field, so re-running keeps edits.
UPDATE circuit SET blurb = 'The birthplace of the series. Los Angeles players build like nobody else: if a list has never been tried, someone here is already sleeving it up. It is also home to some of the most decorated players in Flesh and Blood, so the new ideas have to beat the very best.'
  WHERE name = 'Los Angeles' AND coalesce(blurb, '') = '';
UPDATE circuit SET blurb = 'St. Louis is where fresh faces are earning their reputations. The play is tight and the deck choices are solid, with some of the most consistent players on the circuit, but a specialist on the right hero can still walk away with the whole thing.'
  WHERE name = 'St. Louis' AND coalesce(blurb, '') = '';
UPDATE circuit SET blurb = 'If you want to watch a master of one hero find lines no one else sees, this is where you go. New England is a tight-knit community that welcomes newcomers by throwing them in the deep end, which is exactly why players come here to get better.'
  WHERE name = 'New England' AND coalesce(blurb, '') = '';

-- Any other circuit already on an event, to be tidied up in admin.
INSERT INTO circuit (name, slug, short, sort)
SELECT c.name,
       trim(both '-' from regexp_replace(lower(c.name), '[^a-z0-9]+', '-', 'g')),
       upper(left(regexp_replace(c.name, '[^A-Za-z]', '', 'g'), 3)),
       100
FROM (SELECT DISTINCT trim(circuit) AS name FROM events WHERE coalesce(trim(circuit), '') <> '') c
WHERE NOT EXISTS (SELECT 1 FROM circuit x WHERE lower(x.name) = lower(c.name))
  AND trim(both '-' from regexp_replace(lower(c.name), '[^a-z0-9]+', '-', 'g')) <> ''
ON CONFLICT DO NOTHING;

-- Not readable through the public API (see 040): only the server touches these.
ALTER TABLE circuit ENABLE ROW LEVEL SECURITY;
ALTER TABLE store ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_statement ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_activity ENABLE ROW LEVEL SECURITY;
