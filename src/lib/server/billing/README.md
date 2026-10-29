# Memberships

A membership is a `subscription` row. The database is the record; the card
is stored at Authorize.net as a customer + payment profile, and the hourly
job (`/api/cron/billing`) charges it when a period ends.

```
                 signup intent
                      │
                      ▼
                 ┌──────────┐  decline / error / abandoned
                 │incomplete│ ───────────────────────────────► ended
                 └──────────┘
                      │ first charge approved (or $0 promo)
                      ▼
      renewal paid ┌────────┐  cancel            ┌───────────┐ period end
  ┌───────────────►│ active │ ──────────────────►│ cancelled │ ───────────► ended
  │                └────────┘                    └───────────┘
  │                     │ renewal declined             ▲ resume (valid card)
  │                     ▼                              │
  │                ┌──────────┐ ───────────────────────┘
  └────────────────│ past_due │  retry / new card approved → active
                   └──────────┘
                        │ day-7 attempt fails, or member cancels
                        ▼
                      ended
```

Rules:

- **Intent before charge.** The invoice row (`charging`) is written before
  the gateway is called, so an unknown outcome can be looked up by invoice
  number instead of charged again.
- **No database transaction spans a gateway call.** Work is claimed with an
  autocommit lease; the finishing writes run in one short transaction.
- **`applyAccess` is the only writer** of `user.role` (for non-admins) and
  the `user.subscription_*` mirror columns. Everything else changes the
  `subscription` row and then calls it.
- **Dunning:** retries 1, 3 and 7 days after the first decline; access is
  kept until `grace_until`; then the membership ends.
- **Status spelling is `cancelled`** everywhere in our data.
- **`ref`** is the legacy ARB id for migrated members, otherwise the row id.
  It is what `user.subscription_id` and `payment.subscription_id` hold.

Modules:

| file               | job                                                |
| ------------------ | -------------------------------------------------- |
| `plans.js`         | prices and promo quotes                            |
| `dates.js`         | anchored period math, dunning schedule             |
| `access.js`        | `applyAccess`: subscription → user role / mirror   |
| `subscriptions.js` | start, cancel, resume, switch, set card, admin ops |
| `renewals.js`      | the hourly job                                     |
| `reconcile.js`     | "did it go through?" by invoice number             |
| `notices.js`       | send-once emails                                   |
| `migrate-arb.js`   | moving members off Authorize.net ARB               |
