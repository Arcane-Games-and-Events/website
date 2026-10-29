import { db } from '$lib/server/db/index.js';
import { event, order } from '$lib/server/db/schema.js';
import { asc, desc, gte, sql } from 'drizzle-orm';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { mrrCents } from '$lib/server/admin/util.js';

/**
 * Reads behind the admin home page. Each is one query; the ledger-based
 * figures (Part B/C) are added by the analytics modules when migration 022
 * has run, so this file only needs what exists today.
 */

const n = (v) => Number(v) || 0;

/**
 * Member counts for the figures row. Paying = premium with a live
 * subscription (the test plan excluded); comped = premium without one.
 * MRR uses the real prices: $10 a month, $110 a year.
 */
export function memberFigures() {
	return cached(
		'admin:home:members:v1',
		async () => {
			const result = await db.execute(sql`
				select
					count(*) filter (where role = 'premium' and subscription_id is not null
						and subscription_status in ('active', 'payment_failed')
						and coalesce(subscription_type, '') <> 'weekly_test') as paying,
					count(*) filter (where role = 'premium' and subscription_id is not null
						and subscription_status in ('active', 'payment_failed')
						and subscription_type = 'monthly') as monthly,
					count(*) filter (where role = 'premium' and subscription_id is not null
						and subscription_status in ('active', 'payment_failed')
						and subscription_type = 'yearly') as yearly,
					count(*) filter (where role = 'premium' and subscription_id is null) as comped,
					count(*) filter (where subscription_status = 'payment_failed') as payment_failed
				from "user"
			`);
			const r = (result.rows || result)[0] || {};
			const monthly = n(r.monthly);
			const yearly = n(r.yearly);
			let mrr = monthly * 10 + (yearly * 110) / 12;
			try {
				mrr = (await mrrCents(db)) / 100;
			} catch (err) {
				if (err?.code !== '42P01' && err?.cause?.code !== '42P01') throw err;
			}
			return {
				paying: n(r.paying),
				monthly,
				yearly,
				comped: n(r.comped),
				paymentFailed: n(r.payment_failed),
				mrr
			};
		},
		{ tags: ['users'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}

/** Things an admin should look at, with counts, in one statement. */
export function attention() {
	return cached(
		'admin:home:attention:v1',
		async () => {
			const result = await db.execute(sql`
				select
					(select count(*) from "user" where subscription_status = 'payment_failed') as payment_failed,
					(select count(*) from partner_referral
						where payout_status = 'pending'
						and created_at + interval '1 month' <= now() + interval '3 days') as payouts_due,
					(select count(*) from events
						where event_date between now() and now() + interval '14 days'
						and coalesce(status, 'upcoming') not in ('cancelled', 'completed')) as events_soon,
					(select count(*) from events
						where event_date < now() - interval '1 day'
						and coalesce(status, 'upcoming') not in ('cancelled', 'completed')) as events_unclosed,
					(select count(*) from vods where is_published = false) as vods_unpublished,
					(select count(*) from cms_entry where draft_updated_at is not null) as desk_reviews,
					(select count(*) from refund_request where status = 'pending') as refund_requests,
					(select count(*) from subscription where status = 'past_due') as past_due,
					(select count(*) from subscription_invoice where status = 'unknown') as unknown_charges,
					(select count(*) from legacy_arb where decision is null and classification not in ('migrate', 'inactive', 'test')) as arb_review
			`);
			const r = (result.rows || result)[0] || {};
			return {
				paymentFailed: n(r.payment_failed),
				payoutsDue: n(r.payouts_due),
				eventsSoon: n(r.events_soon),
				eventsUnclosed: n(r.events_unclosed),
				vodsUnpublished: n(r.vods_unpublished),
				deskReviews: n(r.desk_reviews),
				refundRequests: n(r.refund_requests),
				pastDue: n(r.past_due),
				unknownCharges: n(r.unknown_charges),
				arbReview: n(r.arb_review)
			};
		},
		{ tags: ['users', 'events', 'vods', 'entries', 'orders'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}

/** The next upcoming events, soonest first. */
export function nextEvents(limit = 5) {
	return cached(
		`admin:home:next-events:${limit}`,
		() =>
			db
				.select({
					id: event.id,
					title: event.title,
					circuit: event.circuit,
					eventDate: event.eventDate,
					status: event.status,
					playerCap: event.playerCap
				})
				.from(event)
				.where(gte(event.eventDate, sql`now()`))
				.orderBy(asc(event.eventDate))
				.limit(limit),
		{ tags: ['events'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}

/** The latest orders. */
export function recentOrders(limit = 5) {
	return cached(
		`admin:home:recent-orders:${limit}`,
		() =>
			db
				.select({
					id: order.id,
					userEmail: order.userEmail,
					amount: order.amount,
					meta: order.meta,
					createdAt: order.createdAt
				})
				.from(order)
				.orderBy(desc(order.createdAt))
				.limit(limit),
		{ tags: ['orders'] }
	);
}
