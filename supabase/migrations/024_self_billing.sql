-- ============================================================================
-- Self-billed memberships, checkout intents, a refund log and ARB migration.
-- ============================================================================
-- Memberships used to be Authorize.net ARB subscriptions that the database
-- tried to follow. From this migration on the database is the record: each
-- membership is a `subscription` row, every charge is planned as a
-- `subscription_invoice` before the card is charged, and renewals are run
-- by the site's own hourly job against the member's stored card profile.
--
-- This adds:
--   subscription          one row per membership (status, period, card, dunning)
--   subscription_invoice  one row per planned charge; UNIQUE(subscription, period)
--                         is what makes charging idempotent
--   checkout              ticket purchase intents (written before the charge)
--   refund                one row per void/refund attempted at the gateway
--   refund_request        a member asking for a late ticket refund
--   legacy_arb            a snapshot of every ARB subscription and the
--                         worklist for moving members off ARB
--   billing_run           a log line per run of the billing job
--   billing_notice        one row per email that must only be sent once
--   invoice_seq           the sequence behind invoice numbers
--   saved_card            status, normalized expiry, soft delete
--   "order"               user_id, kind, refunded_amount, checkout_id
--   ticket                checkout_id
--   partner_referral      subscription_id, voided_at / void_reason
--   member_referral       subscription_id, qualifying_trans_id,
--                         reward_subscription_id, reward_note
--
-- Additive and idempotent — safe to re-run. Nothing existing is dropped,
-- renamed or retyped, and the UPDATEs below only fill the new columns, so
-- the code deployed before this migration keeps working against it and an
-- app rollback needs no database change. Row level security is on with no
-- policies, as in 022.
--
-- Preflight (run before this file in production; every count should be 0
-- or explained):
--   SELECT count(*) FROM saved_card WHERE expiration_year !~ '^\d{2}(\d{2})?$';
--   SELECT user_id, payment_profile_id, count(*) FROM saved_card
--     GROUP BY 1, 2 HAVING count(*) > 1;
--   SELECT count(*) FROM "order" o WHERE user_email IS NOT NULL
--     AND NOT EXISTS (SELECT 1 FROM "user" u WHERE lower(u.email) = lower(o.user_email));
--
-- Rollback:
--   DROP TABLE IF EXISTS billing_notice, billing_run, legacy_arb, refund_request,
--     refund, checkout, subscription_invoice, subscription;
--   DROP SEQUENCE IF EXISTS invoice_seq;
--   ALTER TABLE saved_card DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS exp_month,
--     DROP COLUMN IF EXISTS exp_year, DROP COLUMN IF EXISTS deleted_at,
--     DROP COLUMN IF EXISTS verified_at, DROP COLUMN IF EXISTS source,
--     DROP COLUMN IF EXISTS environment;
--   ALTER TABLE "order" DROP COLUMN IF EXISTS user_id, DROP COLUMN IF EXISTS kind,
--     DROP COLUMN IF EXISTS refunded_amount, DROP COLUMN IF EXISTS checkout_id;
--   ALTER TABLE ticket DROP COLUMN IF EXISTS checkout_id;
--   ALTER TABLE partner_referral DROP COLUMN IF EXISTS subscription_id,
--     DROP COLUMN IF EXISTS voided_at, DROP COLUMN IF EXISTS void_reason;
--   ALTER TABLE member_referral DROP COLUMN IF EXISTS subscription_id,
--     DROP COLUMN IF EXISTS qualifying_trans_id, DROP COLUMN IF EXISTS reward_subscription_id,
--     DROP COLUMN IF EXISTS reward_note;
-- ============================================================================

-- ---------------------------------------------------------------- sequence
-- Invoice numbers: AGE-S000123 (subscription), AGE-T000123 (ticket),
-- AGE-R000123 (refund). Authorize.net keeps them on the transaction, which
-- is how an unknown outcome is looked up later.
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;

-- ---------------------------------------------------------------- saved_card
ALTER TABLE saved_card ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'; -- active | expired | invalid | deleted | duplicate
ALTER TABLE saved_card ADD COLUMN IF NOT EXISTS exp_month SMALLINT;
ALTER TABLE saved_card ADD COLUMN IF NOT EXISTS exp_year SMALLINT;
ALTER TABLE saved_card ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE saved_card ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;   -- last time the gateway confirmed the profile
ALTER TABLE saved_card ADD COLUMN IF NOT EXISTS source TEXT;               -- checkout | subscribe | account | migration | transaction
ALTER TABLE saved_card ADD COLUMN IF NOT EXISTS environment TEXT;          -- sandbox | production

