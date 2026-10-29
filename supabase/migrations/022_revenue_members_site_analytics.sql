-- ============================================================================
-- Revenue ledger, member history, comp tracking and site page views.
-- ============================================================================
-- Until now only each subscription's first charge was written to "order";
-- renewals, refund dates, comped memberships and the premium event discount
-- were never recorded, so revenue could not be worked out from the database.
--
-- This adds:
--   payment        one row per Authorize.net transaction (what was collected,
--                  what it was for, any discount it carried, refunds)
--   member_event   a history of membership changes (subscribed, cancelled,
--                  payment failed, expired, comped, comp removed)
--   "user"         comp_reason / comped_at / comped_by for members given
--                  premium without paying, and last_subscription_id so a
--                  lapsed subscriber can still be told apart from a comp
--   "order"        refunded_at
--   ca_conversion  session_id / path / meta (site funnel steps)
--   ca_pageview    one row per page view anywhere on the site
--
-- Additive and idempotent — safe to re-run. Row level security is on with
-- no policies: the app connects as the table owner / service role, which
-- bypass RLS, while Supabase's public REST API is shut out.
--
-- Rollback:
--   DROP TABLE IF EXISTS ca_pageview, member_event, payment;
--   ALTER TABLE "user" DROP COLUMN IF EXISTS comp_reason, DROP COLUMN IF EXISTS comped_at,
--     DROP COLUMN IF EXISTS comped_by, DROP COLUMN IF EXISTS last_subscription_id;
--   ALTER TABLE "order" DROP COLUMN IF EXISTS refunded_at;
--   ALTER TABLE ca_conversion DROP COLUMN IF EXISTS session_id, DROP COLUMN IF EXISTS path,
--     DROP COLUMN IF EXISTS meta;
-- ============================================================================

-- ---------------------------------------------------------------- "user"
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS comp_reason TEXT;              -- staff | writer | teacher | partner | friend | trial | other
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS comped_at TIMESTAMPTZ;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS comped_by TEXT REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_subscription_id TEXT;     -- survives the subscription_id reset on expiry

-- Remember every current subscription id.
UPDATE "user"
SET last_subscription_id = subscription_id
WHERE subscription_id IS NOT NULL AND last_subscription_id IS NULL;

-- Tag today's comps. Reasons are a best guess from capability roles; the
-- admin pages let you correct them.
UPDATE "user"
SET comp_reason = CASE
      WHEN 'writer' = ANY(additional_roles) OR 'editor' = ANY(additional_roles) THEN 'writer'
      WHEN 'creator' = ANY(additional_roles) THEN 'teacher'
      WHEN 'tournament staff' = ANY(additional_roles) THEN 'staff'
      ELSE 'other'
    END,
    comped_at = COALESCE(subscription_start_date, created_at, NOW())
WHERE role = 'premium' AND subscription_id IS NULL AND comp_reason IS NULL;

-- ---------------------------------------------------------------- "order"
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- ---------------------------------------------------------------- payment
CREATE TABLE IF NOT EXISTS payment (
  id                BIGSERIAL     PRIMARY KEY,
  provider          TEXT          NOT NULL DEFAULT 'authnet',
  trans_id          TEXT          NOT NULL UNIQUE,            -- Authorize.net transaction id
  kind              TEXT          NOT NULL,                   -- sub_first | sub_renewal | sub_promo_first | ticket
  user_id           TEXT          REFERENCES "user"(id) ON DELETE SET NULL,
  user_email        TEXT,
  subscription_id   TEXT,
  subscription_type TEXT,                                     -- monthly | yearly
  pay_num           INT,                                      -- 1 = first charge of a subscription
  order_id          UUID          REFERENCES "order"(id) ON DELETE SET NULL,
  ticket_id         UUID          REFERENCES ticket(id) ON DELETE SET NULL,
  event_id          TEXT          REFERENCES events(id) ON DELETE SET NULL,
  amount            NUMERIC(10,2) NOT NULL,                   -- collected
  list_amount       NUMERIC(10,2),                            -- before any discount
  discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_kind     TEXT,                                     -- premium_event | partner | member_referral
  promo_code        TEXT,
  occurred_at       TIMESTAMPTZ   NOT NULL,
  refunded_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  refunded_at       TIMESTAMPTZ,
  source            TEXT          NOT NULL,                   -- app | webhook | sync | backfill
  verified_at       TIMESTAMPTZ,                              -- confirmed against Authorize.net
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payment_occurred_idx     ON payment (occurred_at);
CREATE INDEX IF NOT EXISTS payment_user_idx         ON payment (user_id, occurred_at);
CREATE INDEX IF NOT EXISTS payment_subscription_idx ON payment (subscription_id, pay_num);
CREATE INDEX IF NOT EXISTS payment_kind_idx         ON payment (kind, occurred_at);
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;

-- Every ticket sold so far, with the premium discount rebuilt from the
-- event's price. (If a price was edited after a sale, that row's discount
-- is off by the difference.)
INSERT INTO payment (trans_id, kind, user_id, user_email, order_id, ticket_id, event_id,
                     amount, list_amount, discount_amount, discount_kind, occurred_at,
                     refunded_amount, refunded_at, source)
SELECT
  COALESCE(t.transaction_id, 'ticket:' || t.id::text),
  'ticket',
  t.user_id,
  o.user_email,
  t.order_id,
  t.id,
  t.event_id,
  COALESCE(t.amount_paid, 0),
  e.price,
  CASE WHEN COALESCE(o.meta->>'premiumDiscount', 'false') = 'true'
       THEN GREATEST(e.price - COALESCE(t.amount_paid, 0), 0) ELSE 0 END,
  CASE WHEN COALESCE(o.meta->>'premiumDiscount', 'false') = 'true' THEN 'premium_event' END,
  t.created_at,
  CASE WHEN t.refunded THEN COALESCE(t.amount_paid, 0) ELSE 0 END,
  CASE WHEN t.refunded THEN COALESCE(t.refunded_at, t.created_at) END,
  'backfill'
