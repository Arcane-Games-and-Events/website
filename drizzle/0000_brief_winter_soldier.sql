CREATE TABLE "decklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text,
	"gem_id" text,
	"player_name" text NOT NULL,
	"hero" text,
	"format" text,
	"placement" integer,
	"cards" jsonb NOT NULL,
	"raw_text" text,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entitlement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"product" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"address" text,
	"price" numeric(10, 2) NOT NULL,
	"format" text,
	"gem_id_required" boolean DEFAULT false,
	"circuit" text,
	"month" text,
	"event_date" timestamp with time zone,
	"description" text,
	"premium_discount" boolean DEFAULT false,
	"status" text DEFAULT 'upcoming',
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_player_heroes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season" text NOT NULL,
	"circuit" text NOT NULL,
	"month" text NOT NULL,
	"gem_id" text,
	"player_name" text NOT NULL,
	"hero" text NOT NULL,
	"country_region" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "event_player_heroes_season_circuit_month_gem_id_unique" UNIQUE("season","circuit","month","gem_id")
);
--> statement-breakpoint
CREATE TABLE "staff_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_id" text NOT NULL,
	"assigned_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fab_card_lookup" (
	"lookup_key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"fallback_url" text,
	"pitch" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fab_card_upload_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by" text,
	"filename" text,
	"total_cards" integer NOT NULL,
	"lookup_entries" integer NOT NULL,
	"sets_included" jsonb,
	"uploaded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lss_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"event_type" text,
	"format" text,
	"link" text,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text,
	"month" text,
	"year" text,
	"circuit" text,
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
CREATE TABLE "newsletter_subscriber" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"resend_contact_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'website',
	"subscribed_at" timestamp with time zone DEFAULT now(),
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscriber_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"user_email" text,
	"amount" text,
	"currency" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_token" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"customer_profile_id" text NOT NULL,
	"payment_profile_id" text NOT NULL,
	"card_type" text NOT NULL,
	"last_four" text NOT NULL,
	"expiration_month" text NOT NULL,
	"expiration_year" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"nickname" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season" text NOT NULL,
	"circuit" text NOT NULL,
	"gem_id" text,
	"player_name" text NOT NULL,
	"total_points" integer DEFAULT 0,
	"win_percentage" numeric(5, 2),
	"matches_played" integer DEFAULT 0,
	"matches_won" integer DEFAULT 0,
	"qualified_for_championship" boolean DEFAULT false,
	"january_points" integer DEFAULT 0,
	"february_points" integer DEFAULT 0,
	"march_points" integer DEFAULT 0,
	"april_points" integer DEFAULT 0,
	"may_points" integer DEFAULT 0,
	"june_points" integer DEFAULT 0,
	"july_points" integer DEFAULT 0,
	"august_points" integer DEFAULT 0,
	"september_points" integer DEFAULT 0,
	"october_points" integer DEFAULT 0,
	"november_points" integer DEFAULT 0,
	"december_points" integer DEFAULT 0,
	"january_matches_won" integer DEFAULT 0,
	"february_matches_won" integer DEFAULT 0,
	"march_matches_won" integer DEFAULT 0,
	"april_matches_won" integer DEFAULT 0,
	"may_matches_won" integer DEFAULT 0,
	"june_matches_won" integer DEFAULT 0,
	"july_matches_won" integer DEFAULT 0,
	"august_matches_won" integer DEFAULT 0,
	"september_matches_won" integer DEFAULT 0,
	"october_matches_won" integer DEFAULT 0,
	"november_matches_won" integer DEFAULT 0,
	"december_matches_won" integer DEFAULT 0,
	"january_matches" integer DEFAULT 0,
	"february_matches" integer DEFAULT 0,
	"march_matches" integer DEFAULT 0,
	"april_matches" integer DEFAULT 0,
	"may_matches" integer DEFAULT 0,
	"june_matches" integer DEFAULT 0,
	"july_matches" integer DEFAULT 0,
	"august_matches" integer DEFAULT 0,
	"september_matches" integer DEFAULT 0,
	"october_matches" integer DEFAULT 0,
	"november_matches" integer DEFAULT 0,
	"december_matches" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "standings_season_circuit_player_name_unique" UNIQUE("season","circuit","player_name")
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"event_id" text NOT NULL,
	"order_id" uuid,
	"code" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"first_name" text,
	"last_name" text,
	"gem_id" text,
	"amount_paid" numeric(10, 2),
	"transaction_id" text,
	"refunded" boolean DEFAULT false,
	"refunded_at" timestamp with time zone,
	"entered_into_gem" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"voided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"hashed_password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"gem_id" text,
	"role" text DEFAULT 'free' NOT NULL,
	"customer_profile_id" text,
	"subscription_id" text,
	"subscription_type" text,
	"subscription_status" text,
	"subscription_start_date" timestamp with time zone,
	"subscription_end_date" timestamp with time zone,
	"next_billing_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "decklists" ADD CONSTRAINT "decklists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decklists" ADD CONSTRAINT "decklists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lss_events" ADD CONSTRAINT "lss_events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_card" ADD CONSTRAINT "saved_card_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;