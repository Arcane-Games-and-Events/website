/**
 * Moving members off Authorize.net ARB.
 *
 * `scanArbs` reads every ARB subscription Authorize.net knows about (and
 * every id our database remembers), matches each to a member, works out
 * what it has charged and when it charges next, and files it in
 * `legacy_arb` with a classification. Nothing else changes.
 *
 * `migrateArb` moves one approved member: a `subscription` row with the
 * ARB's id as its `ref`, its real price and its next billing date; the
 * card behind the ARB saved; access recomputed; and only after that is
 * committed, the ARB cancelled. If no card profile can be found the ARB is
 * left running and the member is flagged, so no one is ever left paying
 * nothing and no one is ever charged twice.
 */
import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	legacyArb,
	memberReferral,
	order as orderTable,
	payment,
	subscription,
	subscriptionInvoice,
	user as userTable
} from '$lib/server/db/schema.js';
import {
	authnet,
	AuthnetError,
	cardTypeLabel,
	parseExpiration
} from '$lib/server/authnet/client.js';
import { bump } from '$lib/server/cache/index.js';
import { logMemberEvent, recordPayment } from '$lib/server/payments/ledger.js';
import { upsertCard } from '$lib/server/payments/cards.js';
import { listPriceCents } from './plans.js';
import { addMonthsAnchored, addDays, addHours } from './dates.js';
import { applyAccess } from './access.js';
import { sendAdminAlert } from '$lib/server/email.js';

const MIGRATABLE = new Set(['migrate', 'migrate_past_due', 'migrate_cancelled', 'comp_and_paying']);
const TEST_EMAIL = /@(seed\.age\.test|example\.com|test\.com)$/i;

// ---------------------------------------------------------------- scan

/** Every ARB id worth looking at: Authorize.net's lists plus our records. */
export async function collectArbIds() {
	const ids = new Set();
	for (const status of ['active', 'inactive']) {
		let offset = 1;
		for (;;) {
			const page = await authnet.arbList({ status, offset, limit: 1000 });
			for (const s of page.subscriptions) ids.add(s.id);
			if (page.subscriptions.length < 1000) break;
			offset += 1000;
		}
	}
	const known = await db.execute(sql`
		select subscription_id as id from "user" where subscription_id ~ '^\\d+$'
		union select last_subscription_id from "user" where last_subscription_id ~ '^\\d+$'
		union select meta->>'subscriptionId' from "order" where meta->>'subscriptionId' ~ '^\\d+$'
		union select subscription_id from payment where subscription_id ~ '^\\d+$'
	`);
	for (const r of known.rows || known) if (r.id) ids.add(String(r.id));
	return [...ids].sort((a, b) => Number(a) - Number(b));
}

/**
 * Scan a batch of ARB ids. Returns a cursor for the next call.
 * @param {{ cursor?: number, limit?: number, ids?: string[] }} opts
 */
export async function scanArbs({ cursor = 0, limit = 20, ids = null } = {}) {
	const all = ids || (await collectArbIds());
	const batch = all.slice(cursor, cursor + limit);
	const out = {
		total: all.length,
		cursor,
		processed: 0,
		nextCursor: cursor + batch.length < all.length ? cursor + batch.length : null,
		rows: []
	};
	for (const id of batch) {
		try {
			const row = await scanOne(id);
			out.rows.push({
				id,
				classification: row.classification,
				flags: row.flags,
				userId: row.userId
			});
		} catch (err) {
			console.error(`[migrate-arb] scan ${id} failed:`, err?.message || err);
			await db
				.insert(legacyArb)
				.values({
					arbId: id,
					error: err?.message || String(err),
					classification: 'error',
					scannedAt: new Date()
				})
				.onConflictDoUpdate({
					target: legacyArb.arbId,
					set: { error: err?.message || String(err), scannedAt: new Date() }
				});
			out.rows.push({ id, classification: 'error', error: err?.message });
		}
		out.processed++;
	}
	return out;
}

