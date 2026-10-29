# Membership billing cutover

How members move from Authorize.net ARB subscriptions to AGE's own billing
(`src/lib/server/billing/`). Read `src/lib/server/billing/README.md` first.

## Before anything

- Migrations 022, 023 and 024 applied in the Supabase SQL editor, in that
  order. Run the preflight queries in the header of `024_self_billing.sql`
  first; every count should be 0 or explained.
- In Vercel (Production): `AUTHNET_PUBLIC_CLIENT_KEY` (live key),
  `BILLING_ENABLED=false`, `BILLING_ALERT_EMAIL`, `CRON_SECRET`.
- Resend domain verified; send one test email from the admin alerts.
- Authorize.net: Account Updater on (fewer declines after leaving ARB);
  Fraud Detection Suite velocity filter on.

## T−7 days

1. `POST /api/admin/ledger-backfill?dryRun=1` against production, then live
   in batches, until every ARB charge is in `payment`.
2. Deploy `site-redesign` to a preview; buy a ticket with a real card and
   refund it from the admin order page. This proves the live Accept.js key,
   the charge path and the refund path.

## T−1 day

1. Apply 024 (and 022/023 if not yet) in the SQL editor.
2. Deploy `site-redesign` to production with `BILLING_ENABLED=false`.
   - New signups self-bill from now on.
   - `/api/cron/billing` runs hourly in observe mode.
   - `/api/cron/sync-subscriptions` keeps legacy members honest.
3. Check `/admin/orders/subscriptions`: a run every hour, no errors.

## T0 (17:00–22:00 UTC, after the overnight ARB batch)

1. Run `024a_pre_cutover_snapshot.sql`; `pg_dump --data-only` of `"user"`,
   `"order"`, `ticket`, `payment`, `member_event`, `saved_card`.
2. `/admin/orders/migration` → **Scan Authorize.net**. Review:
   - "Needs a decision": approve, skip or assign each one. Flags explain
     why it wasn't auto-approved.
   - "Orphans & duplicates": ARBs charging people who cancelled. Cancel
     each; refund charges after cancellation **after** checking the
     processor's dispute list for those transaction ids.
3. Spot-check five approved members against the Authorize.net dashboard:
   amount, next billing date, card.
4. **Migrate next 10 approved**, repeatedly, until "Approved, pending" is 0.
   Each member's ARB is cancelled only after their new row is committed.
   Anything that fails stays on ARB and is listed with its error.
5. Read the figures on the migration page: paying before (snapshot) =
   still on ARB + on new billing; MRR within a few dollars; invariants all
   green.
6. Set `BILLING_ENABLED=true` and `BILLING_MAX_CHARGES_PER_RUN=5` in Vercel;
   redeploy; **Run billing now** from `/admin/orders/subscriptions`; check
   the run row.

## T+1 to T+3 days

- Each day: check `/admin/orders/subscriptions` (runs, past due, unknown
  outcomes) and the alert inbox. **Check for unexpected active ARBs** on
  the migration page.
- Compare the decline rate of the first renewals with the last three
  months of ARB renewals in `payment`.
- Day 3: remove `BILLING_MAX_CHARGES_PER_RUN`.

## Rollback

- **Before any ARB is cancelled:** Vercel instant rollback to the previous
  deployment. The old code ignores the new tables.
- **After:** set `BILLING_ENABLED=false` (or hold individual members) and
  fix forward. `recreateArb` (migrate API, action `recreate`) puts one
  member back on ARB from their stored card; sandbox-tested only.
- If the cron dies, active members keep access (revenue risk only);
  cancelled and past-due members still lose access on time.

## T+30–60 days (cleanup)

- Delete `/api/cron/sync-subscriptions` and its cron once no legacy
  members remain (`/admin/orders/migration` → "Still on ARB" is 0).
- Remove the Silent Post URL from Authorize.net; delete
  `/api/webhooks/authnet`.
- Drop the `_bak_024_*` tables.
