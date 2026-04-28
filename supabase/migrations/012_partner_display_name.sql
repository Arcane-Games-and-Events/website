-- Migration 012: Partner public display name
-- Adds an optional public-facing handle so partners can show a podcast/brand
-- name instead of their real name in referral banners.

ALTER TABLE partner ADD COLUMN IF NOT EXISTS display_name TEXT;
