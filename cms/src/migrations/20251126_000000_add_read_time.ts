import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Add read_time column to posts table
  await db.execute(sql`
    ALTER TABLE "payload"."posts" ADD COLUMN IF NOT EXISTS "read_time" numeric;
  `)

  // Add read_time column to versioned posts table
  await db.execute(sql`
    ALTER TABLE "payload"."_posts_v" ADD COLUMN IF NOT EXISTS "version_read_time" numeric;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."posts" DROP COLUMN IF EXISTS "read_time";
    ALTER TABLE "payload"."_posts_v" DROP COLUMN IF EXISTS "version_read_time";
  `)
}
