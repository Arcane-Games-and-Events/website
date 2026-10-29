import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';
import {
	guarded,
	n,
	money,
	first,
	rows,
	lastMonths,
	monthLabel,
	payingWhere,
	pgArray
} from './util.js';

/**
 * Member reports: who pays, who is comped, and how the paying count has
 * moved. A paying member is premium with a live subscription (the test
 * plan excluded); a comp is premium without one.
 */

/** Counts for paying vs comped, plus the comped list. */
export function cohorts() {
	return guarded(
		'admin:members:cohorts:v1',
		async () => {
			const [counts, comped] = await Promise.all([
				db.execute(sql`
					select
						count(*) filter (where ${payingWhere()}) as paying,
						count(*) filter (where ${payingWhere()} and subscription_type = 'monthly') as monthly,
						count(*) filter (where ${payingWhere()} and subscription_type = 'yearly') as yearly,
						count(*) filter (where ${payingWhere()} and subscription_status = 'active') as active,
						count(*) filter (where ${payingWhere()} and subscription_status = 'payment_failed') as payment_failed,
						count(*) filter (where role = 'premium' and subscription_id is not null and subscription_status = 'cancelled') as cancelled,
						count(*) filter (where role = 'premium' and subscription_id is null) as comped,
						count(*) filter (where role = 'free' and last_subscription_id is not null) as lapsed,
						count(*) filter (where role = 'admin') as admins,
						count(*) as accounts
					from "user"
				`),
				db.execute(sql`
					select u.id, u.email, u.first_name, u.last_name, u.comp_reason, u.comped_at,
						u.additional_roles, u.last_subscription_id,
						b.first_name as by_first, b.last_name as by_last
					from "user" u
					left join "user" b on b.id = u.comped_by
					where u.role = 'premium' and u.subscription_id is null
					order by u.comped_at desc nulls last, u.email
				`)
			]);
			const c = first(counts);
			const list = rows(comped).map((r) => ({
				id: r.id,
				email: r.email,
				name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email,
				reason: r.comp_reason || 'unknown',
				compedAt: r.comped_at,
				compedBy: r.by_first ? `${r.by_first} ${r.by_last || ''}`.trim() : null,
				roles: pgArray(r.additional_roles),
				wasSubscriber: !!r.last_subscription_id
			}));
			const byReason = {};
			for (const m of list) byReason[m.reason] = (byReason[m.reason] || 0) + 1;
			return {
				paying: {
					total: n(c.paying),
					monthly: n(c.monthly),
					yearly: n(c.yearly),
					active: n(c.active),
					paymentFailed: n(c.payment_failed),
					cancelled: n(c.cancelled)
				},
				comped: {
					total: n(c.comped),
					byReason: Object.entries(byReason)
						.map(([reason, count]) => ({ reason, count }))
						.sort((a, b) => b.count - a.count),
					list
				},
				lapsed: n(c.lapsed),
				admins: n(c.admins),
				accounts: n(c.accounts)
			};
		},
		{ tags: ['users'] }
	);
}

/** Every paying member with their plan, dates and lifetime paid. */
export function payingMembers() {
	return guarded(
		'admin:members:paying:v1',
		async () => {
			const result = await db.execute(sql`
				select u.id, u.email, u.first_name, u.last_name, u.subscription_type as plan,
					u.subscription_status as status, u.subscription_start_date as since,
					u.next_billing_date, u.subscription_end_date, u.used_partner_code,
					coalesce(sum(p.amount - p.refunded_amount) filter (where p.kind like 'sub%'), 0) as paid,
					count(p.id) filter (where p.kind like 'sub%') as payments
				from "user" u
				left join payment p on p.user_id = u.id
				where u.role = 'premium' and u.subscription_id is not null
					and coalesce(u.subscription_type, '') <> 'weekly_test'
				group by u.id
				order by u.subscription_start_date desc nulls last
			`);
			return {
				list: rows(result).map((r) => ({
					id: r.id,
					email: r.email,
					name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email,
					plan: r.plan,
					status: r.status,
					since: r.since,
					nextBilling: r.next_billing_date,
					accessUntil: r.subscription_end_date,
					promo: r.used_partner_code,
					paid: money(r.paid),
					payments: n(r.payments)
				}))
			};
		},
		{ tags: ['users', 'orders'] }
	);
}

/**
 * Month by month: new paying members, churned (cancelled or expired),
 * comps added, and the paying count at month end.
 */
export function history({ months = 12 } = {}) {
	return guarded(
		`admin:members:history:v1:${months}`,
		async () => {
			const keys = lastMonths(months);
			const since = `${keys[0]}-01`;
			const [events, paying] = await Promise.all([
				db.execute(sql`
					select to_char(at at time zone 'UTC', 'YYYY-MM') as month, kind, count(*) as count
					from member_event
					where at >= ${since}::date
					group by 1, 2
				`),
				db.execute(sql`select count(*) as paying from "user" where ${payingWhere()}`)
			]);
			const byMonth = new Map(
				keys.map((k) => [
					k,
					{
						month: k,
						label: monthLabel(k),
						newPaying: 0,
						cancelled: 0,
						expired: 0,
						churned: 0,
						failed: 0,
						comped: 0,
						compRemoved: 0,
						payingAtEnd: 0
					}
				])
			);
			const KIND = {
				subscribed: 'newPaying',
				cancelled: 'cancelled',
				expired: 'expired',
				payment_failed: 'failed',
				comped: 'comped',
				comp_removed: 'compRemoved'
			};
			for (const r of rows(events)) {
				const m = byMonth.get(r.month);
				const f = KIND[r.kind];
				if (m && f) m[f] += n(r.count);
			}
			// Walk back from today's paying count. A cancellation ends access at
			// the period's end, so for the count it is treated like an expiry.
			const list = [...byMonth.values()];
			let count = n(first(paying).paying);
			for (let i = list.length - 1; i >= 0; i--) {
				const m = list[i];
				m.churned = m.cancelled + m.expired;
				m.payingAtEnd = count;
				count = Math.max(0, count - m.newPaying + m.churned);
			}
			return { months: list };
		},
		{ tags: ['users'] }
	);
}
