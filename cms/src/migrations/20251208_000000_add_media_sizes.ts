import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add thumbnail size columns
  await db.execute(sql`
    ALTER TABLE "payload"."media"
    ADD COLUMN IF NOT EXISTS "sizes_thumbnail_url" varchar,
    ADD COLUMN IF NOT EXISTS "sizes_thumbnail_width" numeric,
    ADD COLUMN IF NOT EXISTS "sizes_thumbnail_height" numeric,
    ADD COLUMN IF NOT EXISTS "sizes_thumbnail_mime_type" varchar,
    ADD COLUMN IF NOT EXISTS "sizes_thumbnail_filesize" numeric,
    ADD COLUMN IF NOT EXISTS "sizes_thumbnail_filename" varchar;
  `)

  // Add card size columns
  await db.execute(sql`
    ALTER TABLE "payload"."media"
    ADD COLUMN IF NOT EXISTS "sizes_card_url" varchar,
    ADD COLUMN IF NOT EXISTS "sizes_card_width" numeric,
    ADD COLUMN IF NOT EXISTS "sizes_card_height" numeric,
    ADD COLUMN IF NOT EXISTS "sizes_card_mime_type" varchar,
    ADD COLUMN IF NOT EXISTS "sizes_card_filesize" numeric,
    ADD COLUMN IF NOT EXISTS "sizes_card_filename" varchar;
  `)

  // Add featured size columns
  await db.execute(sql`
    ALTER TABLE "payload"."media"
    ADD COLUMN IF NOT EXISTS "sizes_featured_url" varchar,
    ADD COLUMN IF NOT EXISTS "sizes_featured_width" numeric,
    ADD COLUMN IF NOT EXISTS "sizes_featured_height" numeric,
    ADD COLUMN IF NOT EXISTS "sizes_featured_mime_type" varchar,
    ADD COLUMN IF NOT EXISTS "sizes_featured_filesize" numeric,
    ADD COLUMN IF NOT EXISTS "sizes_featured_filename" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."media"
    DROP COLUMN IF EXISTS "sizes_thumbnail_url",
    DROP COLUMN IF EXISTS "sizes_thumbnail_width",
    DROP COLUMN IF EXISTS "sizes_thumbnail_height",
    DROP COLUMN IF EXISTS "sizes_thumbnail_mime_type",
    DROP COLUMN IF EXISTS "sizes_thumbnail_filesize",
    DROP COLUMN IF EXISTS "sizes_thumbnail_filename",
    DROP COLUMN IF EXISTS "sizes_card_url",
    DROP COLUMN IF EXISTS "sizes_card_width",
    DROP COLUMN IF EXISTS "sizes_card_height",
    DROP COLUMN IF EXISTS "sizes_card_mime_type",
    DROP COLUMN IF EXISTS "sizes_card_filesize",
    DROP COLUMN IF EXISTS "sizes_card_filename",
    DROP COLUMN IF EXISTS "sizes_featured_url",
    DROP COLUMN IF EXISTS "sizes_featured_width",
    DROP COLUMN IF EXISTS "sizes_featured_height",
    DROP COLUMN IF EXISTS "sizes_featured_mime_type",
    DROP COLUMN IF EXISTS "sizes_featured_filesize",
    DROP COLUMN IF EXISTS "sizes_featured_filename";
  `)
}
