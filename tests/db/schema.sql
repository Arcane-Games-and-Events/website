--
-- PostgreSQL database dump
--

\restrict AaFSXBcqXWPOIvjLkDxnjJDBAg444GREOuGAJPdG5VKJoAjJjQbvOTWeB4lCR3m

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: finalize_event(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_event(p_event_id text, p_user_id text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_event RECORD;
    v_result_count INT;
BEGIN
    -- Get event data
    SELECT * INTO v_event FROM events WHERE id = p_event_id;

    IF v_event IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Event not found');
    END IF;

    -- Check if there are results
    SELECT COUNT(*) INTO v_result_count FROM results WHERE event_id = p_event_id;
    IF v_result_count = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No results to finalize. Please upload results first.');
    END IF;

    -- Just update event status - standings are already synced from CSV upload
    UPDATE events SET
        status = 'completed',
        closed_at = NOW(),
        closed_by = p_user_id
    WHERE id = p_event_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Event marked as completed',
        'resultCount', v_result_count
    );
END;
$$;


--
-- Name: get_admin_dashboard_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_dashboard_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
    now_ts TIMESTAMP := NOW();
    today_start TIMESTAMP := date_trunc('day', NOW());
    week_start TIMESTAMP := NOW() - INTERVAL '7 days';
    month_start TIMESTAMP := date_trunc('month', NOW());
    thirty_days_ago TIMESTAMP := NOW() - INTERVAL '30 days';
    thirty_days_future TIMESTAMP := NOW() + INTERVAL '30 days';
BEGIN
    SELECT json_build_object(
        'stats', json_build_object(
            'totalEvents', (SELECT COUNT(*) FROM events),
            'totalOrders', (SELECT COUNT(*) FROM "order"),
            'premiumUsers', (SELECT COUNT(*) FROM "user" WHERE role = 'premium'),
            'totalUsers', (SELECT COUNT(*) FROM "user"),
            'totalPlayers', (SELECT COUNT(DISTINCT gem_id) FROM standings WHERE gem_id IS NOT NULL),
            'totalTicketsSold', (SELECT COUNT(*) FROM ticket WHERE refunded IS NOT TRUE),
            'totalRefunded', (SELECT COUNT(*) FROM ticket WHERE refunded = true),
            'upcomingEvents', (SELECT COUNT(*) FROM events WHERE event_date >= now_ts),
            'pastEvents', (SELECT COUNT(*) FROM events WHERE event_date < now_ts)
        ),
        'analytics', json_build_object(
            'todayRevenue', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= today_start), 0),
            'weekRevenue', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= week_start), 0),
            'monthRevenue', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= month_start), 0),
            'totalRevenue', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order"), 0),
            'revenueByType', (
                SELECT COALESCE(json_agg(json_build_object('type', type, 'total', total, 'count', cnt)), '[]'::json)
                FROM (
                    SELECT COALESCE(meta->>'type', 'unknown') as type,
                           COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total,
                           COUNT(*) as cnt
                    FROM "order" GROUP BY meta->>'type'
                ) t
            ),
            'dailyTrend', (
                SELECT COALESCE(json_agg(json_build_object('date', dt, 'total', total, 'count', cnt) ORDER BY dt), '[]'::json)
                FROM (
                    SELECT DATE(created_at) as dt,
                           COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total,
                           COUNT(*) as cnt
                    FROM "order" WHERE created_at >= thirty_days_ago
                    GROUP BY DATE(created_at)
                ) d
            ),
            'topEvents', (
                SELECT COALESCE(json_agg(json_build_object(
                    'eventId', event_id, 'eventTitle', event_title, 'totalRevenue', total_rev, 'ticketCount', cnt
                )), '[]'::json)
                FROM (
                    SELECT meta->>'eventId' as event_id,
                           meta->>'eventTitle' as event_title,
                           COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_rev,
                           COUNT(*) as cnt
                    FROM "order"
                    WHERE meta->>'type' = 'ticket'
                    GROUP BY meta->>'eventId', meta->>'eventTitle'
                    ORDER BY total_rev DESC LIMIT 5
                ) e
            ),
            'customerStats', (
                SELECT COALESCE(json_agg(json_build_object(
                    'email', email, 'orderCount', order_count, 'totalSpent', total_spent,
                    'firstOrder', first_order, 'lastOrder', last_order
                )), '[]'::json)
                FROM (
                    SELECT user_email as email, COUNT(*) as order_count,
                           COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_spent,
                           MIN(created_at) as first_order, MAX(created_at) as last_order
                    FROM "order" GROUP BY user_email
                    ORDER BY total_spent DESC LIMIT 100
                ) c
            )
        ),
        'eventAnalytics', json_build_object(
            'byCircuit', (
                SELECT COALESCE(json_object_agg(circuit, cnt), '{}'::json)
                FROM (SELECT COALESCE(circuit, 'Unassigned') as circuit, COUNT(*) as cnt FROM events GROUP BY circuit) c
            ),
            'byFormat', (
                SELECT COALESCE(json_object_agg(format, cnt), '{}'::json)
                FROM (SELECT COALESCE(format, 'Unknown') as format, COUNT(*) as cnt FROM events GROUP BY format) f
            ),
            'byStatus', json_build_object(
                'upcoming', (SELECT COUNT(*) FROM events WHERE status = 'upcoming' OR (status IS NULL AND event_date >= now_ts)),
                'in_progress', (SELECT COUNT(*) FROM events WHERE status = 'in_progress'),
                'completed', (SELECT COUNT(*) FROM events WHERE status = 'completed'),
                'cancelled', (SELECT COUNT(*) FROM events WHERE status = 'cancelled')
            ),
            'upcoming', (
                SELECT COALESCE(json_agg(json_build_object(
                    'id', id, 'title', title, 'eventDate', event_date, 'circuit', circuit, 'location', location
                ) ORDER BY event_date), '[]'::json)
                FROM (
                    SELECT id, title, event_date, circuit, location
                    FROM events
                    WHERE event_date >= now_ts AND event_date <= thirty_days_future
                    ORDER BY event_date LIMIT 10
                ) e
            )
        ),
        'events', (
            SELECT COALESCE(json_agg(row_to_json(e) ORDER BY created_at DESC), '[]'::json)
            FROM (SELECT * FROM events ORDER BY created_at DESC LIMIT 50) e
        ),
        'standings', (
            SELECT COALESCE(json_agg(row_to_json(s) ORDER BY total_points DESC NULLS LAST), '[]'::json)
            FROM (SELECT * FROM standings ORDER BY total_points DESC NULLS LAST LIMIT 100) s
        ),
        'orders', (
            SELECT COALESCE(json_agg(row_to_json(o) ORDER BY created_at DESC), '[]'::json)
            FROM (SELECT * FROM "order" ORDER BY created_at DESC) o
        ),
        'users', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', id, 'email', email, 'role', role, 'createdAt', created_at,
                'first_name', first_name, 'last_name', last_name
            ) ORDER BY created_at DESC), '[]'::json)
            FROM (SELECT id, email, role, created_at, first_name, last_name FROM "user" ORDER BY created_at DESC) u
        ),
        'lssEvents', (
            SELECT COALESCE(json_agg(row_to_json(s) ORDER BY start_date DESC), '[]'::json)
            FROM lss_events s
        ),
        'ticketStats', (
            SELECT COALESCE(json_agg(json_build_object(
                'eventId', event_id, 'sold', sold, 'refunded', refunded, 'revenue', revenue
            )), '[]'::json)
            FROM (
                SELECT event_id, COUNT(*) as sold,
                       SUM(CASE WHEN refunded = true THEN 1 ELSE 0 END) as refunded,
                       COALESCE(SUM(CAST(amount_paid AS DECIMAL)), 0) as revenue
                FROM ticket GROUP BY event_id
            ) t
        )
    ) INTO result;

    RETURN result;
END;
$$;


--
-- Name: get_analytics_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_analytics_data() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
    today_start TIMESTAMP := date_trunc('day', NOW());
    week_start TIMESTAMP := NOW() - INTERVAL '7 days';
    month_start TIMESTAMP := date_trunc('month', NOW());
    last_month_start TIMESTAMP := date_trunc('month', NOW() - INTERVAL '1 month');
    year_start TIMESTAMP := date_trunc('year', NOW());
    thirty_days_ago TIMESTAMP := NOW() - INTERVAL '30 days';
