-- Tighter uniqueness for standings rows.
--
-- The previous unique constraint on (season, circuit, player_name) merged two
-- different players who happened to share a name into a single standings row.
-- A player is identified by GEM ID; standings without a GEM ID are kept apart
-- by their player_name with a sentinel prefix so they can't collide with a
-- GEM-prefixed identity.

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'standings'::regclass
          AND contype = 'u'
    LOOP
        EXECUTE format('ALTER TABLE standings DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;
END $$;

DROP INDEX IF EXISTS standings_season_circuit_player_name_key;
DROP INDEX IF EXISTS standings_season_circuit_player_name_unique;

CREATE UNIQUE INDEX standings_season_circuit_identity_key
    ON standings (
        season,
        circuit,
        COALESCE(gem_id, '__name__' || player_name)
    );