/** Read one ARB, match it, classify it, and store the result. */
export async function scanOne(arbId) {
	const now = new Date();
	const arb = await authnet.arbGet(arbId);
	const [existing] = await db.select().from(legacyArb).where(eq(legacyArb.arbId, arbId)).limit(1);
	if (!arb) {
		const row = {
			arbId,
			arbStatus: 'missing',
			classification: 'inactive',
			flags: ['not_found'],
			scannedAt: now,
			error: null
		};
		await upsertLegacy(row, existing);
		return row;
	}

	const txs = [...arb.transactions].sort(
		(a, b) => (b.payNum || 0) - (a.payNum || 0) || (b.attemptNum || 0) - (a.attemptNum || 0)
	);
	const approved = txs.filter((t) => t.approved);
	const lastApproved = approved[0] || null;
	const latest = txs[0] || null;
	const lastDeclined = txs.find((t) => !t.approved) || null;
	const payCount = approved.length ? Math.max(...approved.map((t) => t.payNum || 0)) : 0;

	const { user, method } = await matchUser(arbId, arb);
	const plan = planOf(arb);
	const next = nextBillingDate(arb, payCount, now);
	const paidThrough = payCount > 0 ? next : null;

	// Classification.
	const flags = [];
	let classification;
	const [already] = await db
		.select({ id: subscription.id, legacyArbId: subscription.legacyArbId })
		.from(subscription)
		.where(eq(subscription.legacyArbId, arbId))
		.limit(1);
	const userRows = user
		? await db
				.select({
					id: subscription.id,
					status: subscription.status,
					legacyArbId: subscription.legacyArbId
				})
				.from(subscription)
				.where(and(eq(subscription.userId, user.id), ne(subscription.status, 'ended')))
		: [];
	const isTest =
		plan === 'test' ||
		(user && (TEST_EMAIL.test(user.email) || user.subscriptionType === 'weekly_test')) ||
		(!user && TEST_EMAIL.test(arb.email || ''));

	if (already) {
		classification = 'migrated';
	} else if (isTest) {
		classification = 'test';
	} else if (arb.status !== 'active' && arb.status !== 'suspended') {
		classification =
			user && paidThrough && paidThrough > now && !userRows.length
				? 'migrate_cancelled'
				: 'inactive';
	} else if (!user) {
		classification = 'orphan_unmatched';
	} else if (userRows.length) {
		// The member already has a live membership in the new system from a
		// different ARB (or a fresh signup): this one is a leftover.
		classification = 'duplicate';
	} else if (
		user.subscriptionId &&
		user.subscriptionId !== arbId &&
		['active', 'payment_failed'].includes(user.subscriptionStatus || '')
	) {
		classification = 'duplicate';
	} else if (
		user.subscriptionStatus === 'cancelled' ||
		user.subscriptionStatus === 'expired' ||
		(user.role !== 'premium' && user.role !== 'admin')
	) {
		classification = 'orphan_lapsed';
	} else if (user.compReason && user.role === 'premium' && !user.subscriptionId) {
		classification = 'comp_and_paying';
	} else if (
		arb.status === 'suspended' ||
		user.subscriptionStatus === 'payment_failed' ||
		(latest && !latest.approved)
	) {
		classification = 'migrate_past_due';
	} else {
		classification = 'migrate';
	}

	if (method === 'profile_email') flags.push('weak_match');
	if (user && user.subscriptionStatus == null && user.subscriptionId)
		flags.push('legacy_null_status');
	if (!arb.customerProfileId || !arb.paymentProfileId) flags.push('no_profile');
	if (
		plan !== 'test' &&
		arb.amountCents != null &&
		arb.amountCents !== listPriceCents(plan === 'yearly' ? 'yearly' : 'monthly')
	) {
		flags.push(
			arb.amountCents === 500 && plan === 'yearly' ? 'yearly_partner_5' : 'price_nonstandard'
		);
	}
	if (user && user.subscriptionType && plan !== 'test' && user.subscriptionType !== plan)
		flags.push('plan_mismatch');
	if (
		user?.nextBillingDate &&
		next &&
		Math.abs(new Date(user.nextBillingDate) - next) > 2 * 86400000
	)
		flags.push('date_mismatch');
	if (arb.status === 'active' && next && next < addDays(now, -1)) flags.push('schedule_behind');
	const exp = parseExpiration(arb.card?.expiration);
	if (exp && Date.UTC(exp.year, exp.month, 1) <= now.getTime()) flags.push('card_expired');
	if (user) {
		const [{ n }] = await db
			.select({ n: sql`count(*)::int` })
			.from(memberReferral)
			.where(
				and(eq(memberReferral.referrerUserId, user.id), eq(memberReferral.status, 'reward_earned'))
			);
		if (Number(n) > 0) flags.push('reward_backlog');
	}

	// Charges taken after the member thought they had stopped paying.
	let chargesAfterCancel = null;
	if (classification === 'orphan_lapsed' && user) {
		const since = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
		const after = approved.filter((t) => t.submittedAt && (!since || t.submittedAt > since));
		chargesAfterCancel = after.map((t) => ({
			transId: t.transId,
			at: t.submittedAt,
			amountCents: arb.amountCents,
			payNum: t.payNum
		}));
	} else if (classification === 'duplicate' && user) {
		const current = user.subscriptionStartDate ? new Date(user.subscriptionStartDate) : null;
		const after = approved.filter((t) => t.submittedAt && (!current || t.submittedAt > current));
		chargesAfterCancel = after.map((t) => ({
			transId: t.transId,
			at: t.submittedAt,
			amountCents: arb.amountCents,
			payNum: t.payNum
		}));
	}

	const row = {
		arbId,
		arbStatus: arb.status,
		name: arb.name,
		amountCents: arb.amountCents,
		intervalLength: arb.interval.length,
		intervalUnit: arb.interval.unit,
		startDate: arb.startDate ? String(arb.startDate).slice(0, 10) : null,
		totalOccurrences: arb.totalOccurrences,
		customerProfileId: arb.customerProfileId,
		paymentProfileId: arb.paymentProfileId,
		cardLastFour: arb.card?.lastFour || null,
		cardType: arb.card?.type || null,
		cardExpiration: arb.card?.expiration || null,
		profileEmail: arb.email,
		payCount,
		lastApprovedAt: lastApproved?.submittedAt || null,
		lastApprovedTransId: lastApproved?.transId || null,
		lastDeclinedAt: lastDeclined?.submittedAt || null,
		nextBillingDate: next,
		userId: user?.id || null,
		matchMethod: method,
		classification,
		flags,
		chargesAfterCancel,
		raw: { ...arb.raw, _plan: plan },
		scannedAt: now,
		error: null
	};
	await upsertLegacy(row, existing, user);
	return row;
}

