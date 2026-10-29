import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';
import { guarded, n, money, first, rows, lastMonths, monthLabel } from './util.js';

/**
 * Revenue reports, from the `payment` ledger (migration 022). Everything is
 * cash basis: a charge counts in the month it was collected and a refund in
 * the month it was given back. A yearly membership is one $110 line in the
 * month it was paid.
 */

const TAGS = ['orders', 'tickets', 'users'];

/**
 * Month-by-month ledger for the last `months` months.
 *
 * Each month: what came in by kind, discounts given (money forgone, not
 * collected), refunds, and the net.
 */
export function monthlyLedger({ months = 12 } = {}) {
	return guarded(
		`admin:revenue:ledger:v1:${months}`,
		async () => {
			const keys = lastMonths(months);
			const since = `${keys[0]}-01`;
			const [collected, refunded] = await Promise.all([
				db.execute(sql`
					select to_char(occurred_at at time zone 'UTC', 'YYYY-MM') as month,
						kind,
						coalesce(sum(amount), 0) as amount,
						count(*) as count,
						coalesce(sum(discount_amount) filter (where discount_kind = 'premium_event'), 0) as d_event,
						coalesce(sum(discount_amount) filter (where discount_kind = 'partner'), 0) as d_partner,
						coalesce(sum(discount_amount) filter (where discount_kind = 'member_referral'), 0) as d_referral
					from payment
					where occurred_at >= ${since}::date
					group by 1, 2
				`),
				db.execute(sql`
					select to_char(refunded_at at time zone 'UTC', 'YYYY-MM') as month,
						coalesce(sum(refunded_amount), 0) as amount,
						count(*) as count
					from payment
					where refunded_at is not null and refunded_at >= ${since}::date
					group by 1
				`)
			]);

			const byMonth = new Map(
				keys.map((k) => [
					k,
					{
						month: k,
						label: monthLabel(k),
						subFirst: 0,
						subRenewal: 0,
						subPromoFirst: 0,
						subscriptions: 0,
						tickets: 0,
						gross: 0,
						refunds: 0,
						net: 0,
						count: 0,
						discounts: { premiumEvent: 0, partner: 0, memberReferral: 0, total: 0 }
					}
				])
			);
			const KIND = {
				sub_first: 'subFirst',
				sub_renewal: 'subRenewal',
				sub_promo_first: 'subPromoFirst',
				ticket: 'tickets'
			};
			for (const r of rows(collected)) {
				const m = byMonth.get(r.month);
				if (!m) continue;
				const field = KIND[r.kind];
				if (field) m[field] += money(r.amount);
				m.gross += money(r.amount);
				m.count += n(r.count);
				m.discounts.premiumEvent += money(r.d_event);
				m.discounts.partner += money(r.d_partner);
				m.discounts.memberReferral += money(r.d_referral);
			}
			for (const r of rows(refunded)) {
				const m = byMonth.get(r.month);
				if (m) m.refunds += money(r.amount);
			}
			const list = [...byMonth.values()].map((m) => {
				m.subscriptions = money(m.subFirst + m.subRenewal + m.subPromoFirst);
				m.discounts.total = money(
					m.discounts.premiumEvent + m.discounts.partner + m.discounts.memberReferral
				);
				m.net = money(m.gross - m.refunds);
				return m;
			});

			const cur = list.at(-1);
			const prev = list.at(-2);
			const trailing = list.slice(-4, -1);
			const total = (f) => money(list.reduce((s, m) => s + f(m), 0));
			return {
				months: list,
				figures: {
					thisMonth: cur?.net ?? 0,
					lastMonth: prev?.net ?? 0,
					trailing3: trailing.length
						? money(trailing.reduce((s, m) => s + m.net, 0) / trailing.length)
						: 0,
					refunds12: total((m) => m.refunds),
					discounts12: total((m) => m.discounts.total),
					gross12: total((m) => m.gross),
					net12: total((m) => m.net)
				},
				share: {
					subscriptions: total((m) => m.subscriptions),
					tickets: total((m) => m.tickets)
				}
			};
		},
		{ tags: TAGS }
	);
}

/**
 * What each paying member has been worth: subscription money collected,
 * tickets bought, event discounts used, and the net.
 */
