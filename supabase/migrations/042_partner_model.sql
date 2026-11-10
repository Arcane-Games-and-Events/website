-- ============================================================================
-- 042: the AGE Partner model (guides marketplace v2)
-- ============================================================================
-- Everything the Partner model needs. Apply it before deploying the code
-- that uses it: the site reads these tables and columns on every course page.
--
--   partner_account      each teacher's lifetime copies (row-locked per sale)
--   checkout_item        the guides in a checkout (carts)
--   partner_ledger       one row per copy sold, reversal, referral bonus,
--                        pool share or adjustment: what the teacher earns
--   partner_statement    payout status per teacher per month
--   partner_attribution  which teacher referred a Premium member (one, ever)
--   guide_read           unique (member, guide, month) reads, for the pool
--   pool_run             one row per month the pool job ran
--   cms_course           exclusivity agreement fields, "last updated"
--   course_changelog     short notes on each update to a guide
--   refund               which guides a refund covers
--
-- Then a backfill, safe to run again (run it once more right after the
-- deploy, to pick up any sale the old code made in between):
--   - existing course_sale rows become legacy ledger sales at their 90%,
--     marked settled when a payout already paid them;
--   - each teacher's lifetime copies are counted from the ledger;
--   - published guides get a 12-month exclusivity agreement from launch.
--
-- Access needs no data change: every enrolled student is served the
-- latest version of every topic (see
-- src/lib/server/courses/access.js).
--
-- Additive and safe to re-run.
--
-- Rollback (deploy the code from before the Partner model first; once
-- guides have sold under it, this loses the ledger, referral bonuses and
-- statements, so download the statements CSV first):
--   ALTER TABLE refund DROP COLUMN IF EXISTS checkout_item_ids;
--   DROP TABLE IF EXISTS course_changelog;
--   ALTER TABLE cms_course DROP COLUMN IF EXISTS exclusive, DROP COLUMN IF EXISTS exclusivity_start,
--     DROP COLUMN IF EXISTS exclusivity_end, DROP COLUMN IF EXISTS auto_renew,
--     DROP COLUMN IF EXISTS agreement_status, DROP COLUMN IF EXISTS content_updated_at;
--   DROP TABLE IF EXISTS pool_run, guide_read, partner_attribution, partner_statement,
--     partner_ledger, checkout_item, partner_account;
-- ============================================================================

