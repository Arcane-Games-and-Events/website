/**
 * Members still on an Authorize.net ARB subscription: those not yet moved
 * to self-billing, or deliberately left (see migrate-arb.js). The daily
 * sync keeps their standing honest; cancelling really cancels the ARB.
 *
 * Rules that fix the old bugs:
 *  - Authorize.net spells it "canceled"; `arbGet` normalizes to "cancelled".
 *  - Premium is never re-granted without a paid period ahead.
 *  - `subscription_id` is never cleared while the ARB could still charge.
 *  - A member who cancelled locally while the ARB kept running has the
 *    ARB cancelled now, and an admin is told.
 */
import { and, eq, isNotNull, ne, notExists, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { subscription, user as userTable } from '$lib/server/db/schema.js';
import { authnet, AuthnetError } from '$lib/server/authnet/client.js';
import { bump } from '$lib/server/cache/index.js';
import { logMemberEvent, markVerified, recordPayment } from '$lib/server/payments/ledger.js';
import { addMonthsAnchored } from './dates.js';
import { sendAdminAlert, sendPaymentFailedEmail } from '$lib/server/email.js';
import { sendOnce } from './notices.js';

/** Users with an ARB id and no rows in the new system. */
export async function legacyMembers() {
	return db
		.select()
		.from(userTable)
		.where(
			and(
				isNotNull(userTable.subscriptionId),
				ne(sql`coalesce(${userTable.subscriptionStatus}, '')`, 'expired'),
				notExists(
					db
						.select({ one: sql`1` })
						.from(subscription)
						.where(eq(subscription.userId, userTable.id))
				)
			)
		);
}

const periodMonths = (type) => (type === 'yearly' ? 12 : type === 'weekly_test' ? 0 : 1);
function nextFrom(date, type) {
	const d = new Date(date);
	if (type === 'weekly_test') return new Date(d.getTime() + 7 * 86400000);
	return addMonthsAnchored(d, periodMonths(type), d.getUTCDate());
}

/**
 * Bring one legacy member's mirror columns in line with their ARB.
 * Returns what changed, for the sync report.
 */
export async function syncLegacyMember(u, { now = new Date() } = {}) {
	const arb = await authnet.arbGet(u.subscriptionId);
	if (!arb) {
		// Authorize.net has no such subscription: nothing can charge them.
		if (u.subscriptionStatus !== 'expired') {
			await db
				.update(userTable)
				.set({
					subscriptionStatus: 'expired',
					role: u.role === 'admin' ? 'admin' : u.compReason ? 'premium' : 'free',
					nextBillingDate: null,
					subscriptionId: null
				})
				.where(eq(userTable.id, u.id));
			await logMemberEvent({
				userId: u.id,
				kind: 'expired',
				subscriptionId: u.subscriptionId,
				subscriptionType: u.subscriptionType,
				meta: { authnetStatus: 'missing' }
			});
			await bump(`user:${u.id}`, 'users');
			return { changed: true, to: 'expired', note: 'ARB not found' };
		}
		return { changed: false };
	}

	const txs = [...(arb.transactions || [])].sort(
		(a, b) => (b.payNum || 0) - (a.payNum || 0) || (b.attemptNum || 0) - (a.attemptNum || 0)
	);
	const latest = txs[0] || null;
	const lastApproved = txs.find((t) => t.approved) || null;
	const set = {};
	let event = null;

	if (arb.status === 'active') {
		if (u.subscriptionStatus === 'cancelled') {
			// The orphan case: cancelled here, still charging there.
			try {
				await authnet.arbCancel(arb.id);
				await sendAdminAlert('Cancelled an ARB that was still charging', [
					`${u.email} cancelled on the site but ARB ${arb.id} was still active. It has now been cancelled. Check the member's charges after ${u.subscriptionEndDate?.toISOString?.() || 'their cancellation'} for refunds.`
				]);
			} catch (err) {
				await sendAdminAlert('Could not cancel an orphan ARB', [
					`${u.email}: ARB ${arb.id} is active although the member cancelled. Cancelling it failed: ${err.message}`
				]);
			}
			return { changed: false, note: 'orphan ARB cancelled' };
		}
		if (lastApproved?.submittedAt) {
			const next = nextFrom(lastApproved.submittedAt, u.subscriptionType);
			if (!u.nextBillingDate || Math.abs(next - new Date(u.nextBillingDate)) > 3600000)
				set.nextBillingDate = next;
		}
		if (latest && !latest.approved) {
			// The last attempt failed: a week of grace from that attempt.
			const grace = new Date(new Date(latest.submittedAt || now).getTime() + 7 * 86400000);
			if (u.subscriptionStatus !== 'payment_failed') {
				set.subscriptionStatus = 'payment_failed';
				set.subscriptionEndDate = grace;
				event = 'payment_failed';
			} else if (!u.subscriptionEndDate) {
				set.subscriptionEndDate = grace;
			}
			if (
				now >= new Date(set.subscriptionEndDate || u.subscriptionEndDate || grace) &&
				u.role === 'premium'
			) {
				// Grace is over. The ARB will keep retrying; stop it.
				try {
					await authnet.arbCancel(arb.id);
				} catch {
					/* reported below */
				}
				set.role = u.compReason ? 'premium' : 'free';
				set.subscriptionStatus = 'expired';
				set.subscriptionId = null;
				event = 'expired';
			}
		} else if (lastApproved && latest?.approved) {
			// Paid up: a paying member is premium, with a date ahead of them.
			const paidThrough = set.nextBillingDate || u.nextBillingDate;
			if (paidThrough && new Date(paidThrough) > now) {
				if (u.subscriptionStatus !== 'active') {
					set.subscriptionStatus = 'active';
					set.subscriptionEndDate = null;
				}
				if (u.role !== 'premium' && u.role !== 'admin') set.role = 'premium';
			}
		}
	} else if (arb.status === 'suspended') {
		if (u.subscriptionStatus !== 'payment_failed') {
			set.subscriptionStatus = 'payment_failed';
			set.subscriptionEndDate = new Date(
				new Date(latest?.submittedAt || now).getTime() + 7 * 86400000
			);
			event = 'payment_failed';
		}
	} else {
		// cancelled | expired | terminated: nothing more will be charged.
		const paidThrough =
			u.nextBillingDate ||
			(lastApproved?.submittedAt ? nextFrom(lastApproved.submittedAt, u.subscriptionType) : null);
		if (paidThrough && new Date(paidThrough) > now) {
			if (u.subscriptionStatus !== 'cancelled') {
				set.subscriptionStatus = 'cancelled';
				set.subscriptionEndDate = paidThrough;
				set.nextBillingDate = null;
				event = 'cancelled';
			}
		} else if (u.subscriptionStatus !== 'expired') {
			set.subscriptionStatus = 'expired';
			set.subscriptionId = null; // the ARB is dead; safe to clear
			set.nextBillingDate = null;
			if (u.role === 'premium') set.role = u.compReason ? 'premium' : 'free';
			event = 'expired';
		}
	}

	// Ledger: every approved charge, confirmed.
	const ids = [];
	for (const t of txs.filter((t) => t.approved && t.transId)) {
		await recordPayment({
			transId: t.transId,
			kind: Number(t.payNum) === 1 && !u.usedPartnerCode ? 'sub_first' : 'sub_renewal',
			amount: (arb.amountCents || 0) / 100,
			userId: u.id,
			userEmail: u.email,
			subscriptionId: u.subscriptionId,
			subscriptionType: u.subscriptionType || null,
			payNum: Number(t.payNum) || null,
			occurredAt: t.submittedAt || now,
			source: 'sync',
			verifiedAt: now
		});
		ids.push(t.transId);
	}
	await markVerified(ids);

	if (Object.keys(set).length === 0) return { changed: false };
	await db.update(userTable).set(set).where(eq(userTable.id, u.id));
	await bump(`user:${u.id}`, 'users');
	if (event) {
		await logMemberEvent({
			userId: u.id,
			kind: event,
			subscriptionId: u.subscriptionId,
			subscriptionType: u.subscriptionType,
			meta: { authnetStatus: arb.status, legacy: true }
		});
		if (event === 'payment_failed') {
			await sendOnce(
				'legacy_payment_failed',
				`${u.subscriptionId}:${latest?.transId || now.toISOString().slice(0, 10)}`,
				u.id,
				() =>
					sendPaymentFailedEmail(u.email, {
						attempt: 1,
						nextAttemptAt: null,
						graceUntil: set.subscriptionEndDate,
						amountCents: arb.amountCents || 0,
						lastFour: arb.card?.lastFour
					})
			);
		}
	}
	return {
		changed: true,
		to: set.subscriptionStatus || u.subscriptionStatus,
		set: Object.keys(set)
	};
}

/**
 * Cancel a legacy member's ARB and mark them cancelled, access to the end
 * of what they paid for. Used until every member is migrated.
 */
export async function cancelLegacyMembership(u, { actorId = null } = {}) {
	if (!u.subscriptionId) return { ok: false, error: 'No subscription on file.' };
	try {
		await authnet.arbCancel(u.subscriptionId);
	} catch (err) {
		if (!(err instanceof AuthnetError) || err.unknown) {
			return {
				ok: false,
				error: `Authorize.net could not be reached (${err.message}). Nothing was changed; try again.`
			};
		}
		return { ok: false, error: `Authorize.net: ${err.message}` };
	}
	const now = new Date();
	let accessUntil = u.nextBillingDate ? new Date(u.nextBillingDate) : null;
	if (!accessUntil || accessUntil < now)
		accessUntil = nextFrom(u.subscriptionStartDate || now, u.subscriptionType);
	if (accessUntil < now) accessUntil = now;
	await db
		.update(userTable)
		.set({
			subscriptionStatus: 'cancelled',
			subscriptionEndDate: accessUntil,
			nextBillingDate: null
		})
		.where(eq(userTable.id, u.id));
	await logMemberEvent({
		userId: u.id,
		kind: 'cancelled',
		subscriptionId: u.subscriptionId,
		subscriptionType: u.subscriptionType,
		actorId,
		meta: { accessUntil, legacy: true }
	});
	await bump(`user:${u.id}`, 'users');
	return { ok: true, accessUntil };
}
