-- ============================================================================
-- One hero row per player per event (not per circuit-month).
-- ============================================================================
-- Migration 023 linked hero rows to their event, but the old rule allowing
-- only one row per player per season + circuit + month stayed. So when two
-- events ran in the same circuit in the same month, uploading the second
-- event's heroes failed for every player who played both.
--
-- This swaps that rule for one row per player per event. The old rule was
-- stricter, so no existing rows can break the new one. Safe to re-run.
--
-- Rollback (only if no circuit-month has two events' heroes):
--   ALTER TABLE event_player_heroes DROP CONSTRAINT IF EXISTS event_player_heroes_event_id_gem_id_unique;
--   ALTER TABLE event_player_heroes ADD CONSTRAINT event_player_heroes_season_circuit_month_gem_id_unique
--     UNIQUE (season, circuit, month, gem_id);
-- ============================================================================

ALTER TABLE event_player_heroes
  DROP CONSTRAINT IF EXISTS event_player_heroes_season_circuit_month_gem_id_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_player_heroes_event_id_gem_id_unique'
  ) THEN
    ALTER TABLE event_player_heroes
      ADD CONSTRAINT event_player_heroes_event_id_gem_id_unique UNIQUE (event_id, gem_id);
  END IF;
END $$;