async function upsertLegacy(row, existing, user = null) {
	const decision =
		existing?.decision ??
		(row.classification === 'migrate' && row.flags.length === 0 ? 'approve' : null);
	const values = {
		...row,
		decision,
		userBefore: existing?.userBefore ?? (user ? snapshotUser(user) : null)
	};
	if (existing?.decision === 'assign' && existing.userId) {
		values.userId = existing.userId;
		values.matchMethod = 'manual';
	}
	await db
		.insert(legacyArb)
		.values(values)
		.onConflictDoUpdate({
			target: legacyArb.arbId,
			set: Object.fromEntries(
				Object.entries(values).filter(
					([k]) =>
						![
							'arbId',
							'decidedBy',
							'decidedAt',
							'subscriptionId',
							'migratedAt',
							'cancelledAt'
						].includes(k)
				)
			)
		});
}

const snapshotUser = (u) => ({
	id: u.id,
	email: u.email,
	role: u.role,
	subscriptionId: u.subscriptionId,
	subscriptionType: u.subscriptionType,
	subscriptionStatus: u.subscriptionStatus,
	subscriptionStartDate: u.subscriptionStartDate,
	subscriptionEndDate: u.subscriptionEndDate,
	nextBillingDate: u.nextBillingDate,
	compReason: u.compReason,
	customerProfileId: u.customerProfileId,
	usedPartnerCode: u.usedPartnerCode
});

/** Find the member an ARB belongs to. */
async function matchUser(arbId, arb) {
	const one = async (where) => (await db.select().from(userTable).where(where).limit(1))[0] || null;
	let u = await one(eq(userTable.subscriptionId, arbId));
	if (u) return { user: u, method: 'subscription_id' };
	u = await one(eq(userTable.lastSubscriptionId, arbId));
	if (u) return { user: u, method: 'last_subscription_id' };
	const [ord] = await db
		.select({ userId: orderTable.userId, email: orderTable.userEmail })
		.from(orderTable)
		.where(sql`${orderTable.meta}->>'subscriptionId' = ${arbId}`)
		.limit(1);
	if (ord) {
		u = ord.userId
			? await one(eq(userTable.id, ord.userId))
			: ord.email
				? await one(sql`lower(${userTable.email}) = lower(${ord.email})`)
				: null;
		if (u) return { user: u, method: 'order_email' };
	}
	const [pay] = await db
		.select({ userId: payment.userId })
		.from(payment)
		.where(and(eq(payment.subscriptionId, arbId), sql`${payment.userId} is not null`))
		.limit(1);
	if (pay?.userId) {
		u = await one(eq(userTable.id, pay.userId));
		if (u) return { user: u, method: 'payment' };
	}
	if (arb.email) {
		u = await one(sql`lower(${userTable.email}) = lower(${arb.email})`);
		if (u) return { user: u, method: 'profile_email' };
	}
	return { user: null, method: null };
}

/** 'monthly' | 'yearly' | 'test' from the ARB's interval. */
export function planOf(arb) {
	const { length, unit } = arb.interval || {};
	if (unit === 'months' && length === 12) return 'yearly';
	if (unit === 'months' && length === 1) return 'monthly';
	return 'test';
}

/** When the ARB charges next: start + payments × interval, on the start day. */
export function nextBillingDate(arb, payCount, now = new Date()) {
	if (!arb.startDate) return null;
	const start = new Date(String(arb.startDate).slice(0, 10) + 'T00:00:00Z');
	if (Number.isNaN(start.getTime())) return null;
	const { length, unit } = arb.interval || {};
	if (unit === 'days') return new Date(start.getTime() + payCount * (length || 7) * 86400000);
	if (payCount === 0) return start;
	void now;
	return addMonthsAnchored(start, payCount * (length || 1), start.getUTCDate());
}

// ---------------------------------------------------------------- decisions