-- The old code wrote expiration_month / expiration_year straight from the
-- form, so some rows hold "1228" / "28" (MMYY in the month column) rather
-- than "12" / "2028". Normalize into the new numeric columns and leave the
-- text columns as they were.
UPDATE saved_card
SET exp_month = CASE
      WHEN expiration_month ~ '^\d{4}$' THEN substr(expiration_month, 1, 2)::smallint
      WHEN expiration_month ~ '^\d{1,2}$' THEN expiration_month::smallint
      ELSE NULL END,
    exp_year = CASE
      WHEN expiration_month ~ '^\d{4}$' THEN 2000 + substr(expiration_month, 3, 2)::smallint
      WHEN expiration_year ~ '^\d{4}$' THEN expiration_year::smallint
      WHEN expiration_year ~ '^\d{2}$' THEN 2000 + expiration_year::smallint
      ELSE NULL END
WHERE exp_month IS NULL OR exp_year IS NULL;

UPDATE saved_card
SET status = 'expired'
WHERE status = 'active' AND exp_year IS NOT NULL AND exp_month IS NOT NULL
  AND make_date(exp_year, exp_month, 1) + INTERVAL '1 month' <= date_trunc('month', NOW());

-- Two rows for the same gateway profile: keep the oldest, mark the rest.
UPDATE saved_card s
SET status = 'duplicate'
FROM (
  SELECT id, row_number() OVER (PARTITION BY user_id, payment_profile_id ORDER BY created_at, id) AS rn
  FROM saved_card
) d
WHERE s.id = d.id AND d.rn > 1 AND s.status <> 'duplicate';

CREATE UNIQUE INDEX IF NOT EXISTS saved_card_user_profile_live
  ON saved_card (user_id, payment_profile_id)
  WHERE status NOT IN ('deleted', 'duplicate');

-- ---------------------------------------------------------------- "order"
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS kind TEXT;                     -- ticket | subscription_first | subscription_renewal | legacy_subscription
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS checkout_id UUID;

UPDATE "order" o
SET user_id = u.id
FROM "user" u
WHERE o.user_id IS NULL AND o.user_email IS NOT NULL AND lower(u.email) = lower(o.user_email);

UPDATE "order"
SET kind = CASE
      WHEN meta->>'type' = 'ticket' THEN 'ticket'
      WHEN meta->>'type' IN ('subscription_partner_first', 'subscription_member_first') THEN 'subscription_first'
      WHEN meta->>'type' = 'subscription' THEN 'legacy_subscription'
      ELSE NULL END
WHERE kind IS NULL;

-- Orders refunded under the old code never recorded an amount; the ledger
-- (payment.refunded_amount) is the source for those.
UPDATE "order" o
SET refunded_amount = p.refunded_amount
FROM payment p
WHERE o.refunded_at IS NOT NULL AND o.refunded_amount = 0
  AND p.order_id = o.id AND p.refunded_amount > 0;

CREATE INDEX IF NOT EXISTS order_user_id_idx ON "order" (user_id, created_at DESC);

-- ---------------------------------------------------------------- ticket
ALTER TABLE ticket ADD COLUMN IF NOT EXISTS checkout_id UUID;

