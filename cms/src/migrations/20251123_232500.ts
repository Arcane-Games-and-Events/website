import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_posts_editor_notes_note_type" AS ENUM('general', 'revision', 'feedback', 'approved', 'needs-work');
  CREATE TABLE "payload"."posts_editor_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb NOT NULL,
  	"note_type" "payload"."enum_posts_editor_notes_note_type" DEFAULT 'general' NOT NULL,
  	"created_by_id" integer,
  	"is_resolved" boolean DEFAULT false
  );

  ALTER TABLE "payload"."posts_editor_notes" ADD CONSTRAINT "posts_editor_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."posts_editor_notes" ADD CONSTRAINT "posts_editor_notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_editor_notes_order_idx" ON "payload"."posts_editor_notes" USING btree ("_order");
  CREATE INDEX "posts_editor_notes_parent_id_idx" ON "payload"."posts_editor_notes" USING btree ("_parent_id");
  CREATE INDEX "posts_editor_notes_created_by_idx" ON "payload"."posts_editor_notes" USING btree ("created_by_id");
  DROP TABLE "payload"."editor_notes" CASCADE;
  DROP TYPE "payload"."enum_editor_notes_note_type";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."posts_editor_notes" CASCADE;
  DROP TYPE "payload"."enum_posts_editor_notes_note_type";`)
}
