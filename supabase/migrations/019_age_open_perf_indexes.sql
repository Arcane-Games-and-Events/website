-- ============================================================================
-- AGE Open perf: hot-column indexes
-- ============================================================================
-- Every query on the AGE Open page (main tab shell + event detail + results
-- + decklist viewer) was hitting sequential scans or file-sorts because none
-- of these tables had explicit indexes on their hot columns. This migration
-- adds the composite / single-column indexes for the WHERE and ORDER BY
-- clauses those queries actually use.
--
-- Table names below are the ACTUAL SQL identifiers (Drizzle uses singular
-- JS variables but the on-disk tables are plural: matches / events /
-- decklists / standings). Migration 018 uses similar conventions.
--
-- IF NOT EXISTS everywhere so re-running against a partially-applied DB is
-- safe. In prod, prefer `CREATE INDEX CONCURRENTLY` (non-blocking); left as
-- plain CREATE here so the migration works both in supabase migrate flows
-- and inside a transaction.
-- ============================================================================

-- ------------------------------------------------------------------
-- matches — hot filter + sort keys for the archive results view
-- and every per-event query in /age-open/[eventId]/results.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS matches_event_id_idx ON matches (event_id);
CREATE INDEX IF NOT EXISTS matches_event_round_idx ON matches (event_id, round);
CREATE INDEX IF NOT EXISTS matches_round_idx ON matches (round);

-- ------------------------------------------------------------------
-- decklists — visitor-facing list on the Decklists tab
-- (isPublic filter + createdAt sort) + per-event lookup in results.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS decklists_public_created_idx
  ON decklists (is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS decklists_event_public_idx
  ON decklists (event_id, is_public);

-- ------------------------------------------------------------------
-- events — event_date sort (both ASC upcoming + DESC archive)
-- and status filter used in archive builds.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS events_event_date_idx ON events (event_date);
CREATE INDEX IF NOT EXISTS events_status_idx ON events (status);

-- ------------------------------------------------------------------
-- ticket — capacity checks + user's own ticket lookup on
-- event detail + checkout pages.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ticket_event_active_idx
  ON ticket (event_id) WHERE refunded = false;
CREATE INDEX IF NOT EXISTS ticket_user_event_idx
  ON ticket (user_id, event_id);

-- ------------------------------------------------------------------
-- standings — orders by total_points DESC on every AGE Open page
-- and the homepage. The unique index `standing_season_circuit_gem_unique`
-- from migration 017 covers (season, circuit, coalesce(gem_id,...)) which
-- is fine for equality lookups but not for the total_points ordering.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS standings_total_points_idx
  ON standings (total_points DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS standings_season_idx ON standings (season);
CREATE INDEX IF NOT EXISTS standings_season_circuit_idx
  ON standings (season, circuit);

-- ------------------------------------------------------------------
-- saved_card lookup on checkout / event detail pages.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS saved_card_user_id_idx ON saved_card (user_id);