BEGIN
    SELECT json_build_object(
        'revenue', json_build_object(
            'today', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= today_start), 0),
            'todayOrders', (SELECT COUNT(*) FROM "order" WHERE created_at >= today_start),
            'week', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= week_start), 0),
            'weekOrders', (SELECT COUNT(*) FROM "order" WHERE created_at >= week_start),
            'month', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= month_start), 0),
            'monthOrders', (SELECT COUNT(*) FROM "order" WHERE created_at >= month_start),
            'lastMonth', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= last_month_start AND created_at < month_start), 0),
            'ytd', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= year_start), 0),
            'allTime', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order"), 0),
            'allTimeOrders', (SELECT COUNT(*) FROM "order"),
            'byType', (
                SELECT COALESCE(json_agg(json_build_object(
                    'type', COALESCE(type, 'unknown'),
                    'total', total,
                    'count', cnt
                )), '[]'::json)
                FROM (
                    SELECT meta->>'type' as type, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total, COUNT(*) as cnt
                    FROM "order" GROUP BY meta->>'type' ORDER BY total DESC
                ) t
            ),
            'dailyTrend', (
                SELECT COALESCE(json_agg(json_build_object('date', dt, 'total', total, 'count', cnt) ORDER BY dt), '[]'::json)
                FROM (
                    SELECT DATE(created_at) as dt, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total, COUNT(*) as cnt
                    FROM "order" WHERE created_at >= thirty_days_ago
                    GROUP BY DATE(created_at)
                ) d
            ),
            'monthlyTrend', (
                SELECT COALESCE(json_agg(json_build_object('month', m, 'monthName', mn, 'total', total, 'count', cnt) ORDER BY m), '[]'::json)
                FROM (
                    SELECT TO_CHAR(created_at, 'YYYY-MM') as m, TO_CHAR(created_at, 'Mon YYYY') as mn,
                           COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total, COUNT(*) as cnt
                    FROM "order" GROUP BY m, mn ORDER BY m DESC LIMIT 12
                ) mo
            )
        ),
        'users', json_build_object(
            'total', (SELECT COUNT(*) FROM "user"),
            'newThisMonth', (SELECT COUNT(*) FROM "user" WHERE created_at >= month_start),
            'newLastMonth', (SELECT COUNT(*) FROM "user" WHERE created_at >= last_month_start AND created_at < month_start),
            'activeSubscribers', (SELECT COUNT(*) FROM "user" WHERE subscription_status = 'active'),
            'byRole', (
                SELECT COALESCE(json_agg(json_build_object('role', COALESCE(role, 'unknown'), 'count', cnt)), '[]'::json)
                FROM (SELECT role, COUNT(*) as cnt FROM "user" GROUP BY role ORDER BY cnt DESC) r
            ),
            'subscriptionBreakdown', (
                SELECT COALESCE(json_agg(json_build_object('type', type, 'status', status, 'count', cnt)), '[]'::json)
                FROM (
                    SELECT subscription_type as type, subscription_status as status, COUNT(*) as cnt
                    FROM "user" WHERE subscription_type IS NOT NULL
                    GROUP BY subscription_type, subscription_status
                ) s
            ),
            'dailySignups', (
                SELECT COALESCE(json_agg(json_build_object('date', dt, 'count', cnt) ORDER BY dt), '[]'::json)
                FROM (
                    SELECT DATE(created_at) as dt, COUNT(*) as cnt
                    FROM "user" WHERE created_at >= thirty_days_ago
                    GROUP BY DATE(created_at)
                ) d
            )
        ),
        'events', json_build_object(
            'total', (SELECT COUNT(*) FROM events),
            'upcoming', (SELECT COUNT(*) FROM events WHERE event_date >= NOW()),
            'byStatus', (
                SELECT COALESCE(json_agg(json_build_object('status', COALESCE(status, 'unknown'), 'count', cnt)), '[]'::json)
                FROM (SELECT status, COUNT(*) as cnt FROM events GROUP BY status) s
            ),
            'byCircuit', (
                SELECT COALESCE(json_agg(json_build_object('circuit', circuit, 'count', cnt)), '[]'::json)
                FROM (SELECT COALESCE(circuit, 'Unassigned') as circuit, COUNT(*) as cnt FROM events GROUP BY circuit ORDER BY cnt DESC) c
            ),
            'byFormat', (
                SELECT COALESCE(json_agg(json_build_object('format', format, 'count', cnt)), '[]'::json)
                FROM (SELECT COALESCE(format, 'Unknown') as format, COUNT(*) as cnt FROM events GROUP BY format ORDER BY cnt DESC) f
            )
        ),
        'tickets', json_build_object(
            'total', (SELECT COUNT(*) FROM ticket),
            'thisMonth', (SELECT COUNT(*) FROM ticket WHERE created_at >= month_start),
            'thisMonthRevenue', COALESCE((SELECT SUM(CAST(amount_paid AS DECIMAL)) FROM ticket WHERE created_at >= month_start), 0),
            'lastMonth', (SELECT COUNT(*) FROM ticket WHERE created_at >= last_month_start AND created_at < month_start),
            'refunded', (SELECT COUNT(*) FROM ticket WHERE refunded = true),
            'totalRevenue', COALESCE((SELECT SUM(CAST(amount_paid AS DECIMAL)) FROM ticket WHERE refunded IS NOT TRUE), 0),
            'byCircuit', (
                SELECT COALESCE(json_agg(json_build_object('circuit', circuit, 'count', cnt, 'revenue', rev)), '[]'::json)
                FROM (
                    SELECT COALESCE(e.circuit, 'Unassigned') as circuit, COUNT(*) as cnt,
                           COALESCE(SUM(CAST(t.amount_paid AS DECIMAL)), 0) as rev
                    FROM ticket t LEFT JOIN events e ON t.event_id = e.id
                    GROUP BY e.circuit ORDER BY cnt DESC
                ) c
            ),
            'topEvents', (
                SELECT COALESCE(json_agg(json_build_object(
                    'eventId', event_id, 'title', title, 'circuit', circuit, 'count', cnt, 'revenue', rev
                )), '[]'::json)
                FROM (
                    SELECT t.event_id, e.title, e.circuit, COUNT(*) as cnt,
                           COALESCE(SUM(CAST(t.amount_paid AS DECIMAL)), 0) as rev
                    FROM ticket t LEFT JOIN events e ON t.event_id = e.id
                    WHERE t.refunded IS NOT TRUE
                    GROUP BY t.event_id, e.title, e.circuit
                    ORDER BY cnt DESC LIMIT 10
                ) te
            )
        ),
        'courses', json_build_object(
            'total', (SELECT COUNT(*) FROM entitlement),
            'byProduct', (
                SELECT COALESCE(json_agg(json_build_object('product', product, 'count', cnt)), '[]'::json)
                FROM (SELECT product, COUNT(*) as cnt FROM entitlement GROUP BY product ORDER BY cnt DESC) p
            )
        ),
        'players', json_build_object(
            'total', (SELECT COUNT(DISTINCT gem_id) FROM standings WHERE gem_id IS NOT NULL),
            'byCircuit', (
                SELECT COALESCE(json_agg(json_build_object('circuit', circuit, 'count', cnt)), '[]'::json)
                FROM (SELECT circuit, COUNT(DISTINCT gem_id) as cnt FROM standings GROUP BY circuit ORDER BY cnt DESC) c
            ),
            'topPlayers', (
                SELECT COALESCE(json_agg(json_build_object(
                    'name', player_name, 'gemId', gem_id, 'circuit', circuit,
                    'points', total_points, 'matchesWon', matches_won, 'matchesPlayed', matches_played
                )), '[]'::json)
                FROM (
                    SELECT player_name, gem_id, circuit, total_points, matches_won, matches_played
                    FROM standings ORDER BY total_points DESC NULLS LAST LIMIT 10
                ) tp
            )
        ),
        'customers', (
            SELECT json_build_object(
                'total', COUNT(DISTINCT user_email),
                'topCustomers', (
                    SELECT COALESCE(json_agg(json_build_object(
                        'email', email, 'orderCount', order_count, 'totalSpent', total_spent
                    )), '[]'::json)
                    FROM (
                        SELECT user_email as email, COUNT(*) as order_count,
                               COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_spent
                        FROM "order"
                        GROUP BY user_email
                        ORDER BY total_spent DESC
                        LIMIT 10
                    ) tc
                )
            )
            FROM "order"
        ),
        'premium', json_build_object(
            'totalPremium', (SELECT COUNT(*) FROM "user" WHERE role = 'premium'),
            'paidPremium', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_id IS NOT NULL),
            'assignedPremium', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_id IS NULL),
            'paidActive', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_status = 'active'),
            'paidCancelled', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_status = 'cancelled'),
            'paidExpired', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_status = 'expired'),
            'paidPaymentFailed', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_status = 'payment_failed'),
            'paidMonthlyActive', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_type = 'monthly' AND subscription_status = 'active'),
            'paidYearlyActive', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_type = 'yearly' AND subscription_status = 'active'),
            'paidMonthlyCancelled', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_type = 'monthly' AND subscription_status = 'cancelled'),
            'paidYearlyCancelled', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_type = 'yearly' AND subscription_status = 'cancelled'),
            'recentSignups', (
                SELECT COALESCE(json_agg(json_build_object(
                    'email', email, 'firstName', first_name, 'lastName', last_name,
                    'type', 'paid', 'subscriptionType', subscription_type,
                    'subscriptionStatus', subscription_status, 'createdAt', subscription_start_date
                ) ORDER BY subscription_start_date DESC NULLS LAST), '[]'::json)
                FROM (
                    SELECT email, first_name, last_name, subscription_type, subscription_status, subscription_start_date
                    FROM "user"
                    WHERE role = 'premium' AND subscription_id IS NOT NULL
                    ORDER BY subscription_start_date DESC NULLS LAST
                    LIMIT 10
                ) rs
            ),
            'monthlyTrend', (
                SELECT COALESCE(json_agg(json_build_object(
                    'month', m, 'monthName', mn,
                    'paid', paid, 'assigned', assigned, 'total', paid + assigned
                ) ORDER BY m), '[]'::json)
                FROM (
                    SELECT TO_CHAR(subscription_start_date, 'YYYY-MM') as m,
                           TO_CHAR(subscription_start_date, 'Mon YYYY') as mn,
                           COUNT(*) FILTER (WHERE subscription_id IS NOT NULL) as paid,
                           COUNT(*) FILTER (WHERE subscription_id IS NULL) as assigned
                    FROM "user"
                    WHERE role = 'premium' AND subscription_start_date IS NOT NULL
                    GROUP BY m, mn
                    ORDER BY m DESC LIMIT 12
                ) mt
            )
        )
    ) INTO result;

    -- Calculate growth percentages
    DECLARE
        month_rev DECIMAL;
        last_month_rev DECIMAL;
        growth_pct DECIMAL;
    BEGIN
        month_rev := (result->'revenue'->>'month')::DECIMAL;
        last_month_rev := (result->'revenue'->>'lastMonth')::DECIMAL;

        IF last_month_rev > 0 THEN
            growth_pct := ROUND((month_rev - last_month_rev) / last_month_rev * 100, 1);
            result := jsonb_set(result::jsonb, '{revenue,growth}', to_jsonb(growth_pct))::json;
        ELSE
            result := jsonb_set(result::jsonb, '{revenue,growth}', 'null'::jsonb)::json;
        END IF;
    END;

    RETURN result;
END;
$$;


