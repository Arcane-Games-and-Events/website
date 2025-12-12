-- Drop existing event_match table and recreate without event_id
-- This removes the foreign key dependency on the event table

DROP TABLE IF EXISTS "event_match";

CREATE TABLE "event_match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" text NOT NULL,
	"year" text NOT NULL,
	"circuit" text NOT NULL,
	"round" integer NOT NULL,
	"table" integer,
	"player1_gem_id" text,
	"player1_name" text NOT NULL,
	"player2_gem_id" text,
	"player2_name" text NOT NULL,
	"winner" text,
	"created_at" timestamp with time zone DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_event_match_event" ON "event_match"("year", "circuit", "month");
CREATE INDEX IF NOT EXISTS "idx_event_match_player1" ON "event_match"("player1_gem_id");
CREATE INDEX IF NOT EXISTS "idx_event_match_player2" ON "event_match"("player2_gem_id");
CREATE INDEX IF NOT EXISTS "idx_event_match_circuit" ON "event_match"("circuit");
CREATE INDEX IF NOT EXISTS "idx_event_match_year" ON "event_match"("year");
