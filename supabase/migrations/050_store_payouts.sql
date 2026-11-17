-- 050: store payouts after each event.
--
-- The owner's rules (2026-11-16): a store keeps all of its ticket sales
-- minus the card fee. The fee is a fixed rate (AGE's Authorize.net rate,
-- set in admin) per card payment, split across the tickets in it. Premium
-- members' $5 off comes out of the store's side (the store earns what the
-- player paid). A refund takes the ticket back off the store's total in
-- full; AGE absorbs the card fee it doesn't get back. A store is paid per
-- event, once the event is closed out; an admin marks the payout paid.
--
--   store_program.fee_pct / fee_fixed_cents   the card fee, 2.9% + 30¢ to start
--   store_payout                              one per store event: open, then
--                                             paid (amounts frozen, date,
--                                             method, reference)
--   store_ledger.payout_id                    the payout a row is paid in; null
--                                             for money that arrives after its
--                                             event's payout was paid, carried
--                                             into the store's next payout
--
-- The monthly store_statement table and the revenue-share columns
-- (store.revenue_share, store_program.default_share, fee_payer) are no
-- longer used; drop them in the database cleanup.
--
-- Additive and safe to re-run. Apply before deploying the payout code.

ALTER TABLE store_program
  ADD COLUMN IF NOT EXISTS fee_pct numeric(6,4) NOT NULL DEFAULT 0.0290
    CHECK (fee_pct >= 0 AND fee_pct < 1),
  ADD COLUMN IF NOT EXISTS fee_fixed_cents integer NOT NULL DEFAULT 30
    CHECK (fee_fixed_cents >= 0);

CREATE TABLE IF NOT EXISTS store_payout (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES store(id) ON DELETE RESTRICT,
  event_id      text REFERENCES events(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid')),
  -- Frozen when it's paid.
  gross_cents   integer,
  refund_cents  integer,
  fee_cents     integer,
  adjust_cents  integer,
  carried_cents integer,
  amount_cents  integer,
  paid_at       timestamptz,
  paid_by       text REFERENCES "user"(id) ON DELETE SET NULL,
  method        text,
  reference     text,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS store_payout_event_key
  ON store_payout (store_id, event_id) WHERE event_id IS NOT NULL;
ALTER TABLE store_payout ENABLE ROW LEVEL SECURITY;

ALTER TABLE store_ledger
  ADD COLUMN IF NOT EXISTS payout_id uuid REFERENCES store_payout(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS store_ledger_payout_idx ON store_ledger (store_id, payout_id);
