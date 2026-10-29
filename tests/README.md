# Tests

Three layers, each slower and broader than the one before.

| Command                 | What runs                                                                 | Needs         |
| ----------------------- | ------------------------------------------------------------------------- | ------------- |
| `pnpm test`             | Unit tests: pure logic, no database or network                            | nothing       |
| `pnpm test:integration` | Server code against a real, throwaway Postgres, with a fake Authorize.net | test database |
| `pnpm test:e2e`         | A production build in Chrome, at desktop and phone width                  | test database |
| `pnpm test:all`         | All of the above                                                          | test database |

## The test database

Tests never touch the shared dev Supabase or production. They use a local
Postgres that is wiped on every run.

```bash
pnpm test:db:up      # start Postgres 17 in Docker on port 54329
pnpm test:integration
pnpm test:db:down    # stop it; its data is gone
```

Any local Postgres 17 works: point `TEST_DATABASE_URL` at it. The database
name must start with `age_test`, and the host must be local; the suite
refuses to start otherwise.

The schema comes from `tests/db/schema.sql`, a schema-only dump of the dev
database. After applying a migration, refresh it with `pnpm test:db:schema`
and commit the result.

## Safety

`tests/setup/environment.js` replaces every secret from `.env` before
SvelteKit loads it: the database is the test database, Redis, email,
storage and video are off, and Authorize.net gets dummy sandbox
credentials. Integration tests also block every network call to
Authorize.net; use the fake instead.

## Writing tests

- **Unit** (`tests/unit/`): import from `$lib/...` and test functions directly.
- **Integration** (`tests/integration/`): every table is emptied before each
  test. Build rows with `tests/support/factories.js`. For payments, call
  `installFakeAuthnet()` from `tests/support/fake-authnet.js`; it approves
  charges unless told otherwise (`gw.next('declined')`), and `gw.settle(id)`
  makes a charge refundable rather than voidable.
- **Browser** (`tests/e2e/`): call `watch(page)` to fail on console errors
  and server errors, and `expectHouseStyle(page)` to fail on sideways
  scrolling and rounded corners. An element that is meant to be round can
  opt out with `data-allow-rounded`.

Every bug fix should come with a test that fails without the fix.
