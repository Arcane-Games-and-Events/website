-- Migration 010: Event Player Cap
-- Adds player_cap column to events table for capacity limits

ALTER TABLE events ADD COLUMN IF NOT EXISTS player_cap INTEGER;
