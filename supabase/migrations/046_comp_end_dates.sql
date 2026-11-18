-- 046: an end date on comps, no more writer comps, and no more
-- tournament staff role.
--
-- The owner's decisions (2026-11-16): an admin can give any comp (Premium
-- without paying) an end date, or leave it open. The hourly billing job
-- ends comps whose date has passed: the member goes back to free and the
-- membership history records 'comp_expired'.
--
-- Writers no longer get Premium for writing: they read their own premium
-- pieces anyway. The writer comps that exist now are ended here, recorded
-- as 'comp_removed' with the reason 'writer'. Writers who also pay, and
-- admins, are not touched.
--
-- Event staff aren't a role any more either (2026-11-17): anyone added to
-- an event's staff runs it from /staff, whatever their role. The old
-- 'tournament staff' billing role goes back to 'free', and the capability
-- of the same name is taken out of additional_roles.
--
--   "user".comp_ends_at   when the comp ends; null = no end date. Read
--                         with to_jsonb(u)->>'comp_ends_at' so the code
--                         works before this has run.
--
-- Additive and safe to re-run. Apply before deploying (the code works
-- without it, but comps can't be given an end date until it runs).

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS comp_ends_at timestamptz;
CREATE INDEX IF NOT EXISTS user_comp_ends_idx ON "user" (comp_ends_at)
  WHERE comp_ends_at IS NOT NULL;

-- End the writer comps.
WITH ended AS (
  UPDATE "user"
     SET role = 'free', comp_reason = NULL, comped_at = NULL, comped_by = NULL,
         comp_ends_at = NULL
   WHERE role = 'premium' AND subscription_id IS NULL AND comp_reason = 'writer'
  RETURNING id
)
INSERT INTO member_event (user_id, kind, reason, meta)
SELECT id, 'comp_removed', 'writer', '{"migration": "046"}'::jsonb FROM ended;

-- No more tournament staff role.
UPDATE "user" SET role = 'free' WHERE role = 'tournament staff';
UPDATE "user" SET additional_roles = array_remove(additional_roles, 'tournament staff')
 WHERE 'tournament staff' = ANY (additional_roles);