--
-- Name: get_content_analytics_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_content_analytics_data() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_event_details(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_details(p_event_id text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'event', (SELECT row_to_json(e) FROM events e WHERE id = p_event_id),
        'results', (
            SELECT COALESCE(json_agg(row_to_json(r) ORDER BY standing), '[]'::json)
            FROM results r WHERE event_id = p_event_id
        ),
        'matches', (
            SELECT COALESCE(json_agg(row_to_json(m) ORDER BY round, "table"), '[]'::json)
            FROM matches m WHERE event_id = p_event_id
        ),
        'decklists', (
            SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
            FROM decklists d WHERE event_id = p_event_id
        ),
        'staff', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', s.id, 'role', s.role, 'userId', s.user_id,
                'user', (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email)
                         FROM "user" u WHERE u.id = s.user_id)
            )), '[]'::json)
            FROM staff_assignments s WHERE s.event_id = p_event_id
        ),
        'tickets', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', t.id, 'status', t.status, 'amountPaid', t.amount_paid,
                'createdAt', t.created_at, 'refunded', t.refunded,
                'user', (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email)
                         FROM "user" u WHERE u.id = t.user_id)
            )), '[]'::json)
            FROM ticket t WHERE t.event_id = p_event_id
        ),
        'stats', json_build_object(
            'ticketCount', (SELECT COUNT(*) FROM ticket WHERE event_id = p_event_id AND refunded IS NOT TRUE),
            'ticketRevenue', COALESCE((SELECT SUM(CAST(amount_paid AS DECIMAL)) FROM ticket WHERE event_id = p_event_id AND refunded IS NOT TRUE), 0),
            'resultCount', (SELECT COUNT(*) FROM results WHERE event_id = p_event_id),
            'matchCount', (SELECT COUNT(*) FROM matches WHERE event_id = p_event_id),
            'decklistCount', (SELECT COUNT(*) FROM decklists WHERE event_id = p_event_id)
        )
    ) INTO result;

    RETURN result;
END;
$$;


--
-- Name: get_import_matches_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_import_matches_data() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN json_build_object(
        'standings', (
            SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
            FROM standings s
        ),
        'matchCounts', (
            SELECT COALESCE(json_agg(json_build_object(
                'year', year, 'circuit', circuit, 'month', month, 'count', cnt
            )), '[]'::json)
            FROM (
                SELECT year, circuit, month, COUNT(*) as cnt
                FROM matches
                GROUP BY year, circuit, month
            ) m
        )
    );
END;
$$;


