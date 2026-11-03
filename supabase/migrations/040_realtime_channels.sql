-- 040: live updates with Supabase Realtime (notification badges, course
-- discussions, staff check-in), and closing the public roles off first.
--
-- PART 1: LOCK DOWN THE PUBLIC ROLES (must run before any browser gets a
-- Supabase key).
--
-- Realtime needs the project's public (anon) key in the browser. That key
-- also opens PostgREST to the `anon` and `authenticated` roles, and many
-- tables (user, session, password_reset_token, saved_card, order, ticket, ...)
-- have no row-level security and full grants to those roles. So: row-level
-- security on every table in public (with no policies: the roles see
-- nothing), every grant to anon/authenticated taken back, and the same for
-- tables and functions made later.
--
-- The site is unaffected: it connects as the database owner (and the
-- service role), and neither is held back by row-level security.
--
-- PART 2: WHO MAY JOIN WHICH LIVE CHANNEL.
--
-- Browsers hold a short-lived token our server signs (sub = the user's id,
-- role = authenticated; /api/realtime/token). Channels are private, and
-- these policies on realtime.messages decide who may join:
--
--   user:<userId>      that user only            (their notification badge)
--   course:<courseId>  its students, its teacher, admins and editors
--   staff:<eventId>    the event's staff and admins
--
-- Only the server sends real events. Browsers may send presence, and typing
-- in a course they can post in (not muted). Messages carry ids and counts,
-- never content; pages fetch content through the site's own checks.
--
-- The access checks live in a `private` schema that PostgREST doesn't expose,
-- so nobody can call them to ask about someone else.
--
-- Idempotent: safe to re-run. In the dashboard, also turn off public
-- channels (Realtime settings: "Allow public access" off).

-- ============================================================ part 1

DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;

-- ============================================================ part 2

CREATE SCHEMA IF NOT EXISTS private;

-- What someone may do in a course's live channel: 'manage' (admins, editors,
-- the course's own teacher), 'post' (enrolled, not muted), 'read' (enrolled,
-- muted), or null. Mirrors discussionRole() in src/lib/server/courses.
CREATE OR REPLACE FUNCTION private.realtime_course_access(uid text, cid text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN u.role = 'admin' OR 'editor' = ANY(u.additional_roles) THEN 'manage'
    WHEN 'creator' = ANY(u.additional_roles) AND c.author_id = u.id THEN 'manage'
    WHEN e.id IS NOT NULL AND e.muted_at IS NULL THEN 'post'
    WHEN e.id IS NOT NULL THEN 'read'
  END
  FROM "user" u
  JOIN cms_course c ON c.id::text = cid
  LEFT JOIN course_enrollment e
    ON e.user_id = u.id AND e.course_id = c.id AND e.revoked_at IS NULL
  WHERE u.id = uid
  LIMIT 1
$$;

-- Staff for an event (as the staff console checks), or an admin.
CREATE OR REPLACE FUNCTION private.realtime_is_event_staff(uid text, eid text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM staff_assignments s WHERE s.user_id = uid AND s.event_id = eid)
      OR EXISTS (SELECT 1 FROM "user" u WHERE u.id = uid AND u.role = 'admin')
$$;

REVOKE ALL ON FUNCTION private.realtime_course_access(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.realtime_is_event_staff(text, text) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.realtime_course_access(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.realtime_is_event_staff(text, text) TO authenticated;

DROP POLICY IF EXISTS age_realtime_join ON realtime.messages;
CREATE POLICY age_realtime_join ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    CASE split_part(realtime.topic(), ':', 1)
      WHEN 'user' THEN split_part(realtime.topic(), ':', 2) = (auth.jwt() ->> 'sub')
      WHEN 'course' THEN private.realtime_course_access(
        auth.jwt() ->> 'sub', split_part(realtime.topic(), ':', 2)) IS NOT NULL
      WHEN 'staff' THEN private.realtime_is_event_staff(
        auth.jwt() ->> 'sub', split_part(realtime.topic(), ':', 2))
      ELSE false
    END
  );

DROP POLICY IF EXISTS age_realtime_send ON realtime.messages;
CREATE POLICY age_realtime_send ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    CASE split_part(realtime.topic(), ':', 1)
      WHEN 'course' THEN
        CASE realtime.messages.extension
          WHEN 'presence' THEN private.realtime_course_access(
            auth.jwt() ->> 'sub', split_part(realtime.topic(), ':', 2)) IS NOT NULL
          WHEN 'broadcast' THEN private.realtime_course_access(
            auth.jwt() ->> 'sub', split_part(realtime.topic(), ':', 2)) IN ('post', 'manage')
          ELSE false
        END
      WHEN 'staff' THEN realtime.messages.extension = 'presence'
        AND private.realtime_is_event_staff(auth.jwt() ->> 'sub', split_part(realtime.topic(), ':', 2))
      ELSE false
    END
  );