export async function decideArb(arbId, decision, { actorId, userId = null } = {}) {
	if (!['approve', 'skip', 'cancel', 'assign'].includes(decision))
		return { ok: false, error: 'Unknown decision' };
	const set = { decision, decidedBy: actorId, decidedAt: new Date() };
	if (decision === 'assign') {
		if (!userId) return { ok: false, error: 'Choose a member' };
		const [u] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.id, userId))
			.limit(1);
		if (!u) return { ok: false, error: 'Member not found' };
		set.userId = userId;
		set.matchMethod = 'manual';
		set.classification = 'migrate';
	}
	await db.update(legacyArb).set(set).where(eq(legacyArb.arbId, arbId));
	return { ok: true };
}

/** Cancel an ARB that should not be charging anyone. */
export async function cancelArb(arbId, { actorId } = {}) {
	try {
		const r = await authnet.arbCancel(arbId);
		await db
			.update(legacyArb)
			.set({
				cancelledAt: new Date(),
				decision: 'cancel',
				decidedBy: actorId,
				decidedAt: new Date(),
				arbStatus: 'cancelled',
				error: null
			})
			.where(eq(legacyArb.arbId, arbId));
		return { ok: true, already: r.already };
	} catch (err) {
		await db
			.update(legacyArb)
			.set({ error: `cancel failed: ${err.message}` })
			.where(eq(legacyArb.arbId, arbId));
		return { ok: false, error: err.message };
	}
}

// ---------------------------------------------------------------- migrate

/**
 * Migrate one member. Re-runnable: a second call finds the subscription
 * row and only retries the ARB cancellation if it is still pending.
 *
 * @param {string} arbId
 * @param {{ actorId?: string|null, profileOverride?: { customerProfileId: string, paymentProfileId: string, savedCardId?: string|null } | null }} opts
 */
