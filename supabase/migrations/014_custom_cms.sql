-- Migration 014: Custom CMS
-- Replaces Payload for blog articles and adds courses (text + video).
-- Articles render from cms_article first, falling back to Payload during the
-- 30-day dual-run window. Courses are net-new — no Payload involvement.

-- ============================================================================
-- TAGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MEDIA (uploaded images / attachments — videos use Mux instead)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by TEXT REFERENCES "user"(id),
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    alt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_media_uploaded_by ON cms_media (uploaded_by);

-- ============================================================================
-- ARTICLES
-- body is a Lexical JSON tree; source distinguishes custom-authored from migrated.
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_article (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT,
    cover_image_id UUID REFERENCES cms_media(id),
    body JSONB,
    read_time INTEGER,
    access_mode TEXT DEFAULT 'free',           -- 'free' | 'premium'
    status TEXT DEFAULT 'draft',                -- 'draft' | 'scheduled' | 'published' | 'archived'
    published_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    author_id TEXT REFERENCES "user"(id),
    source TEXT DEFAULT 'custom',               -- 'custom' | 'payload'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_article_status ON cms_article (status);
CREATE INDEX IF NOT EXISTS idx_cms_article_published_at ON cms_article (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_article_author_id ON cms_article (author_id);

-- Many-to-many article <-> tag.
CREATE TABLE IF NOT EXISTS cms_article_tag (
    article_id UUID NOT NULL REFERENCES cms_article(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES cms_tag(id) ON DELETE CASCADE,
    CONSTRAINT cms_article_tag_pk UNIQUE (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_cms_article_tag_article ON cms_article_tag (article_id);
CREATE INDEX IF NOT EXISTS idx_cms_article_tag_tag ON cms_article_tag (tag_id);

-- ============================================================================
-- COURSES → MODULES → LESSONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_course (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    cover_image_id UUID REFERENCES cms_media(id),
    trailer_video_id TEXT,                       -- Mux asset id
    price NUMERIC(10, 2),
    premium_discount BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'draft',                 -- 'draft' | 'published' | 'archived'
    published_at TIMESTAMPTZ,
    author_id TEXT REFERENCES "user"(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_course_status ON cms_course (status);
CREATE INDEX IF NOT EXISTS idx_cms_course_author_id ON cms_course (author_id);

CREATE TABLE IF NOT EXISTS cms_module (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES cms_course(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_module_course ON cms_module (course_id, position);

CREATE TABLE IF NOT EXISTS cms_lesson (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES cms_module(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    body JSONB,
    video_id TEXT,                                -- Mux asset id
    video_duration INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    is_preview BOOLEAN DEFAULT FALSE,
    read_time INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_lesson_module ON cms_lesson (module_id, position);

CREATE TABLE IF NOT EXISTS cms_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES cms_lesson(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ,
    last_position_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT cms_lesson_progress_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_cms_lesson_progress_user ON cms_lesson_progress (user_id);

-- ============================================================================
-- REVISIONS (autosave history for articles + lessons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_revision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,                    -- 'article' | 'lesson'
    entity_id UUID NOT NULL,
    body JSONB,
    saved_by TEXT REFERENCES "user"(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_revision_entity ON cms_revision (entity_type, entity_id, created_at DESC);

-- ============================================================================
-- ROLE ADDITIONS
-- The user.role column is plain text — adding 'writer' and 'creator' as
-- accepted values. This is documentation only; nothing changes structurally.
-- 'writer'  = can create/edit own articles
-- 'creator' = can create/edit own courses
-- ============================================================================
