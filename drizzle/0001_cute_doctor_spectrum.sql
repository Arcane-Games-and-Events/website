CREATE TABLE "event_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_id" text NOT NULL,
	"assigned_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "price" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "format" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "gem_id_required" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "circuit" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "month" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "event_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "premium_discount" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "gem_id" text;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "amount_paid" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "transaction_id" text;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "refunded" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "entered_into_gem" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "gem_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_id" text;--> statement-breakpoint
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;