export async function migrateArb(arbId, { actorId = null, profileOverride = null } = {}) {
	const now = new Date();
	const [row] = await db.select().from(legacyArb).where(eq(legacyArb.arbId, arbId)).limit(1);
	if (!row) return { ok: false, error: 'Scan this subscription first.' };

	// Already done? Finish the cancellation if that part failed.
	const [done] = await db
		.select()
		.from(subscription)
		.where(eq(subscription.legacyArbId, arbId))
		.limit(1);
	if (done) {
		if (!done.legacyArbCancelledAt) return finishCancel(done, row);
		return { ok: true, already: true, subscriptionId: done.id };
	}

	if (!MIGRATABLE.has(row.classification))
		return { ok: false, error: `Not migratable (${row.classification}).` };
	if (row.decision !== 'approve' && row.decision !== 'assign')
		return { ok: false, error: 'Needs an admin decision first.' };
	if (!row.userId) return { ok: false, error: 'No member matched.' };

	const [u] = await db.select().from(userTable).where(eq(userTable.id, row.userId)).limit(1);
	if (!u) return { ok: false, error: 'Member not found.' };
	const [live] = await db
		.select({ id: subscription.id })
		.from(subscription)
		.where(and(eq(subscription.userId, u.id), ne(subscription.status, 'ended')))
		.limit(1);
	if (live)
		return { ok: false, error: 'This member already has a live membership in the new system.' };

	// Fresh read: the picture may have changed since the scan.
	const arb = await authnet.arbGet(arbId);
	if (!arb) return { ok: false, error: 'Authorize.net no longer has this subscription.' };
	const plan = planOf(arb);
	if (plan === 'test') return { ok: false, error: 'Test-plan subscription; not migrated.' };
	const approved = arb.transactions
		.filter((t) => t.approved)
		.sort((a, b) => (b.payNum || 0) - (a.payNum || 0));
	const lastApproved = approved[0] || null;
	const latest =
		[...arb.transactions].sort(
			(a, b) => (b.payNum || 0) - (a.payNum || 0) || (b.attemptNum || 0) - (a.attemptNum || 0)
		)[0] || null;
	const payCount = approved.length ? Math.max(...approved.map((t) => t.payNum || 0)) : 0;
	const next = nextBillingDate(arb, payCount, now);
	const months = plan === 'yearly' ? 12 : 1;
	const anchorDay = next ? next.getUTCDate() : now.getUTCDate();

	// The card.
	let customerProfileId = profileOverride?.customerProfileId || arb.customerProfileId || null;
	let paymentProfileId = profileOverride?.paymentProfileId || arb.paymentProfileId || null;
	let profile = null;
	if (customerProfileId && paymentProfileId) {
		try {
			profile = await authnet.getPaymentProfile(customerProfileId, paymentProfileId);
		} catch (err) {
			if (err instanceof AuthnetError && err.unknown)
				return { ok: false, error: `Authorize.net unreachable: ${err.message}` };
		}
	}
	if (!profile && lastApproved?.transId && !profileOverride) {
		try {
			const made = await authnet.createProfileFromTransaction({
				transId: lastApproved.transId,
				customerProfileId: u.customerProfileId || undefined,
				merchantCustomerId: u.id,
				email: u.email,
				description: `${u.firstName} ${u.lastName}`
			});
			customerProfileId = made.customerProfileId;
			paymentProfileId = made.paymentProfileId;
			if (!paymentProfileId) {
				const cp = await authnet.getCustomerProfile(customerProfileId);
				const match =
					cp?.paymentProfiles.find((p) => p.lastFour === arb.card?.lastFour) ||
					cp?.paymentProfiles[0];
				paymentProfileId = match?.paymentProfileId || null;
			}
			if (paymentProfileId)
				profile = await authnet.getPaymentProfile(customerProfileId, paymentProfileId);
		} catch (err) {
			console.warn(`[migrate-arb] profile from transaction failed for ${arbId}:`, err?.message);
		}
	}
	if (!profile) {
		await db
			.update(legacyArb)
			.set({
				flags: sql`array_append(array_remove(${legacyArb.flags}, 'no_profile'), 'no_profile')`,
				error:
					'No card profile could be found or created; ARB left running. The member must add a card.'
			})
			.where(eq(legacyArb.arbId, arbId));
		return {
			ok: false,
			error: 'No card profile; ARB left running. The member will be asked to add a card.',
			needsCard: true
		};
	}

	// Status and dates.
	const arbActive = arb.status === 'active' || arb.status === 'suspended';
	const paidThrough = payCount > 0 ? next : null;
	let status;
	let currentPeriodEnd = paidThrough || next || addMonthsAnchored(now, months, anchorDay);
	const currentPeriodStart = addMonthsAnchored(currentPeriodEnd, -months, anchorDay);
	const dunning = {};
	if (!arbActive) {
		status = 'cancelled';
		if (currentPeriodEnd <= now)
			return {
				ok: false,
				error: 'This subscription is over and its paid period has ended; nothing to migrate.'
			};
	} else if (
		arb.status === 'suspended' ||
		(latest && !latest.approved) ||
		u.subscriptionStatus === 'payment_failed'
	) {
		status = 'past_due';
		dunning.failedAttempts = 1;
		dunning.firstFailedAt = now;
		dunning.nextAttemptAt = addDays(now, 1);
		dunning.graceUntil = addHours(addDays(now, 7), 2);
	} else {
		status = 'active';
		if (currentPeriodEnd <= now) {
			// The ARB should have charged by now and hasn't: bill from today.
			currentPeriodEnd = addHours(now, 1);
		}
	}

	// Price: the member keeps what the ARB charged, unless that was a
	// mistake (a yearly plan at the $5 partner first charge).
	const list = listPriceCents(plan);
	let priceCents = arb.amountCents ?? list;
	const flags = [...(row.flags || []), 'migrated'];
	if (priceCents < list / 2) {
		priceCents = list;
		flags.push('price_reset');
	}

	// Write it all.
	const result = await db.transaction(async (tx) => {
		const [sub] = await tx
			.insert(subscription)
			.values({
				ref: arbId,
				userId: u.id,
				plan,
				priceCents,
				anchorDay,
				status,
				startedAt: arb.startDate
					? new Date(String(arb.startDate).slice(0, 10) + 'T00:00:00Z')
					: u.subscriptionStartDate || now,
				currentPeriodStart,
				currentPeriodEnd,
				nextChargeAt: status === 'active' ? currentPeriodEnd : null,
				cancelledAt: status === 'cancelled' ? u.subscriptionEndDate || now : null,
				customerProfileId,
				paymentProfileId,
				promoCode: u.usedPartnerCode || null,
				legacyArbId: arbId,
				migratedAt: now,
				flags,
				...dunning
			})
			.returning();

		// The current (or last) paid period, so history and refunds line up.
		if (lastApproved) {
			const [taken] = await tx
				.select({ id: subscriptionInvoice.id })
				.from(subscriptionInvoice)
				.where(eq(subscriptionInvoice.transId, lastApproved.transId))
				.limit(1);
			await tx.insert(subscriptionInvoice).values({
				subscriptionId: sub.id,
				seq: Math.max(1, payCount),
				kind: 'migrated',
				plan,
				periodStart: currentPeriodStart,
				periodEnd: currentPeriodEnd,
				listCents: list,
				discountCents: Math.max(0, list - (arb.amountCents ?? list)),
				amountCents: arb.amountCents ?? list,
				status: status === 'past_due' ? 'paid' : 'paid',
				invoiceNumber: null,
				attempts: 1,
				transId: taken ? null : lastApproved.transId,
				paidAt: lastApproved.submittedAt || now
			});
			await recordPayment(
				{
					transId: lastApproved.transId,
					kind: payCount === 1 && !u.usedPartnerCode ? 'sub_first' : 'sub_renewal',
					amount: (arb.amountCents ?? list) / 100,
					userId: u.id,
					userEmail: u.email,
					subscriptionId: arbId,
					subscriptionType: plan,
					payNum: payCount || null,
					occurredAt: lastApproved.submittedAt || now,
					source: 'sync',
					verifiedAt: now
				},
				{ tx }
			);
		}
		if (status === 'past_due') {
			// The period that failed to bill, waiting for a retry.
			await tx.insert(subscriptionInvoice).values({
				subscriptionId: sub.id,
				seq: Math.max(1, payCount) + 1,
				kind: 'renewal',
				plan,
				periodStart: currentPeriodEnd,
				periodEnd: addMonthsAnchored(currentPeriodEnd, months, anchorDay),
				listCents: priceCents,
				discountCents: 0,
				amountCents: priceCents,
				status: 'failed',
				lastError: 'declined before migration'
			});
		}

		// The card, mirrored.
		profile.cardType = cardTypeLabel(profile.cardType);
		const card = await upsertCard(
			{ userId: u.id, customerProfileId, profile, source: 'migration' },
			tx
		);
		await tx.update(subscription).set({ savedCardId: card.id }).where(eq(subscription.id, sub.id));
		if (!u.customerProfileId)
			await tx.update(userTable).set({ customerProfileId }).where(eq(userTable.id, u.id));

		await tx
			.update(legacyArb)
			.set({
				subscriptionId: sub.id,
				migratedAt: now,
				error: null,
				userBefore: row.userBefore || snapshotUser(u)
			})
			.where(eq(legacyArb.arbId, arbId));
		await logMemberEvent(
			{
				userId: u.id,
				kind: 'migrated',
				subscriptionId: arbId,
				subscriptionType: plan,
				actorId,
				at: now,
				meta: { status, priceCents, currentPeriodEnd, flags }
			},
			{ tx }
		);
		await applyAccess(u.id, { tx });
		return sub;
	});
	await bump(`user:${u.id}`, 'users');

	// Only now, with the member safely on the new system, stop the ARB.
	const cancel = await finishCancel(result, row);

	// Did the ARB charge between the read above and the cancellation?
	try {
		const again = await authnet.arbGet(arbId);
		const newer = (again?.transactions || [])
			.filter((t) => t.approved && (t.payNum || 0) > payCount)
			.sort((a, b) => (a.payNum || 0) - (b.payNum || 0));
		for (const t of newer)
			await adoptLatePayment(result, t, { months, anchorDay, priceCents, plan, user: u });
	} catch (err) {
		console.warn(`[migrate-arb] post-cancel check failed for ${arbId}:`, err?.message);
	}
	return { ok: true, subscriptionId: result.id, status, cancelled: cancel.ok };
}

