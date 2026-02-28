-- RPC Functions for AGE Software Website
-- These functions consolidate multiple queries into single database calls
-- Run this in Supabase SQL Editor or via migration
--
-- Updated table names:
--   event -> events
--   season_standing -> standings
--   lss_season -> lss_events
--   event_result -> results
--   event_match -> matches
--   event_decklist -> decklists
--   event_staff -> staff_assignments

-- =====================================================
-- ANALYTICS PAGE FUNCTION
-- Replaces 35 queries with a single call
-- =====================================================

CREATE OR REPLACE FUNCTION get_analytics_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =====================================================
-- ADMIN DASHBOARD FUNCTION
-- Replaces 20+ queries with a single call
-- =====================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =====================================================
-- EVENT DETAILS FUNCTION
-- Replaces 7 queries with a single call
-- =====================================================

CREATE OR REPLACE FUNCTION get_event_details(p_event_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =====================================================
-- IMPORT MATCHES FUNCTION
-- Atomic delete + insert for match imports
-- =====================================================

CREATE OR REPLACE FUNCTION import_event_matches(
    p_year TEXT,
    p_circuit TEXT,
    p_month TEXT,
    p_matches JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =====================================================
-- IMPORT MATCHES DATA FUNCTION (for load)
-- Gets match counts and event data for import page
-- =====================================================

CREATE OR REPLACE FUNCTION get_import_matches_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =====================================================
-- SYNC PLAYER STANDINGS FUNCTION
-- Recalculates a player's standings from all their event results
-- Used for real-time standings updates on CSV upload
-- =====================================================

CREATE OR REPLACE FUNCTION sync_player_standings(
    p_season TEXT,
    p_circuit TEXT,
    p_gem_id TEXT DEFAULT NULL,
    p_player_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- =====================================================
-- PROCESS EVENT RESULTS FUNCTION
-- Handles CSV upload with real-time standings sync
-- Deletes old results, inserts new ones, recalculates affected players
-- =====================================================

CREATE OR REPLACE FUNCTION process_event_results(
    p_event_id TEXT,
    p_results JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =====================================================
-- FINALIZE EVENT FUNCTION (SIMPLIFIED)
-- Just updates event status - standings already synced on upload
-- =====================================================

CREATE OR REPLACE FUNCTION finalize_event(p_event_id TEXT, p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =====================================================
-- REOPEN EVENT FUNCTION (SIMPLIFIED)
-- Just updates event status - no standings reversal needed
-- =====================================================

CREATE OR REPLACE FUNCTION reopen_event(p_event_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant execute permissions (adjust role as needed)
-- GRANT EXECUTE ON FUNCTION get_analytics_data() TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_event_details(TEXT) TO authenticated;
-- GRANT EXECUTE ON FUNCTION import_event_matches(TEXT, TEXT, TEXT, JSONB) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_import_matches_data() TO authenticated;
-- GRANT EXECUTE ON FUNCTION sync_player_standings(TEXT, TEXT, TEXT, TEXT) TO authenticated;
-- GRANT EXECUTE ON FUNCTION process_event_results(TEXT, JSONB) TO authenticated;
-- GRANT EXECUTE ON FUNCTION finalize_event(TEXT, TEXT) TO authenticated;
-- GRANT EXECUTE ON FUNCTION reopen_event(TEXT) TO authenticated;
