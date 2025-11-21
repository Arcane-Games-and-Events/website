-- Migration: Drop theme column from user table
-- Since we're removing dark mode support, the theme column is no longer needed

ALTER TABLE "user" DROP COLUMN IF EXISTS "theme";
