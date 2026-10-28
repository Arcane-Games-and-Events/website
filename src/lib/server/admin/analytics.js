import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';

/**
 * Figures for /admin/analytics: revenue, members, events, tickets, courses,
 * players, customers and premium subscriptions.
 *
 * One SQL statement builds the whole report, so the database answers in a
 * single round trip (this is the body of the retired `get_analytics_data()`
 * function, now kept here with the code that reads it). Cached for five
 * minutes; any order, user, event or standings write makes it stale.
 */
const ANALYTICS_SQL = `
SELECT json_build_object(
    'revenue', json_build_object(
        'today', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= date_trunc('day', now())), 0),
        'todayOrders', (SELECT COUNT(*) FROM "order" WHERE created_at >= date_trunc('day', now())),
        'week', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= (now() - interval '7 days')), 0),
        'weekOrders', (SELECT COUNT(*) FROM "order" WHERE created_at >= (now() - interval '7 days')),
        'month', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= date_trunc('month', now())), 0),
        'monthOrders', (SELECT COUNT(*) FROM "order" WHERE created_at >= date_trunc('month', now())),
        'lastMonth', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= date_trunc('month', now() - interval '1 month') AND created_at < date_trunc('month', now())), 0),
        'ytd', COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM "order" WHERE created_at >= date_trunc('year', now())), 0),
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
                FROM "order" WHERE created_at >= (now() - interval '30 days')
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
        'newThisMonth', (SELECT COUNT(*) FROM "user" WHERE created_at >= date_trunc('month', now())),
        'newLastMonth', (SELECT COUNT(*) FROM "user" WHERE created_at >= date_trunc('month', now() - interval '1 month') AND created_at < date_trunc('month', now())),
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
                FROM "user" WHERE created_at >= (now() - interval '30 days')
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
        'thisMonth', (SELECT COUNT(*) FROM ticket WHERE created_at >= date_trunc('month', now())),
        'thisMonthRevenue', COALESCE((SELECT SUM(CAST(amount_paid AS DECIMAL)) FROM ticket WHERE created_at >= date_trunc('month', now())), 0),
        'lastMonth', (SELECT COUNT(*) FROM ticket WHERE created_at >= date_trunc('month', now() - interval '1 month') AND created_at < date_trunc('month', now())),
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
) AS data`;

export function loadAnalytics() {
	return cached(
		'admin:analytics:v1',
		async () => {
			const result = await db.execute(sql.raw(ANALYTICS_SQL));
			const row = (result.rows || result || [])[0];
			const data = typeof row?.data === 'string' ? JSON.parse(row.data) : row?.data;
			if (!data) return null;

			const month = Number(data.revenue?.month) || 0;
			const lastMonth = Number(data.revenue?.lastMonth) || 0;
			data.revenue.growth =
				lastMonth > 0 ? Math.round(((month - lastMonth) / lastMonth) * 1000) / 10 : null;
			return data;
		},
		{ tags: ['orders', 'users', 'events', 'standings', 'tickets'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}