/** Cancel the ARB behind a migrated subscription and record it. */
async function finishCancel(sub, row) {
	try {
		const r = await authnet.arbCancel(sub.legacyArbId);
		const now = new Date();
		await db
			.update(subscription)
			.set({ legacyArbCancelledAt: now, updatedAt: now })
			.where(eq(subscription.id, sub.id));
		await db
			.update(legacyArb)
			.set({ cancelledAt: now, arbStatus: 'cancelled', error: null })
			.where(eq(legacyArb.arbId, sub.legacyArbId));
		return { ok: true, already: r.already };
	} catch (err) {
		await db
			.update(legacyArb)
			.set({ error: `cancel failed: ${err.message}` })
			.where(eq(legacyArb.arbId, sub.legacyArbId));
		await db
			.update(subscription)
			.set({
				flags: sql`array_append(array_remove(${subscription.flags}, 'arb_cancel_failed'), 'arb_cancel_failed')`
			})
			.where(eq(subscription.id, sub.id));
		await sendAdminAlert('ARB cancellation failed after migration', [
			`Subscription ${sub.ref} was migrated but ARB ${sub.legacyArbId} could not be cancelled: ${err.message}. Renewals stay blocked until it is. Retry from the migration page or cancel it in the Authorize.net dashboard, then mark it cancelled.`
		]);
		void row;
		return { ok: false, error: err.message };
	}
}