--
-- Name: import_event_matches(text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.import_event_matches(p_year text, p_circuit text, p_month text, p_matches jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_match JSONB;
    v_count INT := 0;
BEGIN
    -- Delete existing matches for this event
    DELETE FROM matches
    WHERE year = p_year AND circuit = p_circuit AND month = p_month;

    -- Insert new matches
    FOR v_match IN SELECT * FROM jsonb_array_elements(p_matches)
    LOOP
        INSERT INTO matches (
            id, month, year, circuit, round, "table",
            player1_gem_id, player1_name, player2_gem_id, player2_name, winner
        ) VALUES (
            gen_random_uuid(),
            p_month, p_year, p_circuit,
            (v_match->>'round')::INT,
            v_match->>'table',
            v_match->>'player1GemId',
            v_match->>'player1Name',
            v_match->>'player2GemId',
            v_match->>'player2Name',
            v_match->>'winner'
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'imported', v_count);
END;
$$;


--
-- Name: process_event_results(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_event_results(p_event_id text, p_results jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_event RECORD;
    v_old_result RECORD;
    v_new_result JSONB;
    v_affected_players JSONB := '[]'::jsonb;
    v_player RECORD;
    v_season TEXT;
    v_result_count INT := 0;
    v_sync_result JSON;
BEGIN
    -- Get event data
    SELECT * INTO v_event FROM events WHERE id = p_event_id;
    IF v_event IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Event not found');
    END IF;

    IF v_event.circuit IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Event has no circuit assigned');
    END IF;

    v_season := EXTRACT(YEAR FROM COALESCE(v_event.event_date, NOW()))::TEXT;

    -- Collect affected players from OLD results (before deletion)
    FOR v_old_result IN SELECT gem_id, player_name FROM results WHERE event_id = p_event_id
    LOOP
        v_affected_players := v_affected_players || jsonb_build_object(
            'gemId', v_old_result.gem_id,
            'playerName', v_old_result.player_name
        );
    END LOOP;

    -- Delete old results
    DELETE FROM results WHERE event_id = p_event_id;

    -- Insert new results and collect new affected players
    FOR v_new_result IN SELECT * FROM jsonb_array_elements(p_results)
    LOOP
        INSERT INTO results (
            id, event_id, player_name, gem_id, placement,
            wins, losses, draws, age_points, prize_amount
        ) VALUES (
            gen_random_uuid(),
            p_event_id,
            v_new_result->>'playerName',
            NULLIF(v_new_result->>'gemId', ''),
            (v_new_result->>'placement')::INT,
            COALESCE((v_new_result->>'wins')::INT, 0),
            COALESCE((v_new_result->>'losses')::INT, 0),
            COALESCE((v_new_result->>'draws')::INT, 0),
            COALESCE((v_new_result->>'agePoints')::INT, 0),
            NULLIF(v_new_result->>'prizeAmount', '')::NUMERIC
        );

        v_affected_players := v_affected_players || jsonb_build_object(
            'gemId', v_new_result->>'gemId',
            'playerName', v_new_result->>'playerName'
        );

        v_result_count := v_result_count + 1;
    END LOOP;

    -- Deduplicate and sync standings for each affected player
    FOR v_player IN
        SELECT DISTINCT ON (COALESCE(p->>'gemId', p->>'playerName'))
            p->>'gemId' as gem_id,
            p->>'playerName' as player_name
        FROM jsonb_array_elements(v_affected_players) p
    LOOP
        v_sync_result := sync_player_standings(
            v_season,
            v_event.circuit,
            NULLIF(v_player.gem_id, ''),
            v_player.player_name
        );
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'resultsProcessed', v_result_count,
        'playersUpdated', jsonb_array_length(v_affected_players)
    );
END;
$$;


--
-- Name: reopen_event(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reopen_event(p_event_id text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_event RECORD;
BEGIN
    -- Get event data
    SELECT * INTO v_event FROM events WHERE id = p_event_id;

    IF v_event IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Event not found');
    END IF;

    -- Just update event status back to in_progress
    UPDATE events SET
        status = 'in_progress',
        closed_at = NULL,
        closed_by = NULL
    WHERE id = p_event_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Event reopened. You can now update results.'
    );
END;
$$;


--
-- Name: sync_player_standings(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_player_standings(p_season text, p_circuit text, p_gem_id text DEFAULT NULL::text, p_player_name text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
    v_totals RECORD;
    v_monthly RECORD;
    v_standing_id UUID;
    v_month_names TEXT[] := ARRAY['january', 'february', 'march', 'april', 'may', 'june',
                                   'july', 'august', 'september', 'october', 'november', 'december'];
    v_month TEXT;
    v_update_sql TEXT;
BEGIN
    -- Aggregate all results for this player in this season/circuit
    SELECT
        COALESCE(SUM(er.age_points), 0) as total_points,
        COALESCE(SUM(er.wins), 0) as matches_won,
        COALESCE(SUM(er.wins + er.losses + COALESCE(er.draws, 0)), 0) as matches_played,
        MAX(er.gem_id) as gem_id,
        MAX(er.player_name) as player_name
    INTO v_totals
    FROM results er
    JOIN events e ON er.event_id = e.id
    WHERE e.circuit = p_circuit
      AND EXTRACT(YEAR FROM e.event_date)::TEXT = p_season
      AND (
          (p_gem_id IS NOT NULL AND er.gem_id = p_gem_id)
          OR (p_gem_id IS NULL AND er.player_name = p_player_name)
      );

    -- If no results found, delete standing if it exists and return
    IF v_totals.total_points = 0 AND v_totals.matches_played = 0 THEN
        DELETE FROM standings
        WHERE season = p_season
          AND circuit = p_circuit
          AND (
              (p_gem_id IS NOT NULL AND gem_id = p_gem_id)
              OR (p_gem_id IS NULL AND player_name = p_player_name)
          );
        RETURN json_build_object('success', true, 'action', 'deleted', 'reason', 'no results');
    END IF;

    -- Find existing standing
    SELECT id INTO v_standing_id
    FROM standings
    WHERE season = p_season
      AND circuit = p_circuit
      AND (
          (p_gem_id IS NOT NULL AND gem_id = p_gem_id)
          OR (p_gem_id IS NULL AND player_name = p_player_name)
      )
    LIMIT 1;

    -- Build base update/insert with totals
    IF v_standing_id IS NOT NULL THEN
        -- Update existing standing - reset all monthly columns first
        UPDATE standings SET
            total_points = v_totals.total_points,
            matches_won = v_totals.matches_won,
            matches_played = v_totals.matches_played,
            win_percentage = CASE WHEN v_totals.matches_played > 0
                THEN ROUND((v_totals.matches_won::DECIMAL / v_totals.matches_played) * 100, 2)
                ELSE NULL END,
            gem_id = COALESCE(v_totals.gem_id, gem_id),
            player_name = COALESCE(v_totals.player_name, player_name),
            -- Reset all monthly columns to 0
            january_points = 0, january_matches_won = 0, january_matches = 0,
            february_points = 0, february_matches_won = 0, february_matches = 0,
            march_points = 0, march_matches_won = 0, march_matches = 0,
            april_points = 0, april_matches_won = 0, april_matches = 0,
            may_points = 0, may_matches_won = 0, may_matches = 0,
            june_points = 0, june_matches_won = 0, june_matches = 0,
            july_points = 0, july_matches_won = 0, july_matches = 0,
            august_points = 0, august_matches_won = 0, august_matches = 0,
            september_points = 0, september_matches_won = 0, september_matches = 0,
            october_points = 0, october_matches_won = 0, october_matches = 0,
            november_points = 0, november_matches_won = 0, november_matches = 0,
            december_points = 0, december_matches_won = 0, december_matches = 0,
            updated_at = NOW()
        WHERE id = v_standing_id;
    ELSE
        -- Insert new standing
        INSERT INTO standings (
            id, season, circuit, gem_id, player_name,
            total_points, matches_won, matches_played, win_percentage,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), p_season, p_circuit,
            COALESCE(p_gem_id, v_totals.gem_id),
            COALESCE(p_player_name, v_totals.player_name),
            v_totals.total_points, v_totals.matches_won, v_totals.matches_played,
            CASE WHEN v_totals.matches_played > 0
                THEN ROUND((v_totals.matches_won::DECIMAL / v_totals.matches_played) * 100, 2)
                ELSE NULL END,
            NOW(), NOW()
        )
        RETURNING id INTO v_standing_id;
    END IF;

    -- Now aggregate and update monthly columns
    FOR v_monthly IN
        SELECT
            v_month_names[EXTRACT(MONTH FROM e.event_date)::INT] as month_name,
            COALESCE(SUM(er.age_points), 0) as points,
            COALESCE(SUM(er.wins), 0) as wins,
            COALESCE(SUM(er.wins + er.losses + COALESCE(er.draws, 0)), 0) as matches
        FROM results er
        JOIN events e ON er.event_id = e.id
        WHERE e.circuit = p_circuit
          AND EXTRACT(YEAR FROM e.event_date)::TEXT = p_season
          AND (
              (p_gem_id IS NOT NULL AND er.gem_id = p_gem_id)
              OR (p_gem_id IS NULL AND er.player_name = p_player_name)
          )
        GROUP BY EXTRACT(MONTH FROM e.event_date)
    LOOP
        EXECUTE format(
            'UPDATE standings SET %I = $1, %I = $2, %I = $3 WHERE id = $4',
            v_monthly.month_name || '_points',
            v_monthly.month_name || '_matches_won',
            v_monthly.month_name || '_matches'
        ) USING v_monthly.points, v_monthly.wins, v_monthly.matches, v_standing_id;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'action', CASE WHEN v_standing_id IS NOT NULL THEN 'updated' ELSE 'created' END,
        'totalPoints', v_totals.total_points,
        'matchesPlayed', v_totals.matches_played
    );
END;
$_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_view_id uuid,
    user_id text,
    session_id text,
    event_type text NOT NULL,
    event_data jsonb,
    path text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: article_engagement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_engagement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_view_id uuid,
    user_id text,
    session_id text,
    article_slug text NOT NULL,
    time_on_page_seconds integer,
    max_scroll_depth integer,
    read_completed boolean DEFAULT false,
    content_engaged boolean DEFAULT false,
    exited_to text,
    share_clicked text,
    premium_cta_viewed boolean DEFAULT false,
    premium_cta_clicked boolean DEFAULT false,
    decklist_interactions integer DEFAULT 0,
    card_hovers integer DEFAULT 0,
    user_role_at_read text,
    signed_up_after boolean DEFAULT false,
    upgraded_after boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: billing_notice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_notice (
    id bigint NOT NULL,
    kind text NOT NULL,
    ref text NOT NULL,
    user_id text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_notice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_notice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_notice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_notice_id_seq OWNED BY public.billing_notice.id;


--
-- Name: billing_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_run (
    id bigint NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    mode text NOT NULL,
    summary jsonb,
    error text
);


--
-- Name: billing_run_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_run_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_run_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_run_id_seq OWNED BY public.billing_run.id;


--
-- Name: ca_conversion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_conversion (
    id bigint NOT NULL,
    visitor_id uuid,
    user_id text,
    kind text NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    session_id uuid,
    path text,
    meta jsonb
);


--
-- Name: ca_conversion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ca_conversion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ca_conversion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ca_conversion_id_seq OWNED BY public.ca_conversion.id;


--
-- Name: ca_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_event (
    id bigint NOT NULL,
    view_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    type text NOT NULL,
    label text,
    depth smallint,
    at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ca_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ca_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ca_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ca_event_id_seq OWNED BY public.ca_event.id;


--
-- Name: ca_pageview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_pageview (
    id uuid NOT NULL,
    visitor_id uuid NOT NULL,
    session_id uuid NOT NULL,
    user_id text,
    audience text NOT NULL,
    path text NOT NULL,
    route text,
    entry_id uuid,
    view_id uuid,
    source text,
    referrer_domain text,
    from_path text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device text,
    browser text,
    os text,
    country text,
    viewport_w integer,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    visible_seconds integer DEFAULT 0 NOT NULL
);


--
-- Name: ca_view; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_view (
    id uuid NOT NULL,
    entry_id uuid NOT NULL,
    visitor_id uuid NOT NULL,
    session_id uuid NOT NULL,
    user_id text,
    audience text NOT NULL,
    gated boolean DEFAULT false NOT NULL,
    kind text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    qualified boolean DEFAULT false NOT NULL,
    source text DEFAULT 'direct'::text NOT NULL,
    referrer_domain text,
    from_path text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device text,
    browser text,
    os text,
    country text,
    viewport_w integer,
    visible_seconds integer DEFAULT 0 NOT NULL,
    engaged_seconds integer DEFAULT 0 NOT NULL,
    max_depth smallint DEFAULT 0 NOT NULL,
    depth_seconds jsonb DEFAULT '[]'::jsonb NOT NULL,
    sections jsonb DEFAULT '{}'::jsonb NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    video_seconds integer DEFAULT 0 NOT NULL,
    video_duration integer,
    video_max_pct smallint DEFAULT 0 NOT NULL,
    video_bins jsonb DEFAULT '[]'::jsonb NOT NULL,
    video_plays integer DEFAULT 0 NOT NULL,
    video_seeks integer DEFAULT 0 NOT NULL,
    video_completed boolean DEFAULT false NOT NULL,
    exit_type text,
    exit_target text
);


--
-- Name: checkout; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkout (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    event_id text NOT NULL,
    idempotency_key text NOT NULL,
    invoice_number text,
    status text NOT NULL,
    quantity smallint NOT NULL,
    list_cents integer NOT NULL,
    discount_cents integer DEFAULT 0 NOT NULL,
    amount_cents integer NOT NULL,
    payload jsonb NOT NULL,
    trans_id text,
    order_id uuid,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cms_author_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_author_profile (
    user_id text NOT NULL,
    display_name text,
    title text,
    bio text,
    avatar_media_id uuid,
    links jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cms_course; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_course (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text,
    cover_image_id uuid,
    thumbnail_image_id uuid,
    trailer_video_provider text,
    trailer_mux_upload_id text,
    trailer_mux_asset_id text,
    trailer_mux_playback_id text,
    trailer_video_status text,
    trailer_video_duration integer,
    trailer_video_aspect_ratio text,
    trailer_youtube_url text,
    trailer_youtube_video_id text,
    trailer_youtube_title text,
    trailer_youtube_thumbnail_url text,
    trailer_youtube_duration integer,
    price numeric(10,2) DEFAULT 0.00 NOT NULL,
    premium_discount_pct integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    author_id text,
    draft_title text,
    draft_description text,
    draft_cover_image_id uuid,
    draft_thumbnail_image_id uuid,
    draft_updated_at timestamp with time zone,
    draft_updated_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_entry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    cover_image_id uuid,
    thumbnail_image_id uuid,
    body jsonb,
    read_time integer,
    video_provider text,
    mux_upload_id text,
    mux_asset_id text,
    mux_playback_id text,
    video_status text,
    video_duration integer,
    video_aspect_ratio text,
    youtube_url text,
    youtube_video_id text,
    youtube_title text,
    youtube_thumbnail_url text,
    youtube_duration integer,
    access_mode text DEFAULT 'free'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    scheduled_for timestamp with time zone,
    author_id text,
    draft_title text,
    draft_excerpt text,
    draft_body jsonb,
    draft_cover_image_id uuid,
    draft_thumbnail_image_id uuid,
    draft_read_time integer,
    draft_updated_at timestamp with time zone,
    draft_updated_by text,
    source text DEFAULT 'custom'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_entry_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_entry_tag (
    entry_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: cms_lesson; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_lesson (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    course_id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    is_preview boolean DEFAULT false NOT NULL,
    body jsonb,
    read_time integer,
    video_provider text,
    mux_upload_id text,
    mux_asset_id text,
    mux_playback_id text,
    video_status text,
    video_duration integer,
    video_aspect_ratio text,
    youtube_url text,
    youtube_video_id text,
    youtube_title text,
    youtube_thumbnail_url text,
    youtube_duration integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    lesson_id uuid NOT NULL,
    completed_at timestamp with time zone,
    last_position_seconds integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_by text,
    storage_path text NOT NULL,
    url text NOT NULL,
    mime_type text,
    width integer,
    height integer,
    alt text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_module; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_module (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_revision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_revision (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    body jsonb NOT NULL,
    saved_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_tag (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: decklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.decklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    user_id text,
    gem_id text,
    player_name text NOT NULL,
    hero text,
    format text,
    placement integer,
    cards jsonb NOT NULL,
    raw_text text,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: entitlement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entitlement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    product text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_player_heroes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_player_heroes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season text NOT NULL,
    circuit text NOT NULL,
    month text NOT NULL,
    gem_id text,
    player_name text NOT NULL,
    hero text NOT NULL,
    country_region text,
    created_at timestamp with time zone DEFAULT now(),
    event_id text
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id text NOT NULL,
    title text NOT NULL,
    location text,
    address text,
    price numeric(10,2) NOT NULL,
    format text,
    gem_id_required boolean DEFAULT false,
    circuit text,
    month text,
    event_date timestamp with time zone,
    description text,
    premium_discount boolean DEFAULT false,
    status text DEFAULT 'upcoming'::text,
    closed_at timestamp with time zone,
    closed_by text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    tournament_results jsonb,
    player_cap integer
);


--
-- Name: fab_card_lookup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fab_card_lookup (
    lookup_key text NOT NULL,
    name text NOT NULL,
    image_url text,
    fallback_url text,
    pitch integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: fab_card_upload_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fab_card_upload_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_by text,
    filename text,
    total_cards integer NOT NULL,
    lookup_entries integer NOT NULL,
    sets_included jsonb,
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoice_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: legacy_arb; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legacy_arb (
    arb_id text NOT NULL,
    arb_status text,
    name text,
    amount_cents integer,
    interval_length smallint,
    interval_unit text,
    start_date date,
    total_occurrences integer,
    customer_profile_id text,
    payment_profile_id text,
    card_last_four text,
    card_type text,
    card_expiration text,
    profile_email text,
    pay_count integer,
    last_approved_at timestamp with time zone,
    last_approved_trans_id text,
    last_declined_at timestamp with time zone,
    next_billing_date timestamp with time zone,
    user_id text,
    match_method text,
    classification text,
    flags text[] DEFAULT '{}'::text[] NOT NULL,
    decision text,
    decided_by text,
    decided_at timestamp with time zone,
    user_before jsonb,
    charges_after_cancel jsonb,
    raw jsonb,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription_id uuid,
    migrated_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    error text
);


--
-- Name: lss_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lss_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    event_type text,
    format text,
    link text,
    is_active boolean DEFAULT true,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text,
    month text,
    year text,
    circuit text,
    round integer NOT NULL,
    "table" integer,
    player1_gem_id text,
    player1_name text NOT NULL,
    player2_gem_id text,
    player2_name text NOT NULL,
    winner text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: member_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_event (
    id bigint NOT NULL,
    user_id text,
    kind text NOT NULL,
    subscription_id text,
    subscription_type text,
    reason text,
    actor_id text,
    at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb
);


--
-- Name: member_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: member_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_event_id_seq OWNED BY public.member_event.id;


--
-- Name: member_referral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_referral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_user_id text NOT NULL,
    referred_user_id text NOT NULL,
    code text NOT NULL,
    subscription_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    reward_earned_at timestamp with time zone,
    reward_applied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    subscription_id uuid,
    qualifying_trans_id text,
    reward_subscription_id uuid,
    reward_note text
);


--
-- Name: member_referral_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_referral_code (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    code text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: newsletter_subscriber; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscriber (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    resend_contact_id text,
    status text DEFAULT 'active'::text NOT NULL,
    source text DEFAULT 'website'::text,
    subscribed_at timestamp with time zone DEFAULT now(),
    unsubscribed_at timestamp with time zone
);


--
-- Name: order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."order" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    provider_ref text NOT NULL,
    user_email text,
    amount text,
    currency text,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now(),
    refunded_at timestamp with time zone,
    user_id text,
    kind text,
    refunded_amount numeric(10,2) DEFAULT 0 NOT NULL,
    checkout_id uuid
);


--
-- Name: page_view; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_view (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    session_id text,
    path text NOT NULL,
    referrer text,
    referrer_domain text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device_type text,
    browser text,
    country text,
    is_new_visitor boolean DEFAULT false,
    article_slug text,
    article_title text,
    article_author text,
    article_tags text,
    article_access_mode text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: partner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    code text NOT NULL,
    is_active boolean DEFAULT true,
    payout_notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by text,
    display_name text
);


--
-- Name: partner_referral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_referral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    referred_user_id text NOT NULL,
    code text NOT NULL,
    subscription_type text NOT NULL,
    discount_amount numeric(10,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    first_charge_order_id uuid,
    payout_status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    paid_notes text,
    created_at timestamp with time zone DEFAULT now(),
    subscription_id uuid,
    voided_at timestamp with time zone,
    void_reason text
);


--
-- Name: password_reset_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_token (
    id text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment (
    id bigint NOT NULL,
    provider text DEFAULT 'authnet'::text NOT NULL,
    trans_id text NOT NULL,
    kind text NOT NULL,
    user_id text,
    user_email text,
    subscription_id text,
    subscription_type text,
    pay_num integer,
    order_id uuid,
    ticket_id uuid,
    event_id text,
    amount numeric(10,2) NOT NULL,
    list_amount numeric(10,2),
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    discount_kind text,
    promo_code text,
    occurred_at timestamp with time zone NOT NULL,
    refunded_amount numeric(10,2) DEFAULT 0 NOT NULL,
    refunded_at timestamp with time zone,
    source text NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_id_seq OWNED BY public.payment.id;


--
-- Name: podcast_episodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.podcast_episodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    podcast_id uuid NOT NULL,
    youtube_url text NOT NULL,
    youtube_video_id text,
    title text NOT NULL,
    thumbnail_url text,
    published_at timestamp with time zone,
    description text,
    guest text,
    season integer,
    episode integer,
    duration text,
    is_published boolean DEFAULT true,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: podcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.podcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    cover_image text,
    youtube_playlist_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: refund; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trans_id text NOT NULL,
    amount_cents integer NOT NULL,
    method text,
    status text NOT NULL,
    refund_trans_id text,
    invoice_number text,
    reason text,
    requested_by text,
    order_id uuid,
    ticket_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    subscription_invoice_id uuid,
    subscription_effect text,
    refund_request_id uuid,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: refund_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id text NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    decided_by text,
    decided_at timestamp with time zone,
    decision_note text,
    refund_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: saved_card; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_card (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    customer_profile_id text NOT NULL,
    payment_profile_id text NOT NULL,
    card_type text NOT NULL,
    last_four text NOT NULL,
    expiration_month text NOT NULL,
    expiration_year text NOT NULL,
    is_default boolean DEFAULT false,
    nickname text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text NOT NULL,
    exp_month smallint,
    exp_year smallint,
    deleted_at timestamp with time zone,
    verified_at timestamp with time zone,
    source text,
    environment text
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: staff_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    event_id text NOT NULL,
    assigned_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: standings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season text NOT NULL,
    circuit text NOT NULL,
    gem_id text,
    player_name text NOT NULL,
    total_points integer DEFAULT 0,
    win_percentage numeric(5,2),
    matches_played integer DEFAULT 0,
    matches_won integer DEFAULT 0,
    qualified_for_championship boolean DEFAULT false,
    january_points integer DEFAULT 0,
    february_points integer DEFAULT 0,
    march_points integer DEFAULT 0,
    april_points integer DEFAULT 0,
    may_points integer DEFAULT 0,
    june_points integer DEFAULT 0,
    july_points integer DEFAULT 0,
    august_points integer DEFAULT 0,
    september_points integer DEFAULT 0,
    october_points integer DEFAULT 0,
    november_points integer DEFAULT 0,
    december_points integer DEFAULT 0,
    january_matches_won integer DEFAULT 0,
    february_matches_won integer DEFAULT 0,
    march_matches_won integer DEFAULT 0,
    april_matches_won integer DEFAULT 0,
    may_matches_won integer DEFAULT 0,
    june_matches_won integer DEFAULT 0,
    july_matches_won integer DEFAULT 0,
    august_matches_won integer DEFAULT 0,
    september_matches_won integer DEFAULT 0,
    october_matches_won integer DEFAULT 0,
    november_matches_won integer DEFAULT 0,
    december_matches_won integer DEFAULT 0,
    january_matches integer DEFAULT 0,
    february_matches integer DEFAULT 0,
    march_matches integer DEFAULT 0,
    april_matches integer DEFAULT 0,
    may_matches integer DEFAULT 0,
    june_matches integer DEFAULT 0,
    july_matches integer DEFAULT 0,
    august_matches integer DEFAULT 0,
    september_matches integer DEFAULT 0,
    october_matches integer DEFAULT 0,
    november_matches integer DEFAULT 0,
    december_matches integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ref text NOT NULL,
    user_id text NOT NULL,
    plan text NOT NULL,
    price_cents integer NOT NULL,
    anchor_day smallint NOT NULL,
    status text NOT NULL,
    started_at timestamp with time zone,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    next_charge_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    ended_at timestamp with time zone,
    end_reason text,
    customer_profile_id text,
    payment_profile_id text,
    saved_card_id uuid,
    failed_attempts smallint DEFAULT 0 NOT NULL,
    first_failed_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    grace_until timestamp with time zone,
    pending_plan text,
    pending_price_cents integer,
    promo_code text,
    promo_kind text,
    partner_referral_id uuid,
    member_referral_id uuid,
    network_trans_id text,
    legacy_arb_id text,
    legacy_arb_cancelled_at timestamp with time zone,
    migrated_at timestamp with time zone,
    hold boolean DEFAULT false NOT NULL,
    lease_until timestamp with time zone,
    lease_token text,
    flags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_invoice (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    seq integer NOT NULL,
    kind text NOT NULL,
    plan text,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    list_cents integer NOT NULL,
    discount_cents integer DEFAULT 0 NOT NULL,
    amount_cents integer NOT NULL,
    status text NOT NULL,
    invoice_number text,
    attempts smallint DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    last_error text,
    trans_id text,
    network_trans_id text,
    paid_at timestamp with time zone,
    order_id uuid,
    refunded_cents integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    event_id text NOT NULL,
    order_id uuid,
    code text NOT NULL,
    quantity integer DEFAULT 1,
    first_name text,
    last_name text,
    gem_id text,
    amount_paid numeric(10,2),
    transaction_id text,
    refunded boolean DEFAULT false,
    refunded_at timestamp with time zone,
    entered_into_gem boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    voided_at timestamp with time zone,
    checkout_id uuid
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    email text NOT NULL,
    hashed_password text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    gem_id text,
    role text DEFAULT 'free'::text NOT NULL,
    customer_profile_id text,
    subscription_id text,
    subscription_type text,
    subscription_status text,
    subscription_start_date timestamp with time zone,
    subscription_end_date timestamp with time zone,
    next_billing_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    used_partner_code text,
    additional_roles text[] DEFAULT ARRAY[]::text[] NOT NULL,
    comp_reason text,
    comped_at timestamp with time zone,
    comped_by text,
    last_subscription_id text
);


--
-- Name: vods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mux_asset_id text,
    mux_playback_id text,
    mux_upload_id text,
    title text NOT NULL,
    description text,
    thumbnail text,
    duration real,
    aspect_ratio text,
    event_id text,
    is_premium boolean DEFAULT true,
    status text DEFAULT 'waiting'::text,
    is_published boolean DEFAULT false,
    published_at timestamp with time zone,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    player1_name text,
    player1_hero text,
    player2_name text,
    player2_hero text
);


--
-- Name: webhook_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_event (
    id text NOT NULL,
    provider text NOT NULL,
    received_at timestamp with time zone DEFAULT now()
);


--
-- Name: billing_notice id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_notice ALTER COLUMN id SET DEFAULT nextval('public.billing_notice_id_seq'::regclass);


--
-- Name: billing_run id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_run ALTER COLUMN id SET DEFAULT nextval('public.billing_run_id_seq'::regclass);


--
-- Name: ca_conversion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_conversion ALTER COLUMN id SET DEFAULT nextval('public.ca_conversion_id_seq'::regclass);


--
-- Name: ca_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event ALTER COLUMN id SET DEFAULT nextval('public.ca_event_id_seq'::regclass);


--
-- Name: member_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_event ALTER COLUMN id SET DEFAULT nextval('public.member_event_id_seq'::regclass);


--
-- Name: payment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment ALTER COLUMN id SET DEFAULT nextval('public.payment_id_seq'::regclass);


--
-- Name: analytics_event analytics_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_event
    ADD CONSTRAINT analytics_event_pkey PRIMARY KEY (id);


--
-- Name: article_engagement article_engagement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_engagement
    ADD CONSTRAINT article_engagement_pkey PRIMARY KEY (id);


--
-- Name: billing_notice billing_notice_kind_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_notice
    ADD CONSTRAINT billing_notice_kind_ref_key UNIQUE (kind, ref);


--
-- Name: billing_notice billing_notice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_notice
    ADD CONSTRAINT billing_notice_pkey PRIMARY KEY (id);


--
-- Name: billing_run billing_run_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_run
    ADD CONSTRAINT billing_run_pkey PRIMARY KEY (id);


--
-- Name: ca_conversion ca_conversion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_conversion
    ADD CONSTRAINT ca_conversion_pkey PRIMARY KEY (id);


--
-- Name: ca_event ca_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event
    ADD CONSTRAINT ca_event_pkey PRIMARY KEY (id);


--
-- Name: ca_pageview ca_pageview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_pageview
    ADD CONSTRAINT ca_pageview_pkey PRIMARY KEY (id);


--
-- Name: ca_view ca_view_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_view
    ADD CONSTRAINT ca_view_pkey PRIMARY KEY (id);


--
-- Name: checkout checkout_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: checkout checkout_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_invoice_number_key UNIQUE (invoice_number);


--
-- Name: checkout checkout_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_pkey PRIMARY KEY (id);


--
-- Name: checkout checkout_trans_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_trans_id_key UNIQUE (trans_id);


--
-- Name: cms_author_profile cms_author_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_author_profile
    ADD CONSTRAINT cms_author_profile_pkey PRIMARY KEY (user_id);


--
-- Name: cms_course cms_course_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_pkey PRIMARY KEY (id);


--
-- Name: cms_course cms_course_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_slug_key UNIQUE (slug);


--
-- Name: cms_entry cms_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_pkey PRIMARY KEY (id);


--
-- Name: cms_entry cms_entry_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_slug_key UNIQUE (slug);


--
-- Name: cms_entry_tag cms_entry_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry_tag
    ADD CONSTRAINT cms_entry_tag_pkey PRIMARY KEY (entry_id, tag_id);


--
-- Name: cms_lesson cms_lesson_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson
    ADD CONSTRAINT cms_lesson_pkey PRIMARY KEY (id);


--
-- Name: cms_lesson_progress cms_lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson_progress
    ADD CONSTRAINT cms_lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: cms_media cms_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_media
    ADD CONSTRAINT cms_media_pkey PRIMARY KEY (id);


--
-- Name: cms_module cms_module_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_module
    ADD CONSTRAINT cms_module_pkey PRIMARY KEY (id);


--
-- Name: cms_revision cms_revision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_revision
    ADD CONSTRAINT cms_revision_pkey PRIMARY KEY (id);


--
-- Name: cms_tag cms_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_tag
    ADD CONSTRAINT cms_tag_pkey PRIMARY KEY (id);


--
-- Name: cms_tag cms_tag_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_tag
    ADD CONSTRAINT cms_tag_slug_key UNIQUE (slug);


--
-- Name: decklists decklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decklists
    ADD CONSTRAINT decklists_pkey PRIMARY KEY (id);


--
-- Name: entitlement entitlement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlement
    ADD CONSTRAINT entitlement_pkey PRIMARY KEY (id);


--
-- Name: event_player_heroes event_player_heroes_event_id_gem_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_player_heroes
    ADD CONSTRAINT event_player_heroes_event_id_gem_id_unique UNIQUE (event_id, gem_id);


--
-- Name: event_player_heroes event_player_heroes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_player_heroes
    ADD CONSTRAINT event_player_heroes_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: fab_card_lookup fab_card_lookup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fab_card_lookup
    ADD CONSTRAINT fab_card_lookup_pkey PRIMARY KEY (lookup_key);


--
-- Name: fab_card_upload_history fab_card_upload_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fab_card_upload_history
    ADD CONSTRAINT fab_card_upload_history_pkey PRIMARY KEY (id);


--
-- Name: legacy_arb legacy_arb_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_arb
    ADD CONSTRAINT legacy_arb_pkey PRIMARY KEY (arb_id);


--
-- Name: lss_events lss_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lss_events
    ADD CONSTRAINT lss_events_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: member_event member_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_event
    ADD CONSTRAINT member_event_pkey PRIMARY KEY (id);


--
-- Name: member_referral_code member_referral_code_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral_code
    ADD CONSTRAINT member_referral_code_code_key UNIQUE (code);


--
-- Name: member_referral_code member_referral_code_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral_code
    ADD CONSTRAINT member_referral_code_pkey PRIMARY KEY (id);


--
-- Name: member_referral_code member_referral_code_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral_code
    ADD CONSTRAINT member_referral_code_user_id_key UNIQUE (user_id);


--
-- Name: member_referral member_referral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscriber newsletter_subscriber_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscriber
    ADD CONSTRAINT newsletter_subscriber_email_unique UNIQUE (email);


--
-- Name: newsletter_subscriber newsletter_subscriber_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscriber
    ADD CONSTRAINT newsletter_subscriber_pkey PRIMARY KEY (id);


--
-- Name: order order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT order_pkey PRIMARY KEY (id);


--
-- Name: page_view page_view_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_view
    ADD CONSTRAINT page_view_pkey PRIMARY KEY (id);


--
-- Name: partner partner_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_code_key UNIQUE (code);


--
-- Name: partner partner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_pkey PRIMARY KEY (id);


--
-- Name: partner_referral partner_referral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_pkey PRIMARY KEY (id);


--
-- Name: partner partner_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_user_id_key UNIQUE (user_id);


--
-- Name: password_reset_token password_reset_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_pkey PRIMARY KEY (id);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);


--
-- Name: payment payment_trans_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_trans_id_key UNIQUE (trans_id);


--
-- Name: podcast_episodes podcast_episodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.podcast_episodes
    ADD CONSTRAINT podcast_episodes_pkey PRIMARY KEY (id);


--
-- Name: podcasts podcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.podcasts
    ADD CONSTRAINT podcasts_pkey PRIMARY KEY (id);


--
-- Name: refund refund_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_pkey PRIMARY KEY (id);


--
-- Name: refund_request refund_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_pkey PRIMARY KEY (id);


--
-- Name: saved_card saved_card_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_card
    ADD CONSTRAINT saved_card_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: staff_assignments staff_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assignments
    ADD CONSTRAINT staff_assignments_pkey PRIMARY KEY (id);


--
-- Name: standings standings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standings
    ADD CONSTRAINT standings_pkey PRIMARY KEY (id);


--
-- Name: subscription_invoice subscription_invoice_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_invoice_number_key UNIQUE (invoice_number);


--
-- Name: subscription_invoice subscription_invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_pkey PRIMARY KEY (id);


--
-- Name: subscription_invoice subscription_invoice_subscription_id_period_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_subscription_id_period_start_key UNIQUE (subscription_id, period_start);


--
-- Name: subscription_invoice subscription_invoice_trans_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_trans_id_key UNIQUE (trans_id);


--
-- Name: subscription subscription_legacy_arb_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_legacy_arb_id_key UNIQUE (legacy_arb_id);


--
-- Name: subscription subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_pkey PRIMARY KEY (id);


--
-- Name: subscription subscription_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_ref_key UNIQUE (ref);


--
-- Name: ticket ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_pkey PRIMARY KEY (id);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: vods vods_mux_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_mux_asset_id_key UNIQUE (mux_asset_id);


--
-- Name: vods vods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_pkey PRIMARY KEY (id);


--
-- Name: webhook_event webhook_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_event
    ADD CONSTRAINT webhook_event_pkey PRIMARY KEY (id);


--
-- Name: ca_conversion_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_conversion_at_idx ON public.ca_conversion USING btree (at);


--
-- Name: ca_conversion_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_conversion_session_idx ON public.ca_conversion USING btree (session_id);


--
-- Name: ca_conversion_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_conversion_visitor_idx ON public.ca_conversion USING btree (visitor_id);


--
-- Name: ca_event_entry_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_event_entry_at_idx ON public.ca_event USING btree (entry_id, at);


--
-- Name: ca_event_view_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_event_view_idx ON public.ca_event USING btree (view_id);


--
-- Name: ca_pageview_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_pageview_path_idx ON public.ca_pageview USING btree (path, started_at);


--
-- Name: ca_pageview_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_pageview_session_idx ON public.ca_pageview USING btree (session_id, started_at);


--
-- Name: ca_pageview_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_pageview_started_idx ON public.ca_pageview USING btree (started_at);


--
-- Name: ca_pageview_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_pageview_visitor_idx ON public.ca_pageview USING btree (visitor_id, started_at);


--
-- Name: ca_view_entry_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_entry_started_idx ON public.ca_view USING btree (entry_id, started_at);


--
-- Name: ca_view_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_started_idx ON public.ca_view USING btree (started_at);


--
-- Name: ca_view_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_user_idx ON public.ca_view USING btree (user_id, started_at);


--
-- Name: ca_view_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_visitor_idx ON public.ca_view USING btree (visitor_id, started_at);


--
-- Name: checkout_event_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX checkout_event_live_idx ON public.checkout USING btree (event_id, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'charging'::text, 'paid'::text, 'unknown'::text]));


--
-- Name: cms_course_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_course_published_at_idx ON public.cms_course USING btree (published_at);


--
-- Name: cms_course_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_course_status_idx ON public.cms_course USING btree (status);


--
-- Name: cms_entry_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entry_author_idx ON public.cms_entry USING btree (author_id);


--
-- Name: cms_entry_draft_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entry_draft_updated_idx ON public.cms_entry USING btree (draft_updated_at);


--
-- Name: cms_entry_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entry_published_at_idx ON public.cms_entry USING btree (published_at);


--
-- Name: cms_entry_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entry_status_idx ON public.cms_entry USING btree (status);


--
-- Name: cms_lesson_course_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cms_lesson_course_slug_unique ON public.cms_lesson USING btree (course_id, slug);


--
-- Name: cms_lesson_module_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_lesson_module_position_idx ON public.cms_lesson USING btree (module_id, "position");


--
-- Name: cms_lesson_progress_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_lesson_progress_user_idx ON public.cms_lesson_progress USING btree (user_id);


--
-- Name: cms_lesson_progress_user_lesson_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cms_lesson_progress_user_lesson_unique ON public.cms_lesson_progress USING btree (user_id, lesson_id);


--
-- Name: cms_module_course_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_module_course_position_idx ON public.cms_module USING btree (course_id, "position");


--
-- Name: cms_revision_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_revision_entity_idx ON public.cms_revision USING btree (entity_type, entity_id, created_at);


--
-- Name: decklists_event_public_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX decklists_event_public_idx ON public.decklists USING btree (event_id, is_public);


--
-- Name: decklists_public_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX decklists_public_created_idx ON public.decklists USING btree (is_public, created_at DESC);


--
-- Name: event_player_heroes_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_player_heroes_event_id_idx ON public.event_player_heroes USING btree (event_id);


--
-- Name: events_event_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_event_date_idx ON public.events USING btree (event_date);


--
-- Name: events_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_status_idx ON public.events USING btree (status);


--
-- Name: idx_analytics_event_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_event_created_at ON public.analytics_event USING btree (created_at);


--
-- Name: idx_analytics_event_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_event_event_type ON public.analytics_event USING btree (event_type);


--
-- Name: idx_analytics_event_page_view_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_event_page_view_id ON public.analytics_event USING btree (page_view_id);


--
-- Name: idx_analytics_event_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_event_session_id ON public.analytics_event USING btree (session_id);


--
-- Name: idx_article_engagement_article_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_engagement_article_slug ON public.article_engagement USING btree (article_slug);


--
-- Name: idx_article_engagement_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_engagement_created_at ON public.article_engagement USING btree (created_at);


--
-- Name: idx_article_engagement_page_view_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_engagement_page_view_id ON public.article_engagement USING btree (page_view_id);


--
-- Name: idx_article_engagement_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_engagement_session_id ON public.article_engagement USING btree (session_id);


--
-- Name: idx_article_engagement_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_engagement_user_id ON public.article_engagement USING btree (user_id);


--
-- Name: idx_decklist_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decklist_event ON public.decklists USING btree (event_id);


--
-- Name: idx_decklist_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decklist_public ON public.decklists USING btree (event_id) WHERE (is_public = true);


--
-- Name: idx_event_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_date ON public.events USING btree (event_date);


--
-- Name: idx_lss_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lss_active ON public.lss_events USING btree (start_date) WHERE (is_active = true);


--
-- Name: idx_match_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_lookup ON public.matches USING btree (year, circuit, month);


--
-- Name: idx_match_round; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_round ON public.matches USING btree (round);


--
-- Name: idx_member_referral_code_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_code_code ON public.member_referral_code USING btree (code);


--
-- Name: idx_member_referral_code_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_code_user_id ON public.member_referral_code USING btree (user_id);


--
-- Name: idx_member_referral_referred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_referred ON public.member_referral USING btree (referred_user_id);


--
-- Name: idx_member_referral_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_referrer ON public.member_referral USING btree (referrer_user_id);


--
-- Name: idx_member_referral_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_status ON public.member_referral USING btree (status);


--
-- Name: idx_page_view_article_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_view_article_slug ON public.page_view USING btree (article_slug);


--
-- Name: idx_page_view_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_view_country ON public.page_view USING btree (country);


--
-- Name: idx_page_view_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_view_created_at ON public.page_view USING btree (created_at);


--
-- Name: idx_page_view_device_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_view_device_type ON public.page_view USING btree (device_type);


--
-- Name: idx_page_view_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_view_path ON public.page_view USING btree (path);


--
-- Name: idx_page_view_referrer_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_view_referrer_domain ON public.page_view USING btree (referrer_domain);


--
-- Name: idx_page_view_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_view_session_id ON public.page_view USING btree (session_id);


--
-- Name: idx_page_view_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_view_user_id ON public.page_view USING btree (user_id);


--
-- Name: idx_partner_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_code ON public.partner USING btree (code);


--
-- Name: idx_partner_referral_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_referral_partner_id ON public.partner_referral USING btree (partner_id);


--
-- Name: idx_partner_referral_payout_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_referral_payout_status ON public.partner_referral USING btree (payout_status);


--
-- Name: idx_partner_referral_referred_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_referral_referred_user_id ON public.partner_referral USING btree (referred_user_id);


--
-- Name: idx_partner_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_user_id ON public.partner USING btree (user_id);


--
-- Name: idx_podcast_episodes_podcast_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_podcast_episodes_podcast_id ON public.podcast_episodes USING btree (podcast_id);


--
-- Name: idx_podcast_episodes_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_podcast_episodes_published ON public.podcast_episodes USING btree (is_published, published_at DESC);


--
-- Name: idx_podcasts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_podcasts_active ON public.podcasts USING btree (is_active, sort_order);


--
-- Name: idx_standing_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_standing_lookup ON public.standings USING btree (season, circuit);


--
-- Name: idx_standing_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_standing_points ON public.standings USING btree (total_points DESC);


--
-- Name: idx_vods_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_event_id ON public.vods USING btree (event_id);


--
-- Name: idx_vods_is_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_is_published ON public.vods USING btree (is_published);


--
-- Name: idx_vods_mux_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_mux_asset_id ON public.vods USING btree (mux_asset_id);


--
-- Name: idx_vods_mux_upload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_mux_upload_id ON public.vods USING btree (mux_upload_id);


--
-- Name: idx_vods_player1_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_player1_name ON public.vods USING btree (player1_name);


--
-- Name: idx_vods_player2_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_player2_name ON public.vods USING btree (player2_name);


--
-- Name: idx_vods_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_status ON public.vods USING btree (status);


--
-- Name: matches_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_event_id_idx ON public.matches USING btree (event_id);


--
-- Name: matches_event_round_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_event_round_idx ON public.matches USING btree (event_id, round);


--
-- Name: matches_round_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_round_idx ON public.matches USING btree (round);


--
-- Name: member_event_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_event_at_idx ON public.member_event USING btree (at);


--
-- Name: member_event_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_event_user_idx ON public.member_event USING btree (user_id, at);


--
-- Name: order_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_user_id_idx ON public."order" USING btree (user_id, created_at DESC);


--
-- Name: payment_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_kind_idx ON public.payment USING btree (kind, occurred_at);


--
-- Name: payment_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_occurred_idx ON public.payment USING btree (occurred_at);


--
-- Name: payment_subscription_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_subscription_idx ON public.payment USING btree (subscription_id, pay_num);


--
-- Name: payment_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_user_idx ON public.payment USING btree (user_id, occurred_at);


--
-- Name: refund_in_flight; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refund_in_flight ON public.refund USING btree (trans_id) WHERE (status = ANY (ARRAY['pending'::text, 'waiting_settlement'::text]));


--
-- Name: refund_request_one_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refund_request_one_pending ON public.refund_request USING btree (ticket_id) WHERE (status = 'pending'::text);


--
-- Name: refund_trans_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_trans_idx ON public.refund USING btree (trans_id);


--
-- Name: saved_card_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saved_card_user_id_idx ON public.saved_card USING btree (user_id);


--
-- Name: saved_card_user_profile_live; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX saved_card_user_profile_live ON public.saved_card USING btree (user_id, payment_profile_id) WHERE (status <> ALL (ARRAY['deleted'::text, 'duplicate'::text]));


--
-- Name: standings_season_circuit_identity_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX standings_season_circuit_identity_key ON public.standings USING btree (season, circuit, COALESCE(gem_id, ('__name__'::text || player_name)));


--
-- Name: standings_season_circuit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX standings_season_circuit_idx ON public.standings USING btree (season, circuit);


--
-- Name: standings_season_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX standings_season_idx ON public.standings USING btree (season);


--
-- Name: standings_total_points_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX standings_total_points_idx ON public.standings USING btree (total_points DESC NULLS LAST);


--
-- Name: subscription_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_due_idx ON public.subscription USING btree (next_charge_at) WHERE (status = 'active'::text);


--
-- Name: subscription_invoice_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_invoice_status_idx ON public.subscription_invoice USING btree (status, updated_at) WHERE (status = ANY (ARRAY['charging'::text, 'unknown'::text]));


--
-- Name: subscription_one_live_per_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscription_one_live_per_user ON public.subscription USING btree (user_id) WHERE (status <> 'ended'::text);


--
-- Name: subscription_period_end_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_period_end_idx ON public.subscription USING btree (current_period_end) WHERE (status = ANY (ARRAY['cancelled'::text, 'past_due'::text]));


--
-- Name: subscription_retry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_retry_idx ON public.subscription USING btree (next_attempt_at) WHERE (status = 'past_due'::text);


--
-- Name: ticket_event_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_event_active_idx ON public.ticket USING btree (event_id) WHERE (refunded = false);


--
-- Name: ticket_user_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_user_event_idx ON public.ticket USING btree (user_id, event_id);


--
-- Name: analytics_event analytics_event_page_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_event
    ADD CONSTRAINT analytics_event_page_view_id_fkey FOREIGN KEY (page_view_id) REFERENCES public.page_view(id) ON DELETE SET NULL;


--
-- Name: analytics_event analytics_event_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_event
    ADD CONSTRAINT analytics_event_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: article_engagement article_engagement_page_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_engagement
    ADD CONSTRAINT article_engagement_page_view_id_fkey FOREIGN KEY (page_view_id) REFERENCES public.page_view(id) ON DELETE SET NULL;


--
-- Name: article_engagement article_engagement_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_engagement
    ADD CONSTRAINT article_engagement_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: billing_notice billing_notice_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_notice
    ADD CONSTRAINT billing_notice_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: ca_conversion ca_conversion_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_conversion
    ADD CONSTRAINT ca_conversion_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: ca_event ca_event_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event
    ADD CONSTRAINT ca_event_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.cms_entry(id) ON DELETE CASCADE;


--
-- Name: ca_event ca_event_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event
    ADD CONSTRAINT ca_event_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.ca_view(id) ON DELETE CASCADE;


--
-- Name: ca_pageview ca_pageview_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_pageview
    ADD CONSTRAINT ca_pageview_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.cms_entry(id) ON DELETE SET NULL;


--
-- Name: ca_pageview ca_pageview_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_pageview
    ADD CONSTRAINT ca_pageview_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: ca_pageview ca_pageview_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_pageview
    ADD CONSTRAINT ca_pageview_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.ca_view(id) ON DELETE SET NULL;


--
-- Name: ca_view ca_view_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_view
    ADD CONSTRAINT ca_view_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.cms_entry(id) ON DELETE CASCADE;


--
-- Name: ca_view ca_view_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_view
    ADD CONSTRAINT ca_view_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: checkout checkout_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: checkout checkout_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: checkout checkout_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: cms_author_profile cms_author_profile_avatar_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_author_profile
    ADD CONSTRAINT cms_author_profile_avatar_media_id_fkey FOREIGN KEY (avatar_media_id) REFERENCES public.cms_media(id) ON DELETE SET NULL;


--
-- Name: cms_author_profile cms_author_profile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_author_profile
    ADD CONSTRAINT cms_author_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: cms_course cms_course_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id);


--
-- Name: cms_course cms_course_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_cover_image_id_fkey FOREIGN KEY (cover_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_course cms_course_draft_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_draft_cover_image_id_fkey FOREIGN KEY (draft_cover_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_course cms_course_draft_thumbnail_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_draft_thumbnail_image_id_fkey FOREIGN KEY (draft_thumbnail_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_course cms_course_draft_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_draft_updated_by_fkey FOREIGN KEY (draft_updated_by) REFERENCES public."user"(id);


--
-- Name: cms_course cms_course_thumbnail_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_thumbnail_image_id_fkey FOREIGN KEY (thumbnail_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_entry cms_entry_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id);


--
-- Name: cms_entry cms_entry_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_cover_image_id_fkey FOREIGN KEY (cover_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_entry cms_entry_draft_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_draft_cover_image_id_fkey FOREIGN KEY (draft_cover_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_entry cms_entry_draft_thumbnail_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_draft_thumbnail_image_id_fkey FOREIGN KEY (draft_thumbnail_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_entry cms_entry_draft_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_draft_updated_by_fkey FOREIGN KEY (draft_updated_by) REFERENCES public."user"(id);


--
-- Name: cms_entry_tag cms_entry_tag_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry_tag
    ADD CONSTRAINT cms_entry_tag_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.cms_entry(id) ON DELETE CASCADE;


--
-- Name: cms_entry_tag cms_entry_tag_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry_tag
    ADD CONSTRAINT cms_entry_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.cms_tag(id) ON DELETE CASCADE;


--
-- Name: cms_entry cms_entry_thumbnail_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_thumbnail_image_id_fkey FOREIGN KEY (thumbnail_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_lesson cms_lesson_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson
    ADD CONSTRAINT cms_lesson_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: cms_lesson cms_lesson_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson
    ADD CONSTRAINT cms_lesson_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.cms_module(id) ON DELETE CASCADE;


--
-- Name: cms_lesson_progress cms_lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson_progress
    ADD CONSTRAINT cms_lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.cms_lesson(id) ON DELETE CASCADE;


--
-- Name: cms_lesson_progress cms_lesson_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson_progress
    ADD CONSTRAINT cms_lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: cms_media cms_media_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_media
    ADD CONSTRAINT cms_media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public."user"(id);


--
-- Name: cms_module cms_module_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_module
    ADD CONSTRAINT cms_module_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: cms_revision cms_revision_saved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_revision
    ADD CONSTRAINT cms_revision_saved_by_fkey FOREIGN KEY (saved_by) REFERENCES public."user"(id);


--
-- Name: decklists decklists_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decklists
    ADD CONSTRAINT decklists_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: decklists decklists_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decklists
    ADD CONSTRAINT decklists_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: event_player_heroes event_player_heroes_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_player_heroes
    ADD CONSTRAINT event_player_heroes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_closed_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_closed_by_user_id_fk FOREIGN KEY (closed_by) REFERENCES public."user"(id);


--
-- Name: events events_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: legacy_arb legacy_arb_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_arb
    ADD CONSTRAINT legacy_arb_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: legacy_arb legacy_arb_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_arb
    ADD CONSTRAINT legacy_arb_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscription(id) ON DELETE SET NULL;


--
-- Name: legacy_arb legacy_arb_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_arb
    ADD CONSTRAINT legacy_arb_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: lss_events lss_events_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lss_events
    ADD CONSTRAINT lss_events_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: matches matches_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: member_event member_event_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_event
    ADD CONSTRAINT member_event_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: member_event member_event_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_event
    ADD CONSTRAINT member_event_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: member_referral_code member_referral_code_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral_code
    ADD CONSTRAINT member_referral_code_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: member_referral member_referral_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public."user"(id);


--
-- Name: member_referral member_referral_referrer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public."user"(id);


--
-- Name: member_referral member_referral_reward_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_reward_subscription_id_fkey FOREIGN KEY (reward_subscription_id) REFERENCES public.subscription(id) ON DELETE SET NULL;


--
-- Name: member_referral member_referral_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscription(id) ON DELETE SET NULL;


--
-- Name: order order_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT order_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: page_view page_view_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_view
    ADD CONSTRAINT page_view_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: partner partner_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: partner_referral partner_referral_first_charge_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_first_charge_order_id_fkey FOREIGN KEY (first_charge_order_id) REFERENCES public."order"(id);


--
-- Name: partner_referral partner_referral_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id);


--
-- Name: partner_referral partner_referral_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public."user"(id);


--
-- Name: partner_referral partner_referral_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscription(id) ON DELETE SET NULL;


--
-- Name: partner partner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: password_reset_token password_reset_token_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: payment payment_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: payment payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: payment payment_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.ticket(id) ON DELETE SET NULL;


--
-- Name: payment payment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: podcast_episodes podcast_episodes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.podcast_episodes
    ADD CONSTRAINT podcast_episodes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: podcast_episodes podcast_episodes_podcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.podcast_episodes
    ADD CONSTRAINT podcast_episodes_podcast_id_fkey FOREIGN KEY (podcast_id) REFERENCES public.podcasts(id) ON DELETE CASCADE;


--
-- Name: podcasts podcasts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.podcasts
    ADD CONSTRAINT podcasts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: refund refund_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: refund_request refund_request_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: refund_request refund_request_refund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_refund_id_fkey FOREIGN KEY (refund_id) REFERENCES public.refund(id) ON DELETE SET NULL;


--
-- Name: refund_request refund_request_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.ticket(id) ON DELETE CASCADE;


--
-- Name: refund_request refund_request_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: refund refund_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: refund refund_subscription_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_subscription_invoice_id_fkey FOREIGN KEY (subscription_invoice_id) REFERENCES public.subscription_invoice(id) ON DELETE SET NULL;


--
-- Name: saved_card saved_card_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_card
    ADD CONSTRAINT saved_card_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: session session_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: staff_assignments staff_assignments_assigned_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assignments
    ADD CONSTRAINT staff_assignments_assigned_by_user_id_fk FOREIGN KEY (assigned_by) REFERENCES public."user"(id);


--
-- Name: staff_assignments staff_assignments_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assignments
    ADD CONSTRAINT staff_assignments_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: staff_assignments staff_assignments_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assignments
    ADD CONSTRAINT staff_assignments_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: subscription_invoice subscription_invoice_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: subscription_invoice subscription_invoice_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscription(id) ON DELETE CASCADE;


--
-- Name: subscription subscription_saved_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_saved_card_id_fkey FOREIGN KEY (saved_card_id) REFERENCES public.saved_card(id) ON DELETE SET NULL;


--
-- Name: subscription subscription_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: ticket ticket_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: ticket ticket_order_id_order_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_order_id_order_id_fk FOREIGN KEY (order_id) REFERENCES public."order"(id);


--
-- Name: ticket ticket_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: user user_comped_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_comped_by_fkey FOREIGN KEY (comped_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: vods vods_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: vods vods_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: billing_notice; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_notice ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_run; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_run ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_conversion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_conversion ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_event; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_event ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_pageview; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_pageview ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_view; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_view ENABLE ROW LEVEL SECURITY;

--
-- Name: checkout; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkout ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_author_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_author_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_course; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_course ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_entry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_entry ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_entry_tag; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_entry_tag ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_lesson; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_lesson ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_lesson_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_media ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_module; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_module ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_revision; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_revision ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_tag; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_tag ENABLE ROW LEVEL SECURITY;

--
-- Name: legacy_arb; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legacy_arb ENABLE ROW LEVEL SECURITY;

--
-- Name: member_event; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_event ENABLE ROW LEVEL SECURITY;

--
-- Name: member_referral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_referral ENABLE ROW LEVEL SECURITY;

--
-- Name: member_referral_code; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_referral_code ENABLE ROW LEVEL SECURITY;

--
-- Name: partner; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_referral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_referral ENABLE ROW LEVEL SECURITY;

--
-- Name: payment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

--
-- Name: refund; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refund ENABLE ROW LEVEL SECURITY;

--
-- Name: refund_request; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refund_request ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_invoice; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_invoice ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict AaFSXBcqXWPOIvjLkDxnjJDBAg444GREOuGAJPdG5VKJoAjJjQbvOTWeB4lCR3m