-- ---------------------------------------------------------------- subscription
CREATE TABLE IF NOT EXISTS subscription (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What user.subscription_id and payment.subscription_id carry: the old
  -- ARB id for migrated members, otherwise this row's id. Keeps the ledger
  -- and the admin joins continuous across the cutover.
  ref                     TEXT NOT NULL UNIQUE,
  user_id                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  plan                    TEXT NOT NULL,                       -- monthly | yearly
  price_cents             INTEGER NOT NULL,                    -- what each renewal charges
  anchor_day              SMALLINT NOT NULL,                   -- day of month the period turns over
  status                  TEXT NOT NULL,                       -- incomplete | active | past_due | cancelled | ended
  started_at              TIMESTAMPTZ,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,                         -- access runs to here
  next_charge_at          TIMESTAMPTZ,                         -- null while cancelled / ended
  cancelled_at            TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  end_reason              TEXT,                                -- signup_failed | abandoned | cancelled | payment_failed | admin | refunded | account_deleted
  -- The card on file (Authorize.net CIM).
  customer_profile_id     TEXT,
  payment_profile_id      TEXT,
  saved_card_id           UUID REFERENCES saved_card(id) ON DELETE SET NULL,
  -- Dunning.
  failed_attempts         SMALLINT NOT NULL DEFAULT 0,
  first_failed_at         TIMESTAMPTZ,
  next_attempt_at         TIMESTAMPTZ,
  grace_until             TIMESTAMPTZ,
  -- A plan switch waiting for the next renewal.
  pending_plan            TEXT,
  pending_price_cents     INTEGER,
  -- How the member signed up.
  promo_code              TEXT,
  promo_kind              TEXT,                                -- partner | member_referral
  partner_referral_id     UUID,
  member_referral_id      UUID,
  -- Stored-credential flag from the first charge, sent with renewals.
  network_trans_id        TEXT,
  -- Members moved off ARB.
  legacy_arb_id           TEXT UNIQUE,
  legacy_arb_cancelled_at TIMESTAMPTZ,                         -- renewals stay blocked until set
  migrated_at             TIMESTAMPTZ,
  -- Operations.
  hold                    BOOLEAN NOT NULL DEFAULT false,      -- admin pause: no charges while set
  lease_until             TIMESTAMPTZ,
  lease_token             TEXT,
  flags                   TEXT[] NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A member has at most one membership that hasn't ended.
CREATE UNIQUE INDEX IF NOT EXISTS subscription_one_live_per_user
  ON subscription (user_id) WHERE status <> 'ended';
CREATE INDEX IF NOT EXISTS subscription_due_idx
  ON subscription (next_charge_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS subscription_retry_idx
  ON subscription (next_attempt_at) WHERE status = 'past_due';
CREATE INDEX IF NOT EXISTS subscription_period_end_idx
  ON subscription (current_period_end) WHERE status IN ('cancelled', 'past_due');

-- ---------------------------------------------------------------- subscription_invoice
CREATE TABLE IF NOT EXISTS subscription_invoice (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,                            -- 1 for the first period
  kind            TEXT NOT NULL,                               -- first | renewal | migrated
  plan            TEXT,                                        -- the plan this period bills (a pending switch lands here)
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  list_cents      INTEGER NOT NULL,
  discount_cents  INTEGER NOT NULL DEFAULT 0,
  amount_cents    INTEGER NOT NULL,
  status          TEXT NOT NULL,                               -- open | charging | paid | failed | void | refunded | unknown
  invoice_number  TEXT UNIQUE,
  attempts        SMALLINT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error      TEXT,
  trans_id        TEXT UNIQUE,
  network_trans_id TEXT,
  paid_at         TIMESTAMPTZ,
  order_id        UUID REFERENCES "order"(id) ON DELETE SET NULL,
  refunded_cents  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, period_start)
);
CREATE INDEX IF NOT EXISTS subscription_invoice_status_idx
  ON subscription_invoice (status, updated_at) WHERE status IN ('charging', 'unknown');

-- ---------------------------------------------------------------- checkout
CREATE TABLE IF NOT EXISTS checkout (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  event_id        TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,                        -- from the browser; a retry reuses the row
  invoice_number  TEXT UNIQUE,
  status          TEXT NOT NULL,                               -- pending | charging | paid | fulfilled | declined | failed | unknown | expired
  quantity        SMALLINT NOT NULL,
  list_cents      INTEGER NOT NULL,
  discount_cents  INTEGER NOT NULL DEFAULT 0,
  amount_cents    INTEGER NOT NULL,
  payload         JSONB NOT NULL,                              -- players and price lines; never card data
  trans_id        TEXT UNIQUE,
  order_id        UUID REFERENCES "order"(id) ON DELETE SET NULL,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Seats held by checkouts still in flight count against the player cap.
CREATE INDEX IF NOT EXISTS checkout_event_live_idx
  ON checkout (event_id, created_at) WHERE status IN ('pending', 'charging', 'paid', 'unknown');

-- ---------------------------------------------------------------- refund
CREATE TABLE IF NOT EXISTS refund (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trans_id                TEXT NOT NULL,                       -- the charge being returned
  amount_cents            INTEGER NOT NULL,
  method                  TEXT,                                -- void | refund | none
  status                  TEXT NOT NULL,                       -- pending | waiting_settlement | succeeded | failed
  refund_trans_id         TEXT,                                -- the gateway's refund transaction
  invoice_number          TEXT,
  reason                  TEXT,
  requested_by            TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  order_id                UUID REFERENCES "order"(id) ON DELETE SET NULL,
  ticket_ids              UUID[] NOT NULL DEFAULT '{}',
  subscription_invoice_id UUID REFERENCES subscription_invoice(id) ON DELETE SET NULL,
  subscription_effect     TEXT,                                -- keep | end_now | cancel_at_period_end
  refund_request_id       UUID,
  last_error              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at            TIMESTAMPTZ
);
-- One refund at a time per transaction.
CREATE UNIQUE INDEX IF NOT EXISTS refund_in_flight
  ON refund (trans_id) WHERE status IN ('pending', 'waiting_settlement');
CREATE INDEX IF NOT EXISTS refund_trans_idx ON refund (trans_id);

-- ---------------------------------------------------------------- refund_request
CREATE TABLE IF NOT EXISTS refund_request (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',               -- pending | approved | declined | withdrawn
  decided_by    TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  decided_at    TIMESTAMPTZ,
  decision_note TEXT,
  refund_id     UUID REFERENCES refund(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS refund_request_one_pending
  ON refund_request (ticket_id) WHERE status = 'pending';

-- ---------------------------------------------------------------- legacy_arb
CREATE TABLE IF NOT EXISTS legacy_arb (
  arb_id                 TEXT PRIMARY KEY,
  arb_status             TEXT,                                 -- active | canceled | suspended | expired | terminated
  name                   TEXT,
  amount_cents           INTEGER,
  interval_length        SMALLINT,
  interval_unit          TEXT,
  start_date             DATE,
  total_occurrences      INTEGER,
  customer_profile_id    TEXT,
  payment_profile_id     TEXT,
  card_last_four         TEXT,
  card_type              TEXT,
  card_expiration        TEXT,
  profile_email          TEXT,
  pay_count              INTEGER,
  last_approved_at       TIMESTAMPTZ,
  last_approved_trans_id TEXT,
  last_declined_at       TIMESTAMPTZ,
  next_billing_date      TIMESTAMPTZ,
  user_id                TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  match_method           TEXT,                                 -- subscription_id | last_subscription_id | order_email | payment | profile_email
  classification         TEXT,                                 -- migrate | migrate_past_due | migrate_cancelled | orphan_lapsed | duplicate | orphan_unmatched | comp_and_paying | test | inactive
  flags                  TEXT[] NOT NULL DEFAULT '{}',
  decision               TEXT,                                 -- approve | skip | cancel | assign
  decided_by             TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  decided_at             TIMESTAMPTZ,
  user_before            JSONB,                                -- the user row as it was before migration
  charges_after_cancel   JSONB,
  raw                    JSONB,
  scanned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscription_id        UUID REFERENCES subscription(id) ON DELETE SET NULL,
  migrated_at            TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ,
  error                  TEXT
);

-- ---------------------------------------------------------------- billing_run
CREATE TABLE IF NOT EXISTS billing_run (
  id          BIGSERIAL PRIMARY KEY,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  mode        TEXT NOT NULL,                                   -- live | observe
  summary     JSONB,
  error       TEXT
);

-- ---------------------------------------------------------------- billing_notice
CREATE TABLE IF NOT EXISTS billing_notice (
  id      BIGSERIAL PRIMARY KEY,
  kind    TEXT NOT NULL,
  ref     TEXT NOT NULL,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kind, ref)
);

-- ---------------------------------------------------------------- referrals
ALTER TABLE partner_referral ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscription(id) ON DELETE SET NULL;
ALTER TABLE partner_referral ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE partner_referral ADD COLUMN IF NOT EXISTS void_reason TEXT;

ALTER TABLE member_referral ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscription(id) ON DELETE SET NULL;
ALTER TABLE member_referral ADD COLUMN IF NOT EXISTS qualifying_trans_id TEXT;
ALTER TABLE member_referral ADD COLUMN IF NOT EXISTS reward_subscription_id UUID REFERENCES subscription(id) ON DELETE SET NULL;
ALTER TABLE member_referral ADD COLUMN IF NOT EXISTS reward_note TEXT;

-- ---------------------------------------------------------------- security
ALTER TABLE subscription         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout             ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund               ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_request       ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_arb           ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_run          ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_notice       ENABLE ROW LEVEL SECURITY;
