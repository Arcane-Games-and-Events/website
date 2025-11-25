import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Drop and recreate tables with correct schema (serial id, varchar _uuid)
  await db.execute(sql`
   DROP TABLE IF EXISTS "payload"."posts_decklists" CASCADE;
   DROP TABLE IF EXISTS "payload"."_posts_v_version_decklists" CASCADE;`)

  // Recreate posts_decklists table with correct schema
  await db.execute(sql`
   CREATE TABLE "payload"."posts_decklists" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_uuid" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "raw_text" varchar
  );

  ALTER TABLE "payload"."posts_decklists" ADD CONSTRAINT "posts_decklists_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_decklists_order_idx" ON "payload"."posts_decklists" USING btree ("_order");
  CREATE INDEX "posts_decklists_parent_id_idx" ON "payload"."posts_decklists" USING btree ("_parent_id");`)

  // Recreate _posts_v_version_decklists table with correct schema
  await db.execute(sql`
   CREATE TABLE "payload"."_posts_v_version_decklists" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_uuid" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "raw_text" varchar
  );

  ALTER TABLE "payload"."_posts_v_version_decklists" ADD CONSTRAINT "_posts_v_version_decklists_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_posts_v_version_decklists_order_idx" ON "payload"."_posts_v_version_decklists" USING btree ("_order");
  CREATE INDEX "_posts_v_version_decklists_parent_id_idx" ON "payload"."_posts_v_version_decklists" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "payload"."posts_decklists" CASCADE;
   DROP TABLE IF EXISTS "payload"."_posts_v_version_decklists" CASCADE;`)
}
