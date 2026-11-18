-- 051: the roadmap's stages become Upcoming, In development, Testing and
-- Shipped (in that order on /roadmap). Existing items move across:
-- now → development, next and later → upcoming.
--
-- Needs 047. Safe to re-run. Apply before running the new roadmap code
-- (adding or moving items fails until it's in).

ALTER TABLE roadmap_item DROP CONSTRAINT IF EXISTS roadmap_item_stage_check;

UPDATE roadmap_item
SET stage = CASE stage WHEN 'now' THEN 'development' WHEN 'next' THEN 'upcoming' WHEN 'later' THEN 'upcoming' ELSE stage END
WHERE stage IN ('now', 'next', 'later');

ALTER TABLE roadmap_item ALTER COLUMN stage SET DEFAULT 'upcoming';
ALTER TABLE roadmap_item ADD CONSTRAINT roadmap_item_stage_check
  CHECK (stage IN ('upcoming', 'development', 'testing', 'shipped'));
