import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Create posts_decklists table
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "payload"."posts_decklists" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_uuid" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "raw_text" varchar
  );

  ALTER TABLE "payload"."posts_decklists" ADD CONSTRAINT "posts_decklists_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX IF NOT EXISTS "posts_decklists_order_idx" ON "payload"."posts_decklists" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "posts_decklists_parent_id_idx" ON "payload"."posts_decklists" USING btree ("_parent_id");`)

  // Create _posts_v_version_decklists table for versioned content
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "payload"."_posts_v_version_decklists" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_uuid" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "raw_text" varchar
  );

  ALTER TABLE "payload"."_posts_v_version_decklists" ADD CONSTRAINT "_posts_v_version_decklists_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX IF NOT EXISTS "_posts_v_version_decklists_order_idx" ON "payload"."_posts_v_version_decklists" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_posts_v_version_decklists_parent_id_idx" ON "payload"."_posts_v_version_decklists" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "payload"."posts_decklists" CASCADE;
   DROP TABLE IF EXISTS "payload"."_posts_v_version_decklists" CASCADE;`)
}
