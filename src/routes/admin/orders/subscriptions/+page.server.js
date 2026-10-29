import { fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	billingRun,
	subscription,
	subscriptionInvoice,
	user as userTable
} from '$lib/server/db/schema.js';
import { billingEnabled, chargeSubscriptionNow, runBilling } from '$lib/server/billing/renewals.js';
import { adminEndNow, adminExtend, adminHold } from '$lib/server/billing/subscriptions.js';
import { env } from '$env/dynamic/private';

export const config = { maxDuration: 300 };

const member = {
	id: subscription.id,
	ref: subscription.ref,
	userId: subscription.userId,
	plan: subscription.plan,
	priceCents: subscription.priceCents,
	status: subscription.status,
	currentPeriodEnd: subscription.currentPeriodEnd,
	nextChargeAt: subscription.nextChargeAt,
	nextAttemptAt: subscription.nextAttemptAt,
	graceUntil: subscription.graceUntil,
	failedAttempts: subscription.failedAttempts,
	hold: subscription.hold,
	leaseUntil: subscription.leaseUntil,
	legacyArbId: subscription.legacyArbId,
	legacyArbCancelledAt: subscription.legacyArbCancelledAt,
	flags: subscription.flags,
	email: userTable.email,
	firstName: userTable.firstName,
	lastName: userTable.lastName
};

export async function load({ locals }) {
	if (!locals.user || locals.user.role !== 'admin')
		throw redirect(302, '/login?redirect=/admin/orders/subscriptions');
	const now = new Date();
	const week = new Date(now.getTime() + 7 * 86400000);
	const tenMin = new Date(now.getTime() - 10 * 60000);
	const [counts, pastDue, upcoming, stuck, held, blocked, runs] = await Promise.all([
		db.execute(
			sql`select status, count(*) as n, coalesce(sum(case when plan = 'yearly' then price_cents/12.0 else price_cents end) filter (where status in ('active','past_due')), 0) as mrr from subscription group by status`
		),
		db
			.select(member)
			.from(subscription)
			.innerJoin(userTable, eq(userTable.id, subscription.userId))
			.where(eq(subscription.status, 'past_due'))
			.orderBy(subscription.graceUntil),
		db
			.select(member)
			.from(subscription)
			.innerJoin(userTable, eq(userTable.id, subscription.userId))
			.where(and(eq(subscription.status, 'active'), lte(subscription.nextChargeAt, week)))
			.orderBy(subscription.nextChargeAt)
			.limit(100),
		db
			.select({
				inv: subscriptionInvoice,
				email: userTable.email,
				ref: subscription.ref,
				subscriptionId: subscription.id
			})
			.from(subscriptionInvoice)
			.innerJoin(subscription, eq(subscription.id, subscriptionInvoice.subscriptionId))
			.innerJoin(userTable, eq(userTable.id, subscription.userId))
			.where(
				sql`${subscriptionInvoice.status} = 'unknown' or (${subscriptionInvoice.status} = 'charging' and ${subscriptionInvoice.lastAttemptAt} < ${tenMin.toISOString()}::timestamptz)`
			)
			.orderBy(desc(subscriptionInvoice.updatedAt)),
		db
			.select(member)
			.from(subscription)
			.innerJoin(userTable, eq(userTable.id, subscription.userId))
			.where(
				and(eq(subscription.hold, true), inArray(subscription.status, ['active', 'past_due']))
			),
		db
			.select(member)
			.from(subscription)
			.innerJoin(userTable, eq(userTable.id, subscription.userId))
			.where(
				and(
					sql`${subscription.legacyArbId} is not null and ${subscription.legacyArbCancelledAt} is null`,
					inArray(subscription.status, ['active', 'past_due'])
				)
			),
		db.select().from(billingRun).orderBy(desc(billingRun.startedAt)).limit(20)
	]);
	const byStatus = Object.fromEntries((counts.rows || counts).map((r) => [r.status, Number(r.n)]));
	const mrrCents = (counts.rows || counts).reduce((s, r) => s + Number(r.mrr || 0), 0);
	const lastLive = runs.find((r) => r.mode === 'live' && r.finishedAt && !r.error);
	const [recent] = await db
		.select({ n: sql`count(*)::int` })
		.from(subscriptionInvoice)
		.where(
			and(
				eq(subscriptionInvoice.status, 'paid'),
				gte(subscriptionInvoice.paidAt, new Date(now.getTime() - 86400000))
			)
		);
	return {
		enabled: billingEnabled(),
		cap: env.BILLING_MAX_CHARGES_PER_RUN || null,
		alertEmail: env.BILLING_ALERT_EMAIL || null,
		byStatus,
		mrrCents: Math.round(mrrCents),
		paidLast24h: Number(recent?.n) || 0,
		pastDue,
		upcoming,
		stuck: stuck.map((s) => ({
			...s.inv,
			email: s.email,
			ref: s.ref,
			subscriptionId: s.subscriptionId
		})),
		held,
		blocked,
		runs,
		lastLive: lastLive?.finishedAt || null
	};
}

const admin = (locals) => locals.user?.role === 'admin';

export const actions = {
	run: async ({ locals }) => {
		if (!admin(locals)) return fail(403, { error: 'Admin access required' });
		try {
			const r = await runBilling({ trigger: 'manual' });
			return {
				success: true,
				message: `Run ${r.runId} finished in ${Math.round(r.ms / 1000)}s (${r.mode}): ${r.charged ? `${r.charged.paid} paid, ${r.charged.declined} declined, ${r.charged.unknown} unknown` : `${r.due} due`}${r.errors.length ? `; ${r.errors.length} error(s)` : ''}.`
			};
		} catch (err) {
			return fail(500, { error: err?.message || 'Run failed' });
		}
	},
	chargeNow: async ({ locals, request }) => {
		if (!admin(locals)) return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const r = await chargeSubscriptionNow(form.get('id')?.toString(), { reason: 'admin' });
		if (!r.ok) return fail(400, { error: r.message });
		return { success: true, message: r.message };
	},
	endNow: async ({ locals, request }) => {
		if (!admin(locals)) return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const r = await adminEndNow({
			subscriptionId: form.get('id')?.toString(),
			actorId: locals.user.id,
			reason: 'admin'
		});
		if (!r.ok) return fail(400, { error: r.error });
		return { success: true, message: 'Membership ended.' };
	},
	extend: async ({ locals, request }) => {
		if (!admin(locals)) return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const r = await adminExtend({
			subscriptionId: form.get('id')?.toString(),
			actorId: locals.user.id,
			days: form.get('days')
		});
		if (!r.ok) return fail(400, { error: r.error });
		return { success: true, message: `Extended to ${r.end.toISOString().slice(0, 10)}.` };
	},
	hold: async ({ locals, request }) => {
		if (!admin(locals)) return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const r = await adminHold({
			subscriptionId: form.get('id')?.toString(),
			hold: form.get('hold') === '1',
			actorId: locals.user.id
		});
		if (!r.ok) return fail(400, { error: r.error });
		return {
			success: true,
			message: form.get('hold') === '1' ? 'Billing held.' : 'Billing resumed.'
		};
	},
	releaseLease: async ({ locals, request }) => {
		if (!admin(locals)) return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		await db
			.update(subscription)
			.set({ leaseUntil: null, leaseToken: null })
			.where(eq(subscription.id, form.get('id')?.toString()));
		return { success: true, message: 'Lease released.' };
	}
};
