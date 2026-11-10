-- ============================================================================
-- 044: the contact inbox (messages to AGE, answered on the site, not by email)
-- ============================================================================
-- Apply before deploying the code that uses it. Until then the contact page
-- can't send and the inbox shows nothing; the rest of the site is unaffected.
--
--   contact_thread    one conversation: who started it (an account, or a
--                     guest's name and email), its topic and subject, open or
--                     done, and when each side last wrote and last read it.
--                     token is the private link a guest follows to see
--                     replies (signed-in people use their account instead).
--   contact_message   each message in a conversation: from the person or from
--                     AGE, or an internal note only staff see.
--
-- Rollback (deploy the code from before this migration first):
--   DROP TABLE IF EXISTS contact_message;
--   DROP TABLE IF EXISTS contact_thread;

CREATE TABLE IF NOT EXISTS contact_thread (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  topic text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_member_at timestamptz NOT NULL DEFAULT now(),
  last_staff_at timestamptz,
  member_read_at timestamptz NOT NULL DEFAULT now(),
  staff_read_at timestamptz
);
CREATE INDEX IF NOT EXISTS contact_thread_user_idx ON contact_thread (user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS contact_thread_inbox_idx ON contact_thread (status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS contact_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES contact_thread(id) ON DELETE CASCADE,
  author_id text REFERENCES "user"(id) ON DELETE SET NULL,
  from_staff boolean NOT NULL DEFAULT false,
  internal boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_message_thread_idx ON contact_message (thread_id, created_at);

-- Not readable through the public API (see 040): only the server touches these.
ALTER TABLE contact_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_message ENABLE ROW LEVEL SECURITY;
