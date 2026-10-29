-- ============================================================================
-- Hero rows belong to an event.
-- ============================================================================
-- event_player_heroes was keyed by season + circuit + month only, so two
-- events in the same circuit-month overwrote each other's metagame and
-- deleting one event deleted the other's heroes. This links each row to its
-- event. The old columns stay (the public pages still group by them) and
-- existing rows are linked wherever exactly one event matches them.

ALTER TABLE event_player_heroes
  ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS event_player_heroes_event_id_idx
  ON event_player_heroes (event_id);

UPDATE event_player_heroes h
SET event_id = m.event_id
FROM (
  SELECT e.circuit,
         e.month,
         to_char(e.event_date AT TIME ZONE 'UTC', 'YYYY') AS season,
         MIN(e.id)                                        AS event_id,
         COUNT(*)                                         AS n
  FROM events e
  WHERE e.circuit IS NOT NULL AND e.month IS NOT NULL AND e.event_date IS NOT NULL
  GROUP BY e.circuit, e.month, to_char(e.event_date AT TIME ZONE 'UTC', 'YYYY')
) m
WHERE h.event_id IS NULL
  AND m.n = 1
  AND h.circuit = m.circuit
  AND h.month   = m.month
  AND h.season  = m.season;
