import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Add missing _uuid column to both tables
  await db.execute(sql`
   ALTER TABLE "payload"."posts_decklists" ADD COLUMN IF NOT EXISTS "_uuid" varchar;
   ALTER TABLE "payload"."_posts_v_version_decklists" ADD COLUMN IF NOT EXISTS "_uuid" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."posts_decklists" DROP COLUMN IF EXISTS "_uuid";
   ALTER TABLE "payload"."_posts_v_version_decklists" DROP COLUMN IF EXISTS "_uuid";`)
}
