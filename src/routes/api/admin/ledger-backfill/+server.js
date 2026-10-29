import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { order, payment, user as userTable } from '$lib/server/db/schema.js';
import { sql } from 'drizzle-orm';
import { bump } from '$lib/server/cache/index.js';
import { recordPayment, markRefunded, markVerified } from '$lib/server/payments/ledger.js';
import { isMissingTable } from '$lib/server/contentAnalytics/collect.js';

/**
 * POST /api/admin/ledger-backfill
 *
 * Fills the `payment` ledger with every subscription charge Authorize.net
 * has on record, for every subscription id the database still knows
 * (current, lapsed, or named on an order). Ticket and promo first charges
 * were backfilled by migration 022 itself.
 *
 * Runs in batches so it fits a serverless time limit: pass `cursor` from
 * the previous response to continue. `dryRun=1` reports what would be
 * added without writing. Refuses to run against the sandbox unless
 * `allowSandbox=1`, so test transactions never land in the real ledger.
 *
 * Auth: an admin session, or `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function POST({ request, locals, url }) {
	const authHeader = request.headers.get('authorization');
	const cronOk = env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`;
	if (!cronOk && locals.user?.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	if (authnet.environment !== 'production' && url.searchParams.get('allowSandbox') !== '1') {
		return json(
			{ error: 'AUTHNET_ENVIRONMENT is not production. Add ?allowSandbox=1 to run anyway.' },
			{ status: 400 }
		);
	}

	const dryRun = url.searchParams.get('dryRun') === '1';
	const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
	const cursor = Math.max(0, Number(url.searchParams.get('cursor')) || 0);

	// Every subscription id we can still find, with the member it belongs to.
	let subs;
	try {
		subs = await listSubscriptions();
	} catch (err) {
		if (isMissingTable(err)) {
			return json({ error: 'Run migration 022 first.' }, { status: 400 });
		}
		throw err;
	}
	const batch = subs.slice(cursor, cursor + limit);

	const out = {
		dryRun,
		total: subs.length,
		cursor,
		processed: 0,
		nextCursor: cursor + batch.length < subs.length ? cursor + batch.length : null,
		added: 0,
		alreadyPresent: 0,
		refunds: 0,
		errors: [],
		preview: []
	};

	for (const s of batch) {
		out.processed++;
		try {
			const sub = await authnet.getSubscription(s.subscriptionId);
			const txs = (sub.transactions || []).filter((tx) => {
				const r = String(tx.response ?? '').toLowerCase();
				return r === '1' || r.includes('approved');
			});
			for (const tx of txs) {
				let details = null;
				try {
					details = await authnet.getTransactionDetails(tx.transId);
				} catch (err) {
					out.errors.push(`${tx.transId}: ${err.message}`);
				}
				const refunded = details?.status && /refund|void/i.test(details.status) ? true : false;
				const row = {
					transId: String(tx.transId),
					kind: Number(tx.payNum) === 1 && !s.promo ? 'sub_first' : 'sub_renewal',
					amount: details?.settleAmount ?? details?.authAmount ?? sub.amount,
					userId: s.userId,
					userEmail: s.email,
					subscriptionId: s.subscriptionId,
					subscriptionType: s.subscriptionType,
					payNum: Number(tx.payNum) || details?.payNum || null,
					occurredAt: new Date(details?.submitTimeUTC || tx.submitTimeUTC || Date.now()),
					refundedAt: refunded ? new Date(details?.submitTimeUTC || tx.submitTimeUTC) : null,
					refundedAmount: refunded ? (details?.settleAmount ?? sub.amount) : 0,
					source: 'backfill',
					verifiedAt: new Date()
				};
				if (dryRun) {
					if (out.preview.length < 50) out.preview.push(row);
					continue;
				}
				const added = await recordPayment(row);
				if (added) out.added++;
				else {
					out.alreadyPresent++;
					await markVerified([row.transId]);
					if (refunded) {
						await markRefunded(row.transId, row.refundedAmount, row.refundedAt);
						out.refunds++;
					}
				}
			}
		} catch (err) {
			out.errors.push(`${s.subscriptionId}: ${err.message}`);
		}
	}

	if (!dryRun && out.added) await bump('orders', 'users');
	return json(out);
}

/**
 * Subscription ids from the user table (current and last), and from orders
 * (`provider_ref` for plain subscriptions, `meta.subscriptionId` for promo
 * first charges), mapped to the member by id or email.
 */
async function listSubscriptions() {
	const fromUsers = await db
		.select({
			userId: userTable.id,
			email: userTable.email,
			subscriptionType: userTable.subscriptionType,
			usedPartnerCode: userTable.usedPartnerCode,
			current: userTable.subscriptionId,
			last: userTable.lastSubscriptionId
		})
		.from(userTable)
		.where(
			sql`${userTable.subscriptionId} is not null or ${userTable.lastSubscriptionId} is not null`
		);

	const fromOrders = await db
		.select({
			email: order.userEmail,
			providerRef: order.providerRef,
			type: sql`${order.meta}->>'type'`,
			subscriptionId: sql`${order.meta}->>'subscriptionId'`,
			subscriptionType: sql`${order.meta}->>'subscriptionType'`
		})
		.from(order)
		.where(sql`${order.meta}->>'type' like 'subscription%'`);

	const promoSubs = new Set(
		(
			await db
				.select({ id: payment.subscriptionId })
				.from(payment)
				.where(sql`${payment.kind} = 'sub_promo_first'`)
		).map((r) => r.id)
	);
	const byEmail = new Map(fromUsers.map((u) => [u.email, u]));
	const map = new Map();
	const add = (subscriptionId, u, subscriptionType, email) => {
		if (!subscriptionId || map.has(subscriptionId)) return;
		map.set(subscriptionId, {
			subscriptionId,
			userId: u?.userId ?? null,
			email: u?.email ?? email ?? null,
			subscriptionType: subscriptionType ?? u?.subscriptionType ?? null,
			promo: promoSubs.has(subscriptionId) || !!u?.usedPartnerCode
		});
	};
	for (const u of fromUsers) {
		add(u.current, u, u.subscriptionType);
		add(u.last, u, u.subscriptionType);
	}
	for (const o of fromOrders) {
		const u = byEmail.get(o.email);
		add(
			o.type === 'subscription' ? o.providerRef : o.subscriptionId,
			u,
			o.subscriptionType,
			o.email
		);
	}
	return [...map.values()];
}
