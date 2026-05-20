-- Migration 016: pending-change buffer for cms_article
-- Once an article is published, further edits stage into draft_* columns
-- instead of going live immediately. An admin must approve the draft to
-- push it into the live columns.

ALTER TABLE cms_article
	ADD COLUMN IF NOT EXISTS draft_title TEXT,
	ADD COLUMN IF NOT EXISTS draft_excerpt TEXT,
	ADD COLUMN IF NOT EXISTS draft_body JSONB,
	ADD COLUMN IF NOT EXISTS draft_cover_image_id UUID REFERENCES cms_media(id),
	ADD COLUMN IF NOT EXISTS draft_read_time INTEGER,
	ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS draft_updated_by TEXT REFERENCES "user"(id);

CREATE INDEX IF NOT EXISTS idx_cms_article_draft_updated_at
	ON cms_article (draft_updated_at)
	WHERE draft_updated_at IS NOT NULL;
