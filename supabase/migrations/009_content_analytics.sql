-- Migration 009: Content Analytics
-- Adds page_view, article_engagement, and analytics_event tables
-- with indexes and get_content_analytics_data() RPC function

-- ============================================================
-- TABLE: page_view — every page load across the entire site
-- ============================================================
CREATE TABLE IF NOT EXISTS page_view (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    session_id TEXT,
    path TEXT NOT NULL,
    referrer TEXT,
    referrer_domain TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type TEXT,
    browser TEXT,
    country TEXT,
    is_new_visitor BOOLEAN DEFAULT FALSE,
    article_slug TEXT,
    article_title TEXT,
    article_author TEXT,
    article_tags TEXT,
    article_access_mode TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: article_engagement — deep per-article reading behavior
-- ============================================================
CREATE TABLE IF NOT EXISTS article_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_view_id UUID REFERENCES page_view(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    session_id TEXT,
    article_slug TEXT NOT NULL,
    time_on_page_seconds INTEGER,
    max_scroll_depth INTEGER,
    read_completed BOOLEAN DEFAULT FALSE,
    content_engaged BOOLEAN DEFAULT FALSE,
    exited_to TEXT,
    share_clicked TEXT,
    premium_cta_viewed BOOLEAN DEFAULT FALSE,
    premium_cta_clicked BOOLEAN DEFAULT FALSE,
    decklist_interactions INTEGER DEFAULT 0,
    card_hovers INTEGER DEFAULT 0,
    user_role_at_read TEXT,
    signed_up_after BOOLEAN DEFAULT FALSE,
    upgraded_after BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: analytics_event — flexible event tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_view_id UUID REFERENCES page_view(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    session_id TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB,
    path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================

-- page_view indexes
CREATE INDEX IF NOT EXISTS idx_page_view_created_at ON page_view(created_at);
CREATE INDEX IF NOT EXISTS idx_page_view_path ON page_view(path);
CREATE INDEX IF NOT EXISTS idx_page_view_session_id ON page_view(session_id);
CREATE INDEX IF NOT EXISTS idx_page_view_user_id ON page_view(user_id);
CREATE INDEX IF NOT EXISTS idx_page_view_article_slug ON page_view(article_slug);
CREATE INDEX IF NOT EXISTS idx_page_view_referrer_domain ON page_view(referrer_domain);
CREATE INDEX IF NOT EXISTS idx_page_view_country ON page_view(country);
CREATE INDEX IF NOT EXISTS idx_page_view_device_type ON page_view(device_type);

-- article_engagement indexes
CREATE INDEX IF NOT EXISTS idx_article_engagement_article_slug ON article_engagement(article_slug);
CREATE INDEX IF NOT EXISTS idx_article_engagement_page_view_id ON article_engagement(page_view_id);
CREATE INDEX IF NOT EXISTS idx_article_engagement_session_id ON article_engagement(session_id);
CREATE INDEX IF NOT EXISTS idx_article_engagement_created_at ON article_engagement(created_at);
CREATE INDEX IF NOT EXISTS idx_article_engagement_user_id ON article_engagement(user_id);

-- analytics_event indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event_event_type ON analytics_event(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_event_created_at ON analytics_event(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event_session_id ON analytics_event(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_page_view_id ON analytics_event(page_view_id);

-- ============================================================
-- RPC: get_content_analytics_data()
-- Returns comprehensive content analytics JSON
-- ============================================================
CREATE OR REPLACE FUNCTION get_content_analytics_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    today_start TIMESTAMP := date_trunc('day', NOW());
    week_start TIMESTAMP := NOW() - INTERVAL '7 days';
    month_start TIMESTAMP := date_trunc('month', NOW());
    thirty_days_ago TIMESTAMP := NOW() - INTERVAL '30 days';
    seven_days_ago TIMESTAMP := NOW() - INTERVAL '7 days';
BEGIN
    SELECT json_build_object(
        -- ============================
        -- PAGE VIEWS (site-wide)
        -- ============================
        'pageViews', json_build_object(
            'today', (SELECT COUNT(*) FROM page_view WHERE created_at >= today_start),
            'todayUnique', (SELECT COUNT(DISTINCT session_id) FROM page_view WHERE created_at >= today_start),
            'week', (SELECT COUNT(*) FROM page_view WHERE created_at >= week_start),
            'weekUnique', (SELECT COUNT(DISTINCT session_id) FROM page_view WHERE created_at >= week_start),
            'month', (SELECT COUNT(*) FROM page_view WHERE created_at >= month_start),
            'monthUnique', (SELECT COUNT(DISTINCT session_id) FROM page_view WHERE created_at >= month_start),
            'allTime', (SELECT COUNT(*) FROM page_view),
            'allTimeUnique', (SELECT COUNT(DISTINCT session_id) FROM page_view),
            -- Daily trend (last 30 days)
            'dailyTrend', (
                SELECT COALESCE(json_agg(json_build_object(
                    'date', dt,
                    'views', views,
                    'uniqueVisitors', uniques
                ) ORDER BY dt), '[]'::json)
                FROM (
                    SELECT DATE(created_at) as dt,
                           COUNT(*) as views,
                           COUNT(DISTINCT session_id) as uniques
                    FROM page_view WHERE created_at >= thirty_days_ago
                    GROUP BY DATE(created_at)
                ) d
            ),
            -- Top 20 pages
            'topPages', (
                SELECT COALESCE(json_agg(json_build_object(
                    'path', path,
                    'views', views,
                    'uniqueVisitors', uniques
                )), '[]'::json)
                FROM (
                    SELECT path,
                           COUNT(*) as views,
                           COUNT(DISTINCT session_id) as uniques
                    FROM page_view WHERE created_at >= thirty_days_ago
                    GROUP BY path
                    ORDER BY views DESC
                    LIMIT 20
                ) p
            ),
            -- Device breakdown
            'deviceBreakdown', (
                SELECT COALESCE(json_agg(json_build_object(
                    'device', COALESCE(device_type, 'unknown'),
                    'count', cnt
                )), '[]'::json)
                FROM (
                    SELECT device_type, COUNT(*) as cnt
                    FROM page_view WHERE created_at >= thirty_days_ago
                    GROUP BY device_type ORDER BY cnt DESC
                ) dv
            ),
            -- Browser breakdown
            'browserBreakdown', (
                SELECT COALESCE(json_agg(json_build_object(
                    'browser', COALESCE(browser, 'unknown'),
                    'count', cnt
                )), '[]'::json)
                FROM (
                    SELECT browser, COUNT(*) as cnt
                    FROM page_view WHERE created_at >= thirty_days_ago
                    GROUP BY browser ORDER BY cnt DESC
                    LIMIT 10
                ) br
            ),
            -- Top countries
            'topCountries', (
                SELECT COALESCE(json_agg(json_build_object(
                    'country', country,
                    'count', cnt
                )), '[]'::json)
                FROM (
                    SELECT country, COUNT(*) as cnt
                    FROM page_view WHERE created_at >= thirty_days_ago AND country IS NOT NULL
                    GROUP BY country ORDER BY cnt DESC
                    LIMIT 20
                ) co
            ),
            -- New vs returning ratio
            'newVsReturning', json_build_object(
                'new', (SELECT COUNT(*) FROM page_view WHERE created_at >= thirty_days_ago AND is_new_visitor = TRUE),
                'returning', (SELECT COUNT(*) FROM page_view WHERE created_at >= thirty_days_ago AND is_new_visitor = FALSE)
            )
        ),

        -- ============================
        -- ARTICLES
        -- ============================
        'articles', json_build_object(
            -- Top articles by views (last 30 days)
            'topByViews', (
                SELECT COALESCE(json_agg(json_build_object(
                    'slug', slug,
                    'title', title,
                    'author', author,
                    'tags', tags,
                    'accessMode', access_mode,
                    'views', views,
                    'uniqueReaders', unique_readers
                ) ORDER BY views DESC), '[]'::json)
                FROM (
                    SELECT article_slug as slug,
                           MAX(article_title) as title,
                           MAX(article_author) as author,
                           MAX(article_tags) as tags,
                           MAX(article_access_mode) as access_mode,
                           COUNT(*) as views,
                           COUNT(DISTINCT session_id) as unique_readers
                    FROM page_view
                    WHERE article_slug IS NOT NULL AND created_at >= thirty_days_ago
                    GROUP BY article_slug
                    ORDER BY views DESC
                    LIMIT 30
                ) sub
            ),
            -- Engagement metrics per article
            'engagement', (
                SELECT COALESCE(json_agg(json_build_object(
                    'slug', slug,
                    'avgTime', avg_time,
                    'avgScrollDepth', avg_scroll,
                    'completionRate', completion_rate,
                    'engagementRate', engagement_rate,
                    'shareCount', share_count,
                    'totalReads', total_reads
                )), '[]'::json)
                FROM (
                    SELECT article_slug as slug,
                           ROUND(AVG(time_on_page_seconds)) as avg_time,
                           ROUND(AVG(max_scroll_depth)) as avg_scroll,
                           ROUND(
                               CASE WHEN COUNT(*) > 0
                               THEN (SUM(CASE WHEN read_completed THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100
                               ELSE 0 END, 1
                           ) as completion_rate,
                           ROUND(
                               CASE WHEN COUNT(*) > 0
                               THEN (SUM(CASE WHEN content_engaged THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100
                               ELSE 0 END, 1
                           ) as engagement_rate,
                           SUM(CASE WHEN share_clicked IS NOT NULL THEN 1 ELSE 0 END) as share_count,
                           COUNT(*) as total_reads
                    FROM article_engagement
                    WHERE created_at >= thirty_days_ago
                    GROUP BY article_slug
                    ORDER BY total_reads DESC
                    LIMIT 30
                ) sub
            ),
            -- Performance by tag
            'byTag', (
                SELECT COALESCE(json_agg(json_build_object(
                    'tag', tag,
                    'articleCount', article_count,
                    'totalViews', total_views,
                    'avgEngagementRate', avg_engagement
                )), '[]'::json)
                FROM (
                    SELECT unnest(string_to_array(article_tags, ',')) as tag,
                           COUNT(DISTINCT pv.article_slug) as article_count,
                           COUNT(*) as total_views,
                           ROUND(AVG(CASE WHEN ae.content_engaged THEN 100 ELSE 0 END), 1) as avg_engagement
                    FROM page_view pv
                    LEFT JOIN article_engagement ae ON ae.page_view_id = pv.id
                    WHERE pv.article_slug IS NOT NULL
                      AND pv.article_tags IS NOT NULL
                      AND pv.created_at >= thirty_days_ago
                    GROUP BY tag
                    ORDER BY total_views DESC
                    LIMIT 20
                ) t
            ),
            -- Performance by author
            'byAuthor', (
                SELECT COALESCE(json_agg(json_build_object(
                    'author', author,
                    'articleCount', article_count,
                    'totalViews', total_views,
                    'avgViewsPerArticle', avg_views_per,
                    'avgCompletionRate', avg_completion
                )), '[]'::json)
                FROM (
                    SELECT pv.article_author as author,
                           COUNT(DISTINCT pv.article_slug) as article_count,
                           COUNT(*) as total_views,
                           ROUND(COUNT(*)::DECIMAL / GREATEST(COUNT(DISTINCT pv.article_slug), 1), 1) as avg_views_per,
                           ROUND(AVG(CASE WHEN ae.read_completed THEN 100 ELSE 0 END), 1) as avg_completion
                    FROM page_view pv
                    LEFT JOIN article_engagement ae ON ae.page_view_id = pv.id
                    WHERE pv.article_author IS NOT NULL AND pv.created_at >= thirty_days_ago
                    GROUP BY pv.article_author
                    ORDER BY total_views DESC
                ) sub
            ),
            -- Free vs Premium comparison
            'byAccessMode', (
                SELECT COALESCE(json_agg(json_build_object(
                    'accessMode', article_access_mode,
                    'views', views,
                    'avgTime', avg_time,
                    'engagementRate', engagement_rate,
                    'completionRate', completion_rate
                )), '[]'::json)
                FROM (
                    SELECT pv.article_access_mode,
                           COUNT(*) as views,
                           ROUND(AVG(ae.time_on_page_seconds)) as avg_time,
                           ROUND(AVG(CASE WHEN ae.content_engaged THEN 100 ELSE 0 END), 1) as engagement_rate,
                           ROUND(AVG(CASE WHEN ae.read_completed THEN 100 ELSE 0 END), 1) as completion_rate
                    FROM page_view pv
                    LEFT JOIN article_engagement ae ON ae.page_view_id = pv.id
                    WHERE pv.article_access_mode IS NOT NULL AND pv.created_at >= thirty_days_ago
                    GROUP BY pv.article_access_mode
                ) am
            ),
            -- Top entry points (articles with most external referrer traffic)
            'topEntryPoints', (
                SELECT COALESCE(json_agg(json_build_object(
                    'slug', slug,
                    'title', title,
                    'externalViews', external_views,
                    'topReferrer', top_referrer
                )), '[]'::json)
                FROM (
                    SELECT article_slug as slug,
                           MAX(article_title) as title,
                           COUNT(*) as external_views,
                           MODE() WITHIN GROUP (ORDER BY referrer_domain) as top_referrer
                    FROM page_view
                    WHERE article_slug IS NOT NULL
                      AND referrer_domain IS NOT NULL
                      AND created_at >= thirty_days_ago
                    GROUP BY article_slug
                    ORDER BY external_views DESC
                    LIMIT 15
                ) sub
            ),
            -- Engagement by device type
            'byDevice', (
                SELECT COALESCE(json_agg(json_build_object(
                    'device', device,
                    'reads', reads,
                    'avgTime', avg_time,
                    'avgScrollDepth', avg_scroll,
                    'completionRate', completion_rate
                )), '[]'::json)
                FROM (
                    SELECT COALESCE(pv.device_type, 'unknown') as device,
                           COUNT(*) as reads,
                           ROUND(AVG(ae.time_on_page_seconds)) as avg_time,
                           ROUND(AVG(ae.max_scroll_depth)) as avg_scroll,
                           ROUND(AVG(CASE WHEN ae.read_completed THEN 100 ELSE 0 END), 1) as completion_rate
                    FROM article_engagement ae
                    JOIN page_view pv ON pv.id = ae.page_view_id
                    WHERE ae.created_at >= thirty_days_ago
                    GROUP BY pv.device_type
                ) sub
            )
        ),

        -- ============================
        -- TRAFFIC
        -- ============================
        'traffic', json_build_object(
            -- Top referrers
            'topReferrers', (
                SELECT COALESCE(json_agg(json_build_object(
                    'domain', COALESCE(referrer_domain, 'direct'),
                    'views', cnt
                )), '[]'::json)
                FROM (
                    SELECT referrer_domain, COUNT(*) as cnt
                    FROM page_view WHERE created_at >= thirty_days_ago
                    GROUP BY referrer_domain
                    ORDER BY cnt DESC
                    LIMIT 15
                ) r
            ),
            -- UTM campaign performance
            'utmCampaigns', (
                SELECT COALESCE(json_agg(json_build_object(
                    'campaign', utm_campaign,
                    'source', utm_source,
                    'medium', utm_medium,
                    'views', views,
                    'uniqueVisitors', uniques
                )), '[]'::json)
                FROM (
                    SELECT utm_campaign, utm_source, utm_medium,
                           COUNT(*) as views,
                           COUNT(DISTINCT session_id) as uniques
                    FROM page_view
                    WHERE utm_campaign IS NOT NULL AND created_at >= thirty_days_ago
                    GROUP BY utm_campaign, utm_source, utm_medium
                    ORDER BY views DESC
                    LIMIT 20
                ) u
            ),
            -- Source breakdown (Search / Social / Direct / Other)
            'sourceBreakdown', json_build_object(
                'direct', (SELECT COUNT(*) FROM page_view WHERE referrer_domain IS NULL AND created_at >= thirty_days_ago),
                'search', (SELECT COUNT(*) FROM page_view WHERE referrer_domain IN ('google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com', 'yandex.com') AND created_at >= thirty_days_ago),
                'social', (SELECT COUNT(*) FROM page_view WHERE referrer_domain IN ('twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'reddit.com', 'discord.com', 'youtube.com', 'tiktok.com', 'linkedin.com', 'threads.net') AND created_at >= thirty_days_ago),
                'other', (SELECT COUNT(*) FROM page_view WHERE referrer_domain IS NOT NULL AND referrer_domain NOT IN ('google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com', 'yandex.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'reddit.com', 'discord.com', 'youtube.com', 'tiktok.com', 'linkedin.com', 'threads.net') AND created_at >= thirty_days_ago)
            )
        ),

        -- ============================
        -- CONVERSIONS
        -- ============================
        'conversions', json_build_object(
            'signupsFromArticles', (
                SELECT COUNT(*) FROM article_engagement WHERE signed_up_after = TRUE
            ),
            'upgradesFromArticles', (
                SELECT COUNT(*) FROM article_engagement WHERE upgraded_after = TRUE
            ),
            -- Top converting articles
            'topConverting', (
                SELECT COALESCE(json_agg(json_build_object(
                    'slug', slug,
                    'title', title,
                    'signups', signups,
                    'upgrades', upgrades,
                    'totalConversions', total_conversions
                ) ORDER BY total_conversions DESC), '[]'::json)
                FROM (
                    SELECT ae.article_slug as slug,
                           MAX(pv.article_title) as title,
                           SUM(CASE WHEN ae.signed_up_after THEN 1 ELSE 0 END) as signups,
                           SUM(CASE WHEN ae.upgraded_after THEN 1 ELSE 0 END) as upgrades,
                           SUM(CASE WHEN ae.signed_up_after OR ae.upgraded_after THEN 1 ELSE 0 END) as total_conversions
                    FROM article_engagement ae
                    LEFT JOIN page_view pv ON pv.id = ae.page_view_id
                    WHERE ae.signed_up_after = TRUE OR ae.upgraded_after = TRUE
                    GROUP BY ae.article_slug
                    ORDER BY total_conversions DESC
                    LIMIT 15
                ) sub
            ),
            -- Premium CTA effectiveness
            'premiumCta', json_build_object(
                'totalViewed', (SELECT COUNT(*) FROM article_engagement WHERE premium_cta_viewed = TRUE),
                'totalClicked', (SELECT COUNT(*) FROM article_engagement WHERE premium_cta_clicked = TRUE),
                'clickRate', (
                    SELECT CASE
                        WHEN (SELECT COUNT(*) FROM article_engagement WHERE premium_cta_viewed = TRUE) > 0
                        THEN ROUND(
                            (SELECT COUNT(*) FROM article_engagement WHERE premium_cta_clicked = TRUE)::DECIMAL /
                            (SELECT COUNT(*) FROM article_engagement WHERE premium_cta_viewed = TRUE) * 100, 1
                        )
                        ELSE 0
                    END
                )
            )
        ),

        -- ============================
        -- USER SPLIT
        -- ============================
        'userSplit', json_build_object(
            'loggedIn', (SELECT COUNT(*) FROM page_view WHERE user_id IS NOT NULL AND created_at >= thirty_days_ago),
            'anonymous', (SELECT COUNT(*) FROM page_view WHERE user_id IS NULL AND created_at >= thirty_days_ago),
            'premiumReaders', (
                SELECT COUNT(DISTINCT ae.user_id) FROM article_engagement ae
                WHERE ae.user_role_at_read = 'premium' AND ae.created_at >= thirty_days_ago
            ),
            'newVisitors', (SELECT COUNT(*) FROM page_view WHERE is_new_visitor = TRUE AND created_at >= thirty_days_ago),
            'returningVisitors', (SELECT COUNT(*) FROM page_view WHERE is_new_visitor = FALSE AND created_at >= thirty_days_ago)
        )
    ) INTO result;

    RETURN result;
END;
$$;