/** A payment the ARB took during migration counts as the next renewal. */
async function adoptLatePayment(sub, t, { months, anchorDay, priceCents, plan, user }) {
	const [known] = await db
		.select({ id: subscriptionInvoice.id })
		.from(subscriptionInvoice)
		.where(eq(subscriptionInvoice.transId, t.transId))
		.limit(1);
	if (known) return;
	const [fresh] = await db.select().from(subscription).where(eq(subscription.id, sub.id)).limit(1);
	const periodStart = fresh.currentPeriodEnd;
	const periodEnd = addMonthsAnchored(periodStart, months, anchorDay);
	const now = new Date();
	await db.transaction(async (tx) => {
		const [{ seq }] = await tx
			.select({ seq: sql`coalesce(max(${subscriptionInvoice.seq}), 0)::int + 1` })
			.from(subscriptionInvoice)
			.where(eq(subscriptionInvoice.subscriptionId, sub.id));
		await tx.insert(subscriptionInvoice).values({
			subscriptionId: sub.id,
			seq: Number(seq),
			kind: 'renewal',
			plan,
			periodStart,
			periodEnd,
			listCents: priceCents,
			discountCents: 0,
			amountCents: priceCents,
			status: 'paid',
			transId: t.transId,
			paidAt: t.submittedAt || now,
			attempts: 1
		});
		await tx
			.update(subscription)
			.set({
				status: 'active',
				currentPeriodStart: periodStart,
				currentPeriodEnd: periodEnd,
				nextChargeAt: periodEnd,
				failedAttempts: 0,
				firstFailedAt: null,
				nextAttemptAt: null,
				graceUntil: null,
				updatedAt: now
			})
			.where(eq(subscription.id, sub.id));
		await recordPayment(
			{
				transId: t.transId,
				kind: 'sub_renewal',
				amount: priceCents / 100,
				userId: user.id,
				userEmail: user.email,
				subscriptionId: sub.ref,
				subscriptionType: plan,
				payNum: t.payNum,
				occurredAt: t.submittedAt || now,
				source: 'sync',
				verifiedAt: now
			},
			{ tx }
		);
		await applyAccess(user.id, { tx });
	});
	await sendAdminAlert('ARB charged during migration; payment adopted', [
		`ARB ${sub.legacyArbId} charged transaction ${t.transId} while being migrated. It was recorded as the renewal for ${periodStart.toISOString().slice(0, 10)} – ${periodEnd.toISOString().slice(0, 10)}.`
	]);
}

/**
 * A legacy member flagged `no_profile` just saved a card: finish their
 * migration with it. Best effort; returns null when nothing applied.
 */
export async function completeLegacyMigration(userId, card) {
	const [row] = await db
		.select()
		.from(legacyArb)
		.where(
			and(
				eq(legacyArb.userId, userId),
				isNull(legacyArb.migratedAt),
				inArray(legacyArb.decision, ['approve', 'assign']),
				sql`'no_profile' = any(${legacyArb.flags})`
			)
		)
		.limit(1);
	if (!row) return null;
	return migrateArb(row.arbId, {
		profileOverride: {
			customerProfileId: card.customerProfileId,
			paymentProfileId: card.paymentProfileId,
			savedCardId: card.id
		}
	});
}

// ---------------------------------------------------------------- report

export async function migrationReport() {
	const r = (q) => db.execute(q).then((x) => (x.rows || x)[0] || {});
	const byClass = await db.execute(
		sql`select classification, decision, count(*) as n, count(*) filter (where migrated_at is not null) as migrated, count(*) filter (where cancelled_at is not null) as cancelled from legacy_arb group by 1, 2 order by 1, 2`
	);
	const legacyPaying = await r(
		sql`select count(*) as n, coalesce(sum(case when subscription_type = 'yearly' then 11000/12.0 else 1000 end), 0) as mrr_cents from "user" u where role = 'premium' and subscription_id is not null and subscription_status in ('active','payment_failed') and coalesce(subscription_type,'') <> 'weekly_test' and not exists (select 1 from subscription s where s.user_id = u.id)`
	);
	const newPaying = await r(
		sql`select count(*) as n, coalesce(sum(case when plan = 'yearly' then price_cents/12.0 else price_cents end), 0) as mrr_cents from subscription where status in ('active','past_due')`
	);
	const before = await r(
		sql`select count(*) as paying, coalesce(sum(case when subscription_type = 'yearly' then 11000/12.0 else 1000 end), 0) as mrr_cents from _bak_024_user where role = 'premium' and subscription_id is not null and subscription_status in ('active','payment_failed') and coalesce(subscription_type,'') <> 'weekly_test'`
	).catch(() => null);
	const invariants = await r(sql`
		select
			(select count(*) from payment) as payments, (select coalesce(sum(amount),0) from payment) as payment_sum,
			(select count(*) from "order") as orders, (select count(*) from ticket) as tickets,
			(select count(*) from member_event where kind not in ('migrated')) as member_events,
			(select count(*) from saved_card where status not in ('deleted')) as saved_cards,
			(select count(*) from "user" where role = 'premium' and subscription_id is null and comp_reason is not null) as comps`);
	const snapshot = await r(sql`
		select
			(select count(*) from _bak_024_payment) as payments, (select coalesce(sum(amount),0) from _bak_024_payment) as payment_sum,
			(select count(*) from _bak_024_order) as orders, (select count(*) from _bak_024_ticket) as tickets,
			(select count(*) from _bak_024_member_event) as member_events,
			(select count(*) from _bak_024_saved_card) as saved_cards,
			(select count(*) from _bak_024_user where role = 'premium' and subscription_id is null and comp_reason is not null) as comps`).catch(
		() => null
	);
	const arbs = await r(
		sql`select count(*) filter (where arb_status = 'active') as active_now, count(*) filter (where cancelled_at is not null) as cancelled, count(*) filter (where classification in ('orphan_lapsed','duplicate','orphan_unmatched') and cancelled_at is null) as orphans_open, count(*) filter (where migrated_at is null and classification in ('migrate','migrate_past_due','migrate_cancelled','comp_and_paying')) as pending, count(*) filter (where error is not null) as errors, coalesce(sum(jsonb_array_length(charges_after_cancel)) filter (where charges_after_cancel is not null), 0) as charges_to_review from legacy_arb`
	);
	const flagged = await db
		.select({
			arbId: legacyArb.arbId,
			userId: legacyArb.userId,
			classification: legacyArb.classification,
			flags: legacyArb.flags,
			error: legacyArb.error
		})
		.from(legacyArb)
		.where(sql`cardinality(${legacyArb.flags}) > 0 or ${legacyArb.error} is not null`)
		.orderBy(legacyArb.classification)
		.limit(200);
	return {
		byClass: (byClass.rows || byClass).map((x) => ({
			classification: x.classification,
			decision: x.decision,
			n: Number(x.n),
			migrated: Number(x.migrated),
			cancelled: Number(x.cancelled)
		})),
		members: {
			before: before
				? { paying: Number(before.paying), mrrCents: Math.round(Number(before.mrr_cents)) }
				: null,
			legacyNow: {
				paying: Number(legacyPaying.n),
				mrrCents: Math.round(Number(legacyPaying.mrr_cents))
			},
			newNow: { paying: Number(newPaying.n), mrrCents: Math.round(Number(newPaying.mrr_cents)) }
		},
		arbs: Object.fromEntries(Object.entries(arbs).map(([k, v]) => [k, Number(v)])),
		invariants: { now: numify(invariants), snapshot: snapshot ? numify(snapshot) : null },
		flagged
	};
}
const numify = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v)]));

