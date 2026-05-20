-- Migration 015: stacked CMS roles
-- Lets a single user be tagged with extra roles beyond their primary `role`.
-- Common case: writer + creator simultaneously.

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS additional_roles TEXT[] NOT NULL DEFAULT ARRAY[]::text[];
