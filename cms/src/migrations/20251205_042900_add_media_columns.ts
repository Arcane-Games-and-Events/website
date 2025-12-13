import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// This migration was applied to the database but the original file was lost.
// The changes were likely superseded by 20251208_000000_add_media_sizes.
// This stub exists to maintain migration history consistency.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // No-op: changes already applied or superseded
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // No-op
}