-- Each teacher's lifetime copies, net of refunds and chargebacks. Locked
-- (SELECT ... FOR UPDATE) while an order is numbered, so two orders at once
-- can't hand out the same copy number.
CREATE TABLE IF NOT EXISTS partner_account (
  teacher_id      text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  lifetime_copies integer NOT NULL DEFAULT 0 CHECK (lifetime_copies >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- The guides in a checkout. The checkout row keeps the first guide in
-- course_id, so every existing check still holds; payload.kind = 'guides'.
CREATE TABLE IF NOT EXISTS checkout_item (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id            uuid NOT NULL REFERENCES checkout(id) ON DELETE CASCADE,
  course_id              uuid NOT NULL REFERENCES cms_course(id) ON DELETE RESTRICT,
  teacher_id             text REFERENCES "user"(id) ON DELETE SET NULL,
  position               smallint NOT NULL,
  title                  text NOT NULL,
  list_cents             integer NOT NULL CHECK (list_cents >= 0),
  member_discount_cents  integer NOT NULL DEFAULT 0,
  price_cents            integer NOT NULL,   -- list less the member discount
  fee_cents              integer NOT NULL DEFAULT 0,  -- this item's share of the card fee
  paid_cents             integer NOT NULL,   -- price + fee: what the buyer paid for it
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checkout_id, course_id)
);
CREATE INDEX IF NOT EXISTS checkout_item_course_idx ON checkout_item (course_id);

-- What teachers earn, one row per event. Reversals point at the row they
-- undo. statement_month is the monthly statement the row lands on.
CREATE TABLE IF NOT EXISTS partner_ledger (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type             text NOT NULL,  -- sale | reversal | referral_bonus | pool_share | adjustment
  status                 text NOT NULL,  -- sale: paid | refunded | charged_back; reversal: refunded | charged_back; others: earned | void
  teacher_id             text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  order_id               uuid REFERENCES "order"(id) ON DELETE SET NULL,
  checkout_item_id       uuid REFERENCES checkout_item(id) ON DELETE SET NULL,
  course_id              uuid REFERENCES cms_course(id) ON DELETE SET NULL,
  buyer_id               text REFERENCES "user"(id) ON DELETE SET NULL,
  reverses_id            uuid REFERENCES partner_ledger(id) ON DELETE RESTRICT,
  legacy_sale_id         uuid REFERENCES course_sale(id) ON DELETE SET NULL,
  referred_user_id       text REFERENCES "user"(id) ON DELETE SET NULL,
  pool_month             date,
  list_cents             integer NOT NULL DEFAULT 0,
  buyer_type             text,           -- member | non_member
  member_discount_cents  integer NOT NULL DEFAULT 0,
  buyer_paid_cents       integer NOT NULL DEFAULT 0,
  card_fee_cents         integer NOT NULL DEFAULT 0,
  share_rate             numeric(5,4),
  level                  text,           -- PARTNER | SENIOR | ELITE at the time of sale
  copy_number            integer,        -- the copy's place in the teacher's lifetime count
  teacher_cents          integer NOT NULL,  -- negative on reversals
  age_commission_cents   integer NOT NULL DEFAULT 0,
  age_net_cents          integer NOT NULL DEFAULT 0,
  occurred_at            timestamptz NOT NULL DEFAULT now(),
  payable_at             timestamptz NOT NULL DEFAULT now(),
  statement_month        date NOT NULL,
  settled_payout_id      uuid REFERENCES teacher_payout(id) ON DELETE SET NULL,  -- paid by an old-style payout
  note                   text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE partner_ledger ADD CONSTRAINT partner_ledger_type_check
    CHECK (entry_type IN ('sale', 'reversal', 'referral_bonus', 'pool_share', 'adjustment'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE partner_ledger ADD CONSTRAINT partner_ledger_status_check
    CHECK (status IN ('paid', 'refunded', 'charged_back', 'earned', 'void'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Once each: a sale per line item, a reversal per entry, a bonus per member,
-- a pool share per teacher per month, a legacy row per old sale.
CREATE UNIQUE INDEX IF NOT EXISTS partner_ledger_item_sale_unique
  ON partner_ledger (checkout_item_id) WHERE entry_type = 'sale';
CREATE UNIQUE INDEX IF NOT EXISTS partner_ledger_reversal_unique
  ON partner_ledger (reverses_id) WHERE entry_type = 'reversal';
CREATE UNIQUE INDEX IF NOT EXISTS partner_ledger_bonus_unique
  ON partner_ledger (referred_user_id) WHERE entry_type = 'referral_bonus';
CREATE UNIQUE INDEX IF NOT EXISTS partner_ledger_pool_unique
  ON partner_ledger (pool_month, teacher_id) WHERE entry_type = 'pool_share';
CREATE UNIQUE INDEX IF NOT EXISTS partner_ledger_legacy_unique
  ON partner_ledger (legacy_sale_id) WHERE legacy_sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS partner_ledger_statement_idx ON partner_ledger (teacher_id, statement_month);
CREATE INDEX IF NOT EXISTS partner_ledger_order_idx ON partner_ledger (order_id) WHERE order_id IS NOT NULL;

-- Payout status per teacher per month. No row means pending.
CREATE TABLE IF NOT EXISTS partner_statement (
  teacher_id    text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  month         date NOT NULL,             -- the first of the month
  status        text NOT NULL DEFAULT 'pending',  -- pending | paid
  amount_cents  integer,                   -- what was paid
  payout_id     uuid REFERENCES teacher_payout(id) ON DELETE SET NULL,
  reference     text,
  note          text,
  paid_at       timestamptz,
  paid_by       text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, month)
);
DO $$ BEGIN
  ALTER TABLE partner_statement ADD CONSTRAINT partner_statement_status_check
    CHECK (status IN ('pending', 'paid'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- The teacher who referred a Premium member, by link or code. One per
-- member, ever, and never the teacher themselves.
CREATE TABLE IF NOT EXISTS partner_attribution (
  referred_user_id  text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  teacher_id        text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  partner_id        uuid REFERENCES partner(id) ON DELETE SET NULL,
  source            text NOT NULL,        -- link | code
  code              text,
  subscription_id   uuid,
  status            text NOT NULL DEFAULT 'pending',  -- pending | bonus_recorded | void
  void_reason       text,
  attributed_at     timestamptz NOT NULL DEFAULT now(),
  decided_at        timestamptz,
  CHECK (referred_user_id <> teacher_id)
);
CREATE INDEX IF NOT EXISTS partner_attribution_pending_idx
  ON partner_attribution (attributed_at) WHERE status = 'pending';

-- Unique reads by Premium members of guides they own, per month.
CREATE TABLE IF NOT EXISTS guide_read (
  user_id        text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  course_id      uuid NOT NULL REFERENCES cms_course(id) ON DELETE CASCADE,
  month          date NOT NULL,
  first_read_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id, month)
);
CREATE INDEX IF NOT EXISTS guide_read_month_idx ON guide_read (month, course_id);

-- Each month the pool job ran, and what it decided.
CREATE TABLE IF NOT EXISTS pool_run (
  month              date PRIMARY KEY,
  status             text NOT NULL,       -- skipped | paid
  reason             text,
  active_members     integer,
  net_revenue_cents  integer,
  pool_cents         integer,
  total_reads        integer,
  ran_at             timestamptz NOT NULL DEFAULT now()
);

-- The exclusivity agreement per guide (stored and shown, not enforced),
-- and when its content last changed.
ALTER TABLE cms_course
  ADD COLUMN IF NOT EXISTS exclusive boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exclusivity_start date,
  ADD COLUMN IF NOT EXISTS exclusivity_end date,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS agreement_status text NOT NULL DEFAULT 'active',  -- active | ended
  ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;

-- Version history buyers can read: one short note per update.
CREATE TABLE IF NOT EXISTS course_changelog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES cms_course(id) ON DELETE CASCADE,
  lesson_id   uuid REFERENCES cms_lesson(id) ON DELETE SET NULL,
  kind        text NOT NULL,   -- topic_updated | topic_added
  note        text,
  author_id   text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_changelog_course_idx ON course_changelog (course_id, created_at DESC);

-- A refund names the guides it gives back.
ALTER TABLE refund
  ADD COLUMN IF NOT EXISTS checkout_item_ids uuid[] NOT NULL DEFAULT '{}';

-- Row level security on with no policies, as in 031: only the site's own
-- server connection reads these.
ALTER TABLE partner_account     ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_item       ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_statement   ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_read          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_run            ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_changelog    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------- backfill

-- Old sales become legacy ledger sales: 90% of what was paid, less any
-- refund, on the statement for the month they became payable. Re-running
-- refreshes them from course_sale. Once the Partner model code is live,
-- refunds of these sales are recorded on the ledger itself: re-running
-- then leaves those rows alone.
INSERT INTO partner_ledger (
  entry_type, status, teacher_id, order_id, course_id, buyer_id, legacy_sale_id,
  list_cents, buyer_type, buyer_paid_cents, share_rate, level, teacher_cents,
  age_commission_cents, age_net_cents, occurred_at, payable_at, statement_month,
  settled_payout_id, note
)
SELECT
  'sale',
  CASE WHEN s.refunded_cents >= s.gross_cents THEN 'refunded' ELSE 'paid' END,
  s.teacher_id, s.order_id, s.course_id, e.user_id, s.id,
  s.gross_cents, 'non_member', s.gross_cents - s.refunded_cents, s.share_pct / 100.0, 'PARTNER',
  round((s.gross_cents - s.refunded_cents) * s.share_pct / 100.0)::int,
  (s.gross_cents - s.refunded_cents) - round((s.gross_cents - s.refunded_cents) * s.share_pct / 100.0)::int,
  (s.gross_cents - s.refunded_cents) - round((s.gross_cents - s.refunded_cents) * s.share_pct / 100.0)::int,
  s.sold_at, s.payable_at, date_trunc('month', s.payable_at AT TIME ZONE 'UTC')::date,
  s.payout_id, 'Sold before the Partner model'
FROM course_sale s
LEFT JOIN course_enrollment e ON e.id = s.enrollment_id
WHERE s.teacher_id IS NOT NULL
ON CONFLICT (legacy_sale_id) WHERE legacy_sale_id IS NOT NULL DO UPDATE SET
  status = EXCLUDED.status,
  buyer_paid_cents = EXCLUDED.buyer_paid_cents,
  teacher_cents = EXCLUDED.teacher_cents,
  age_commission_cents = EXCLUDED.age_commission_cents,
  age_net_cents = EXCLUDED.age_net_cents,
  settled_payout_id = EXCLUDED.settled_payout_id,
  updated_at = now()
-- ...unless the ledger has already refunded part of it.
WHERE NOT EXISTS (SELECT 1 FROM partner_ledger r WHERE r.reverses_id = partner_ledger.id);

-- Number the legacy copies in the order they sold (refunded ones don't count).
UPDATE partner_ledger l SET copy_number = n.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY teacher_id ORDER BY occurred_at, id) AS rn
  FROM partner_ledger
  WHERE legacy_sale_id IS NOT NULL AND status = 'paid'
) n
WHERE l.id = n.id AND l.copy_number IS DISTINCT FROM n.rn;

-- Lifetime copies, counted from the ledger: every sale not refunded or
-- charged back. Correct to re-run at any time.
INSERT INTO partner_account (teacher_id, lifetime_copies)
SELECT teacher_id, count(*) FILTER (WHERE status = 'paid')
FROM partner_ledger WHERE entry_type = 'sale'
GROUP BY teacher_id
ON CONFLICT (teacher_id) DO UPDATE SET lifetime_copies = EXCLUDED.lifetime_copies, updated_at = now();

-- Exclusivity from launch, for 12 months, on guides that have launched.
UPDATE cms_course
SET exclusivity_start = (first_published_at AT TIME ZONE 'UTC')::date,
    exclusivity_end = ((first_published_at AT TIME ZONE 'UTC')::date + interval '12 months')::date
WHERE exclusivity_start IS NULL AND first_published_at IS NOT NULL;

UPDATE cms_course SET content_updated_at = coalesce(published_at, updated_at)
WHERE content_updated_at IS NULL AND first_published_at IS NOT NULL;
