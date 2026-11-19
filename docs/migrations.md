# Database migrations

Schema changes are SQL files in `supabase/migrations/`, applied with the
Supabase CLI. Supabase records each file it applies in
`supabase_migrations.schema_migrations`, so a database only ever gets the
files it's missing, in order, each in its own transaction.

## Commands

All of them read `DATABASE_URL_DIRECT` (Supabase → Connect → Session pooler,
port 5432) from `.env` (dev), or from the file given with `--env`.

| Command                              | What it does                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:status`                     | Which migrations the database has, and which are new.                                                                       |
| `pnpm db:dry-run`                    | What `db:push` would run, without running it.                                                                               |
| `pnpm db:push`                       | Runs the new migrations. Asks you to type the project ref first.                                                            |
| `pnpm db:mark-applied --through 021` | Records 001–021 as applied **without running them**. Only for a project that already has them, the first time it's tracked. |

Add `--env .env.prod` (or `.env.staging`) for another project. Each command
prints which project it's about to touch before doing anything.

From GitHub: **Actions → Database migrations → Run workflow**, pick staging or
production and dry-run or push. Each is a GitHub Environment holding its own
`DATABASE_URL_DIRECT` secret; give `production` required reviewers.

## Writing a migration

- Next number, three digits: `052_short_name.sql`. Keep this numbering (the
  CLI's `migration new` makes timestamps instead; don't mix the two).
- Make it safe to re-run where you can (`if not exists`, `on conflict`).
- No `create index concurrently`: migrations run inside a transaction.
- Apply it on dev with `pnpm db:push`, then `pnpm test:db:schema` to refresh
  the test database's copy.
- A change the running site can't cope with (dropping something it still
  reads) waits until the code that stops reading it is deployed.

## Not migrations

`supabase/runbook/` holds SQL run by hand at a specific moment of a runbook
(for example `024a_pre_cutover_snapshot.sql`, see `docs/billing-cutover.md`).
`db:push` never runs these.

## Starting to track a project

Dev, staging and prod were set up by pasting files into the SQL editor, so
none is tracked at first. For each, once:

1. Check which files it already has (`pnpm db:status` shows none recorded).
2. `pnpm db:mark-applied --through <last one it has>`.
3. `pnpm db:dry-run` should then list only the files it's really missing.
