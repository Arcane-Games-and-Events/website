-- ============================================================================
-- 043: guide refunds (the guide refund policy)
-- ============================================================================
-- Needs 042. Apply before deploying the code that uses it.
--
--   guide_refund_request    a buyer's request to refund one guide (one line
--                           item), how it was decided, and the gateway result
--   course_enrollment       first_opened_at: when the buyer first opened a
--                           paid topic of the guide ("opened" ends the
--                           unopened refund)
--   checkout                the refund-policy consent given at payment: the
--                           exact text, when, and the buyer's IP and browser
--   refund                  which guide refund request a gateway refund is for
--   partner_ledger          entry type age_cost: what AGE pays itself (card
--                           fees the processor keeps on a refund, chargeback
--                           fees); never on a teacher's statement. And
--                           settled_at: when Authorize.net confirmed a
--                           sale's charge settled (a sale isn't payable
--                           before; older sales count as settled)
--
-- Backfill: first_opened_at from the topic each enrollment last opened and
-- from logged topic views (paid topics only). Safe to re-run.
--
-- Rollback (deploy the code from before this migration first):
--   ALTER TABLE partner_ledger DROP CONSTRAINT IF EXISTS partner_ledger_type_check;
--   DELETE FROM partner_ledger WHERE entry_type = 'age_cost';
--   ALTER TABLE partner_ledger ADD CONSTRAINT partner_ledger_type_check
--     CHECK (entry_type IN ('sale', 'reversal', 'referral_bonus', 'pool_share', 'adjustment'));
--   ALTER TABLE partner_ledger DROP COLUMN IF EXISTS settled_at;
--   ALTER TABLE refund DROP COLUMN IF EXISTS guide_refund_request_id;
--   DROP TABLE IF EXISTS guide_refund_request;
--   ALTER TABLE checkout DROP COLUMN IF EXISTS consent_given, DROP COLUMN IF EXISTS consent_text,
--     DROP COLUMN IF EXISTS consent_at, DROP COLUMN IF EXISTS consent_ip,
--     DROP COLUMN IF EXISTS consent_user_agent;
--   ALTER TABLE course_enrollment DROP COLUMN IF EXISTS first_opened_at;
-- ============================================================================

ALTER TABLE course_enrollment ADD COLUMN IF NOT EXISTS first_opened_at timestamptz;

ALTER TABLE checkout
  ADD COLUMN IF NOT EXISTS consent_given boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip text,
  ADD COLUMN IF NOT EXISTS consent_user_agent text;

CREATE TABLE IF NOT EXISTS guide_refund_request (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_item_id  uuid NOT NULL REFERENCES checkout_item(id) ON DELETE RESTRICT,
  order_id          uuid NOT NULL REFERENCES "order"(id) ON DELETE RESTRICT,
  user_id           text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  course_id         uuid REFERENCES cms_course(id) ON DELETE SET NULL,
  teacher_id        text REFERENCES "user"(id) ON DELETE SET NULL,
  reason            text NOT NULL,   -- duplicate | broken | not_as_described | unopened | other
  message           text,
  status            text NOT NULL DEFAULT 'pending',  -- pending | approved | auto_approved | denied
  auto_reason       text,            -- duplicate | unopened, when the system approved it
  decided_by        text,            -- system | admin | teacher
  decided_by_user   text REFERENCES "user"(id) ON DELETE SET NULL,
  decision_note     text,
  decided_at        timestamptz,
  refund_status     text NOT NULL DEFAULT 'none',     -- none | processing | refunded | refund_failed
  refund_id         uuid REFERENCES refund(id) ON DELETE SET NULL,
  amount_cents      integer,         -- what goes back: the line item's amount paid
  gateway_method    text,            -- void | refund
  gateway_response  text,
  attempts          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE guide_refund_request ADD CONSTRAINT guide_refund_request_reason_check
    CHECK (reason IN ('duplicate', 'broken', 'not_as_described', 'unopened', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE guide_refund_request ADD CONSTRAINT guide_refund_request_status_check
    CHECK (status IN ('pending', 'approved', 'auto_approved', 'denied'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- One open or approved request per guide bought: a guide is never refunded twice.
CREATE UNIQUE INDEX IF NOT EXISTS guide_refund_request_live_unique
  ON guide_refund_request (checkout_item_id) WHERE status <> 'denied';
CREATE INDEX IF NOT EXISTS guide_refund_request_queue_idx
  ON guide_refund_request (status, created_at);
CREATE INDEX IF NOT EXISTS guide_refund_request_teacher_idx
  ON guide_refund_request (teacher_id, status);
ALTER TABLE guide_refund_request ENABLE ROW LEVEL SECURITY;

ALTER TABLE refund
  ADD COLUMN IF NOT EXISTS guide_refund_request_id uuid REFERENCES guide_refund_request(id) ON DELETE SET NULL;

ALTER TABLE partner_ledger DROP CONSTRAINT IF EXISTS partner_ledger_type_check;
ALTER TABLE partner_ledger ADD CONSTRAINT partner_ledger_type_check
  CHECK (entry_type IN ('sale', 'reversal', 'referral_bonus', 'pool_share', 'adjustment', 'age_cost'));

ALTER TABLE partner_ledger ADD COLUMN IF NOT EXISTS settled_at timestamptz;
CREATE INDEX IF NOT EXISTS partner_ledger_unsettled_idx
  ON partner_ledger (payable_at) WHERE entry_type = 'sale' AND settled_at IS NULL;

-- ---------------------------------------------------------------- backfill

-- Sales already on the ledger were paid for long ago: settled.
UPDATE partner_ledger SET settled_at = payable_at
WHERE entry_type = 'sale' AND settled_at IS NULL;

-- Opened: the paid topic an enrollment last opened (its last_seen_at)...
UPDATE course_enrollment e SET first_opened_at = e.last_seen_at
FROM cms_lesson l
WHERE e.first_opened_at IS NULL AND e.last_lesson_id = l.id AND NOT l.is_preview
  AND e.last_seen_at IS NOT NULL;

-- ...or the earliest logged view of a paid topic by the student since enrolling.
UPDATE course_enrollment e SET first_opened_at = v.first_view
FROM (
  SELECT e2.id, min(cv.started_at) AS first_view
  FROM course_enrollment e2
  JOIN ca_view cv ON cv.user_id = e2.user_id AND cv.course_id = e2.course_id
    AND cv.lesson_id IS NOT NULL AND cv.started_at >= e2.created_at
  JOIN cms_lesson l ON l.id = cv.lesson_id AND NOT l.is_preview
  GROUP BY e2.id
) v
WHERE e.id = v.id AND (e.first_opened_at IS NULL OR v.first_view < e.first_opened_at);
