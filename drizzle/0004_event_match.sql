-- Match History & Head-to-Head Analysis
-- Stores individual match records from tournament pairings for player analytics

CREATE TABLE IF NOT EXISTS "event_match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"round" integer NOT NULL,
	"table" integer,
	"player1_gem_id" text,
	"player1_name" text NOT NULL,
	"player2_gem_id" text,
	"player2_name" text NOT NULL,
	"winner" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "event_match" ADD CONSTRAINT "event_match_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_match_player1" ON "event_match"("player1_gem_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_match_player2" ON "event_match"("player2_gem_id");
