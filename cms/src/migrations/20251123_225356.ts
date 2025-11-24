import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_users_role" AS ENUM('writer', 'editor', 'admin');
  CREATE TYPE "payload"."enum_editor_notes_note_type" AS ENUM('general', 'revision', 'feedback', 'approved', 'needs-work');
  CREATE TABLE "payload"."editor_notes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"post_id" integer NOT NULL,
  	"content" jsonb NOT NULL,
  	"note_type" "payload"."enum_editor_notes_note_type" DEFAULT 'general' NOT NULL,
  	"created_by_id" integer NOT NULL,
  	"is_resolved" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."users" ADD COLUMN "name" varchar;
  UPDATE "payload"."users" SET "name" = "email" WHERE "name" IS NULL;
  ALTER TABLE "payload"."users" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "payload"."users" ADD COLUMN "role" "payload"."enum_users_role" DEFAULT 'admin';
  UPDATE "payload"."users" SET "role" = 'admin' WHERE "role" IS NULL;
  ALTER TABLE "payload"."users" ALTER COLUMN "role" SET NOT NULL;
  ALTER TABLE "payload"."posts" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "payload"."_posts_v" ADD COLUMN "version_created_by_id" integer;
  ALTER TABLE "payload"."_posts_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "editor_notes_id" integer;
  ALTER TABLE "payload"."editor_notes" ADD CONSTRAINT "editor_notes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "payload"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."editor_notes" ADD CONSTRAINT "editor_notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "editor_notes_post_idx" ON "payload"."editor_notes" USING btree ("post_id");
  CREATE INDEX "editor_notes_created_by_idx" ON "payload"."editor_notes" USING btree ("created_by_id");
  CREATE INDEX "editor_notes_updated_at_idx" ON "payload"."editor_notes" USING btree ("updated_at");
  CREATE INDEX "editor_notes_created_at_idx" ON "payload"."editor_notes" USING btree ("created_at");
  ALTER TABLE "payload"."posts" ADD CONSTRAINT "posts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_posts_v" ADD CONSTRAINT "_posts_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_editor_notes_fk" FOREIGN KEY ("editor_notes_id") REFERENCES "payload"."editor_notes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_created_by_idx" ON "payload"."posts" USING btree ("created_by_id");
  CREATE INDEX "_posts_v_version_version_created_by_idx" ON "payload"."_posts_v" USING btree ("version_created_by_id");
  CREATE INDEX "_posts_v_autosave_idx" ON "payload"."_posts_v" USING btree ("autosave");
  CREATE INDEX "payload_locked_documents_rels_editor_notes_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("editor_notes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."editor_notes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."editor_notes" CASCADE;
  ALTER TABLE "payload"."posts" DROP CONSTRAINT "posts_created_by_id_users_id_fk";
  
  ALTER TABLE "payload"."_posts_v" DROP CONSTRAINT "_posts_v_version_created_by_id_users_id_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_editor_notes_fk";
  
  DROP INDEX "payload"."posts_created_by_idx";
  DROP INDEX "payload"."_posts_v_version_version_created_by_idx";
  DROP INDEX "payload"."_posts_v_autosave_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_editor_notes_id_idx";
  ALTER TABLE "payload"."users" DROP COLUMN "name";
  ALTER TABLE "payload"."users" DROP COLUMN "role";
  ALTER TABLE "payload"."posts" DROP COLUMN "created_by_id";
  ALTER TABLE "payload"."_posts_v" DROP COLUMN "version_created_by_id";
  ALTER TABLE "payload"."_posts_v" DROP COLUMN "autosave";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "editor_notes_id";
  DROP TYPE "payload"."enum_users_role";
  DROP TYPE "payload"."enum_editor_notes_note_type";`)
}
