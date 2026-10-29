import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';
import {
	guarded,
	n,
	money,
	first,
	rows,
	lastMonths,
	nextMonths,
	monthLabel,
	PRICE,
	payingWhere,
	mrrCents
} from './util.js';

/**
 * Premium projections. MRR and ARR come from the paying counts at today's
 * prices; the forward series applies the trailing churn and sign-up rates
 * month by month, so the page can show where the current trend leads and
 * re-run it with different assumptions.
 */

export function projection() {
	return guarded(
		'admin:projection:v1',
		async () => {
			const last3 = lastMonths(4).slice(0, 3); // the three full months before this one
			const since = `${last3[0]}-01`;
			const until = `${lastMonths(1)[0]}-01`;
			const [counts, flow, renewals, promo] = await Promise.all([
				db.execute(sql`
					select
						count(*) filter (where ${payingWhere()} and subscription_type = 'monthly') as monthly,
						count(*) filter (where ${payingWhere()} and subscription_type = 'yearly') as yearly,
						count(*) filter (where ${payingWhere()} and subscription_status = 'cancelled') as cancelled_pending
					from "user"
				`),
				db.execute(sql`
					select kind, count(*) as count
					from member_event
					where at >= ${since}::date and at < ${until}::date
						and kind in ('subscribed', 'cancelled', 'expired')
					group by kind
				`),
				db.execute(sql`
					select to_char(next_billing_date at time zone 'UTC', 'YYYY-MM') as month, count(*) as count
					from "user"
					where ${payingWhere()} and subscription_type = 'yearly' and next_billing_date is not null
						and next_billing_date >= now() and next_billing_date < now() + interval '12 months'
					group by 1
				`),
				// Members on a promo whose full-price billing hasn't started yet:
				// a partner or referral first charge with no renewal after it.
				db.execute(sql`
					select count(distinct u.id) as count
					from "user" u
					join payment p on p.subscription_id = u.subscription_id and p.kind = 'sub_promo_first'
					where ${payingWhere('u')}
						and not exists (select 1 from payment r where r.subscription_id = u.subscription_id and r.kind = 'sub_renewal')
				`)
			]);

			const c = first(counts);
			const monthly = n(c.monthly);
			const yearly = n(c.yearly);
			const paying = monthly + yearly;
			let mrr = money(monthly * PRICE.monthly + (yearly * PRICE.yearly) / 12);
			try {
				mrr = money((await mrrCents(db)) / 100);
			} catch (err) {
				if (err?.code !== '42P01' && err?.cause?.code !== '42P01') throw err;
			}

			const f = Object.fromEntries(rows(flow).map((r) => [r.kind, n(r.count)]));
			const newPerMonth = (f.subscribed || 0) / 3;
			const churnedPerMonth = ((f.cancelled || 0) + (f.expired || 0)) / 3;
			// Monthly churn rate against the average base over the window.
			const avgBase = Math.max(1, paying - newPerMonth * 1.5 + churnedPerMonth * 1.5);
			const churnRate = Math.min(1, churnedPerMonth / avgBase);
			const yearlyShare = paying ? yearly / paying : 0;
			const arpu = paying ? mrr / paying : PRICE.monthly;

			const horizon = nextMonths(12);
			const run = (churn, adds) => {
				let count = paying;
				return horizon.map((month) => {
					count = Math.max(0, count * (1 - churn) + adds);
					return {
						month,
						label: monthLabel(month),
						paying: Math.round(count),
						mrr: money(count * arpu)
					};
				});
			};
			const series = {
				trend: run(churnRate, newPerMonth),
				better: run(churnRate * 0.9, newPerMonth * 1.1),
				worse: run(Math.min(1, churnRate * 1.1), newPerMonth * 0.9)
			};
			const at = (list, i) => list[i - 1];

			const renewalMap = new Map(rows(renewals).map((r) => [r.month, n(r.count)]));
			const yearlyRenewals = horizon.map((month) => ({
				month,
				label: monthLabel(month),
				count: renewalMap.get(month) || 0,
				amount: money((renewalMap.get(month) || 0) * PRICE.yearly)
			}));

			return {
				paying,
				monthly,
				yearly,
				cancelledPending: n(c.cancelled_pending),
				promoPending: n(first(promo).count),
				mrr,
				arr: money(mrr * 12),
				arpu: money(arpu),
				yearlyShare,
				window: { from: monthLabel(last3[0]), to: monthLabel(last3[2]) },
				newPerMonth: Math.round(newPerMonth * 10) / 10,
				churnedPerMonth: Math.round(churnedPerMonth * 10) / 10,
				churnRate,
				series,
				milestones: {
					m3: {
						trend: at(series.trend, 3),
						better: at(series.better, 3),
						worse: at(series.worse, 3)
					},
					m6: {
						trend: at(series.trend, 6),
						better: at(series.better, 6),
						worse: at(series.worse, 6)
					},
					m12: {
						trend: at(series.trend, 12),
						better: at(series.better, 12),
						worse: at(series.worse, 12)
					}
				},
				yearlyRenewals
			};
		},
		{ tags: ['users', 'orders'] }
	);
}