export function memberValue({ months = 12 } = {}) {
	return guarded(
		`admin:revenue:member-value:v1:${months}`,
		async () => {
			const since = `${lastMonths(months)[0]}-01`;
			const result = await db.execute(sql`
				select u.id, u.email, u.first_name, u.last_name, u.subscription_type as plan,
					u.subscription_status as status, u.subscription_start_date as since,
					coalesce(sum(p.amount - p.refunded_amount) filter (where p.kind like 'sub%'), 0) as sub_paid,
					coalesce(sum(p.amount - p.refunded_amount) filter (where p.kind = 'ticket'), 0) as tickets_paid,
					coalesce(sum(p.discount_amount) filter (where p.discount_kind = 'premium_event'), 0) as discounts_used,
					count(p.id) filter (where p.kind like 'sub%' and p.refunded_at is null) as sub_payments
				from "user" u
				left join payment p on p.user_id = u.id and p.occurred_at >= ${since}::date
				where u.role = 'premium' and u.subscription_id is not null
					and coalesce(u.subscription_type, '') <> 'weekly_test'
				group by u.id
				order by sub_paid desc, u.subscription_start_date asc
			`);
			const list = rows(result).map((r) => ({
				id: r.id,
				email: r.email,
				name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email,
				plan: r.plan,
				status: r.status,
				since: r.since,
				subPaid: money(r.sub_paid),
				ticketsPaid: money(r.tickets_paid),
				discountsUsed: money(r.discounts_used),
				net: money(n(r.sub_paid) + n(r.tickets_paid) - n(r.discounts_used)),
				subPayments: n(r.sub_payments)
			}));
			const sum = (f) => money(list.reduce((s, m) => s + f(m), 0));
			return {
				list,
				totals: {
					members: list.length,
					subPaid: sum((m) => m.subPaid),
					ticketsPaid: sum((m) => m.ticketsPaid),
					discountsUsed: sum((m) => m.discountsUsed),
					net: sum((m) => m.net),
					usedDiscount: list.filter((m) => m.discountsUsed > 0).length
				}
			};
		},
		{ tags: TAGS }
	);
}

/** Premium event discounts, by event. */
export function discountsByEvent({ months = 12 } = {}) {
	return guarded(
		`admin:revenue:discounts-by-event:v1:${months}`,
		async () => {
			const since = `${lastMonths(months)[0]}-01`;
			const result = await db.execute(sql`
				select e.id, e.title, e.circuit, e.event_date,
					count(*) as tickets,
					count(*) filter (where p.discount_amount > 0) as discounted,
					coalesce(sum(p.discount_amount), 0) as discounts,
					coalesce(sum(p.amount - p.refunded_amount), 0) as collected
				from payment p
				join events e on e.id = p.event_id
				where p.kind = 'ticket' and p.occurred_at >= ${since}::date
				group by e.id
				order by discounts desc, e.event_date desc
			`);
			return {
				list: rows(result).map((r) => ({
					id: r.id,
					title: r.title,
					circuit: r.circuit,
					eventDate: r.event_date,
					tickets: n(r.tickets),
					discounted: n(r.discounted),
					discounts: money(r.discounts),
					collected: money(r.collected)
				}))
			};
		},
		{ tags: TAGS }
	);
}

/** How complete and trustworthy the ledger is. */
export function ledgerHealth() {
	return guarded(
		'admin:revenue:health:v1',
		async () => {
			const r = first(
				await db.execute(sql`
					select count(*) as total,
						count(*) filter (where source = 'webhook' and verified_at is null) as unverified,
						count(*) filter (where source = 'backfill') as backfilled,
						max(occurred_at) as last_payment,
						min(occurred_at) as first_payment,
						(select count(*) from "user" where subscription_id is not null and subscription_status in ('active', 'payment_failed')
							and not exists (select 1 from payment p where p.subscription_id = "user".subscription_id)) as subs_without_payments
					from payment
				`)
			);
			return {
				total: n(r.total),
				unverified: n(r.unverified),
				backfilled: n(r.backfilled),
				lastPayment: r.last_payment,
				firstPayment: r.first_payment,
				subsWithoutPayments: n(r.subs_without_payments)
			};
		},
		{ tags: TAGS, ttl: 60 }
	);
}