// ---------------------------------------------------------------- break glass

/** Put a migrated member back on ARB from their stored card. Sandbox-tested only. */
export async function recreateArb(subscriptionId, { actorId } = {}) {
	const [sub] = await db
		.select()
		.from(subscription)
		.where(eq(subscription.id, subscriptionId))
		.limit(1);
	if (!sub || !sub.customerProfileId || !sub.paymentProfileId)
		return { ok: false, error: 'No card profile on this membership.' };
	const start =
		sub.nextChargeAt && new Date(sub.nextChargeAt) > new Date()
			? new Date(sub.nextChargeAt)
			: new Date(Date.now() + 86400000);
	const r = await authnet.arbCreateFromProfile({
		customerProfileId: sub.customerProfileId,
		paymentProfileId: sub.paymentProfileId,
		amountCents: sub.priceCents,
		intervalLength: sub.plan === 'yearly' ? 12 : 1,
		intervalUnit: 'months',
		startDate: start.toISOString().slice(0, 10),
		name: `AGE Premium ${sub.plan} (recreated)`
	});
	await db
		.update(subscription)
		.set({
			hold: true,
			flags: sql`array_append(${subscription.flags}, ${'arb_recreated:' + r.subscriptionId})`,
			updatedAt: new Date()
		})
		.where(eq(subscription.id, sub.id));
	await logMemberEvent({
		userId: sub.userId,
		kind: 'comped',
		subscriptionId: sub.ref,
		subscriptionType: sub.plan,
		reason: `ARB recreated as ${r.subscriptionId}; self-billing held`,
		actorId
	});
	return { ok: true, arbId: r.subscriptionId };
}

/** The sentinel: active ARBs that should not exist any more. */
export async function unexpectedActiveArbs() {
	const page = await authnet.arbList({ status: 'active', limit: 1000 });
	const ids = page.subscriptions.map((s) => s.id);
	if (ids.length === 0) return [];
	const rows = await db
		.select({
			arbId: legacyArb.arbId,
			decision: legacyArb.decision,
			classification: legacyArb.classification,
			migratedAt: legacyArb.migratedAt
		})
		.from(legacyArb)
		.where(inArray(legacyArb.arbId, ids));
	const known = new Map(rows.map((r) => [r.arbId, r]));
	const suspects = page.subscriptions.filter((s) => {
		const k = known.get(s.id);
		if (!k) return true; // never scanned
		if (k.migratedAt) return true; // should have been cancelled
		return k.decision === 'cancel' || ['orphan_lapsed', 'duplicate'].includes(k.classification);
	});
	// The list lags a cancellation by a little while; confirm each one.
	const confirmed = [];
	for (const s of suspects) {
		const live = await authnet.arbGet(s.id, { includeTransactions: false });
		if (live?.status === 'active' || live?.status === 'suspended') confirmed.push(s);
	}
	return confirmed.map((s) => ({
		id: s.id,
		name: s.name,
		amountCents: s.amountCents,
		status: known.get(s.id)?.classification || 'unscanned'
	}));
}