FROM ticket t
LEFT JOIN "order" o ON o.id = t.order_id
JOIN events e ON e.id = t.event_id
ON CONFLICT (trans_id) DO NOTHING;

-- First charges that were written to "order" with a promo code.
INSERT INTO payment (trans_id, kind, user_id, user_email, subscription_id, subscription_type, pay_num,
                     order_id, amount, list_amount, discount_amount, discount_kind, promo_code,
                     occurred_at, source)
SELECT
  o.provider_ref,
  'sub_promo_first',
  u.id,
  o.user_email,
  o.meta->>'subscriptionId',
  o.meta->>'subscriptionType',
  1,
  o.id,
  o.amount::numeric,
  (o.meta->>'deferredArbAmount')::numeric,
  GREATEST((o.meta->>'deferredArbAmount')::numeric - o.amount::numeric, 0),
  CASE o.meta->>'type' WHEN 'subscription_partner_first' THEN 'partner' ELSE 'member_referral' END,
  o.meta->>'promoCode',
  o.created_at,
  'backfill'
FROM "order" o
LEFT JOIN "user" u ON u.email = o.user_email
WHERE o.meta->>'type' IN ('subscription_partner_first', 'subscription_member_first')
  AND o.provider_ref IS NOT NULL
ON CONFLICT (trans_id) DO NOTHING;

-- ---------------------------------------------------------------- member_event
CREATE TABLE IF NOT EXISTS member_event (
  id                BIGSERIAL   PRIMARY KEY,
  user_id           TEXT        REFERENCES "user"(id) ON DELETE CASCADE,
  kind              TEXT        NOT NULL,     -- subscribed | cancelled | payment_failed | expired | comped | comp_removed
  subscription_id   TEXT,
  subscription_type TEXT,
  reason            TEXT,                     -- comp reason, or a note
  actor_id          TEXT        REFERENCES "user"(id) ON DELETE SET NULL,
  at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta              JSONB
);
CREATE INDEX IF NOT EXISTS member_event_at_idx   ON member_event (at);
CREATE INDEX IF NOT EXISTS member_event_user_idx ON member_event (user_id, at);
ALTER TABLE member_event ENABLE ROW LEVEL SECURITY;

-- Seed the history from what the user rows say today, so the member
-- charts don't start empty.
INSERT INTO member_event (user_id, kind, subscription_id, subscription_type, at, meta)
SELECT id, 'subscribed', COALESCE(subscription_id, last_subscription_id), subscription_type,
       COALESCE(subscription_start_date, created_at), '{"seeded":true}'::jsonb
FROM "user"
WHERE COALESCE(subscription_id, last_subscription_id) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM member_event m WHERE m.user_id = "user".id AND m.kind = 'subscribed');

INSERT INTO member_event (user_id, kind, subscription_id, subscription_type, at, meta)
SELECT id, 'cancelled', subscription_id, subscription_type,
       COALESCE(subscription_end_date, NOW()), '{"seeded":true}'::jsonb
FROM "user"
WHERE subscription_status = 'cancelled'
  AND NOT EXISTS (SELECT 1 FROM member_event m WHERE m.user_id = "user".id AND m.kind = 'cancelled');

INSERT INTO member_event (user_id, kind, reason, at, meta)
SELECT id, 'comped', comp_reason, COALESCE(comped_at, NOW()), '{"seeded":true}'::jsonb
FROM "user"
WHERE role = 'premium' AND subscription_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM member_event m WHERE m.user_id = "user".id AND m.kind = 'comped');

-- ---------------------------------------------------------------- ca_conversion
ALTER TABLE ca_conversion ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE ca_conversion ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE ca_conversion ADD COLUMN IF NOT EXISTS meta JSONB;
CREATE INDEX IF NOT EXISTS ca_conversion_session_idx ON ca_conversion (session_id);

-- ---------------------------------------------------------------- ca_pageview
-- One row per page view, anywhere on the site. Library pieces also keep
-- their detailed ca_view row; view_id links the two.
CREATE TABLE IF NOT EXISTS ca_pageview (
  id               UUID        PRIMARY KEY,                 -- generated in the browser
  visitor_id       UUID        NOT NULL,
  session_id       UUID        NOT NULL,
  user_id          TEXT        REFERENCES "user"(id) ON DELETE SET NULL,
  audience         TEXT        NOT NULL,                    -- anonymous | free | premium | staff
  path             TEXT        NOT NULL,
  route            TEXT,                                    -- route id, e.g. /age-open/[eventId]
  entry_id         UUID        REFERENCES cms_entry(id) ON DELETE SET NULL,
  view_id          UUID        REFERENCES ca_view(id) ON DELETE SET NULL,
  source           TEXT,                                    -- internal | search | social | community | email | referral | direct
  referrer_domain  TEXT,
  from_path        TEXT,
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  device           TEXT,
  browser          TEXT,
  os               TEXT,
  country          TEXT,
  viewport_w       INT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visible_seconds  INT         NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ca_pageview_started_idx ON ca_pageview (started_at);
CREATE INDEX IF NOT EXISTS ca_pageview_path_idx    ON ca_pageview (path, started_at);
CREATE INDEX IF NOT EXISTS ca_pageview_session_idx ON ca_pageview (session_id, started_at);
CREATE INDEX IF NOT EXISTS ca_pageview_visitor_idx ON ca_pageview (visitor_id, started_at);
ALTER TABLE ca_pageview ENABLE ROW LEVEL SECURITY;
