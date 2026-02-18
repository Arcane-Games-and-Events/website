-- Migration 008: Enhanced analytics for premium users and ticket sales
-- Adds paid vs assigned premium differentiation and ticket monthly trends
-- to the get_analytics_data() RPC function

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
        -- NEW: Premium deep dive with paid vs assigned breakdown
        'premium', json_build_object(
            'totalPremium', (SELECT COUNT(*) FROM "user" WHERE role = 'premium'),
            'paidPremium', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_id IS NOT NULL),
            'assignedPremium', (SELECT COUNT(*) FROM "user" WHERE role = 'premium' AND subscription_id IS NULL),
            'paidActive', (SELECT COUNT(*) FROM "user" WHERE subscription_status = 'active' AND subscription_id IS NOT NULL),
            'paidCancelled', (SELECT COUNT(*) FROM "user" WHERE subscription_status = 'cancelled' AND subscription_id IS NOT NULL),
            'paidExpired', (SELECT COUNT(*) FROM "user" WHERE subscription_status = 'expired' AND subscription_id IS NOT NULL),
            'paidPaymentFailed', (SELECT COUNT(*) FROM "user" WHERE subscription_status = 'payment_failed' AND subscription_id IS NOT NULL),
            'paidMonthlyActive', (SELECT COUNT(*) FROM "user" WHERE subscription_type = 'monthly' AND subscription_status = 'active'),
            'paidYearlyActive', (SELECT COUNT(*) FROM "user" WHERE subscription_type = 'yearly' AND subscription_status = 'active'),
            'paidMonthlyCancelled', (SELECT COUNT(*) FROM "user" WHERE subscription_type = 'monthly' AND subscription_status = 'cancelled'),
            'paidYearlyCancelled', (SELECT COUNT(*) FROM "user" WHERE subscription_type = 'yearly' AND subscription_status = 'cancelled'),
            'recentSignups', (
                SELECT COALESCE(json_agg(json_build_object(
                    'email', email,
                    'firstName', first_name,
                    'lastName', last_name,
                    'type', CASE WHEN subscription_id IS NOT NULL THEN 'paid' ELSE 'assigned' END,
                    'subscriptionType', subscription_type,
                    'subscriptionStatus', subscription_status,
                    'createdAt', created_at
                ) ORDER BY created_at DESC), '[]'::json)
                FROM (
                    SELECT email, first_name, last_name, subscription_id, subscription_type, subscription_status, created_at
                    FROM "user" WHERE role = 'premium'
                    ORDER BY created_at DESC LIMIT 10
                ) p
            ),
            'monthlyTrend', (
                SELECT COALESCE(json_agg(json_build_object(
                    'month', m, 'monthName', mn, 'paid', paid, 'assigned', assigned, 'total', paid + assigned
                ) ORDER BY m), '[]'::json)
                FROM (
                    SELECT TO_CHAR(created_at, 'YYYY-MM') as m,
                           TO_CHAR(created_at, 'Mon YYYY') as mn,
                           SUM(CASE WHEN subscription_id IS NOT NULL THEN 1 ELSE 0 END)::INT as paid,
                           SUM(CASE WHEN subscription_id IS NULL THEN 1 ELSE 0 END)::INT as assigned
                    FROM "user" WHERE role = 'premium'
                    GROUP BY m, mn ORDER BY m DESC LIMIT 12
                ) t
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
            'avgTicketPrice', COALESCE((SELECT ROUND(AVG(CAST(amount_paid AS DECIMAL)), 2) FROM ticket WHERE refunded IS NOT TRUE AND amount_paid IS NOT NULL), 0),
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
            ),
            -- NEW: Monthly ticket trend
            'monthlyTrend', (
                SELECT COALESCE(json_agg(json_build_object(
                    'month', m, 'monthName', mn, 'count', cnt, 'revenue', rev
                ) ORDER BY m), '[]'::json)
                FROM (
                    SELECT TO_CHAR(created_at, 'YYYY-MM') as m,
                           TO_CHAR(created_at, 'Mon YYYY') as mn,
                           COUNT(*) as cnt,
                           COALESCE(SUM(CAST(amount_paid AS DECIMAL)), 0) as rev
                    FROM ticket WHERE refunded IS NOT TRUE
                    GROUP BY m, mn ORDER BY m DESC LIMIT 12
                ) t
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
