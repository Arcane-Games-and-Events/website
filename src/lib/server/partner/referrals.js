/**
 * Teacher referrals: $10 for every new Premium member a teacher brings in.
 *
 * Teachers get a code in the existing partner programme (so the new member
 * still gets the partner discount on their first charge), plus a link,
 * /premium?ref=CODE, that remembers the code for 30 days in a cookie. A
 * signup is attributed to the teacher once, ever, and never to the
 * teacher themselves. Teachers are paid the bonus on the Partner ledger
 * instead of the partner programme's commission.
 *
 * The bonus is recorded once the member's first real payment (not a free
 * first month) is past the refund window and wasn't refunded.
 */
import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	memberReferralCode,
	partner,
	partnerAttribution,
	partnerLedger,
	payment,
	subscription,
	user as userTable
} from '$lib/server/db/schema.js';
import { isTeacher } from '$lib/server/auth/roles.js';
import { bump } from '$lib/server/cache/index.js';
import {
	REFERRAL_BONUS_CENTS,
	REFERRAL_COOKIE,
	REFERRAL_LINK_DAYS,
	REFERRAL_REFUND_WINDOW_DAYS
} from '$lib/academy/partner/terms.js';
import { normalizePartnerCode } from '$lib/server/partner-code.js';
import { monthOf } from './ledger.js';

const DAY = 86400000;
const CODE = /^[A-Z0-9_-]{3,32}$/;

/** Remember a teacher's link (?ref=CODE) for 30 days. Only the shape is checked here. */
export function rememberReferral(cookies, raw) {
	const code = normalizePartnerCode(raw);
	if (!CODE.test(code)) return;
	cookies.set(REFERRAL_COOKIE, code, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: REFERRAL_LINK_DAYS * 86400
	});
}

/** The code a link left behind, if any. */
export function rememberedReferral(cookies) {
	const code = normalizePartnerCode(cookies.get(REFERRAL_COOKIE));
	return CODE.test(code) ? code : null;
}

/** Is this partner a teacher (and so paid by the Partner ledger)? */
async function teacherBehind(partnerRow, tx = db) {
	if (!partnerRow?.userId) return null;
	const [u] = await tx.select().from(userTable).where(eq(userTable.id, partnerRow.userId)).limit(1);
	return u && isTeacher(u) ? u : null;
}

/**
 * At a new member's first charge (inside its transaction): attribute the
 * signup to the teacher whose code or link it came through. Returns true
 * when a teacher took it, so the partner commission isn't also paid.
 *
 * @param {any} tx
 * @param {{ user: any, quote: any, sub: any, at: Date }} signup
 */
export async function attributeSignup(tx, { user, quote, sub, at }) {
	if (quote.promoKind !== 'partner' || !quote.partner) return false;
	const teacher = await teacherBehind(quote.partner, tx);
	if (!teacher || teacher.id === user.id) return false;
	await tx
		.insert(partnerAttribution)
		.values({
			referredUserId: user.id,
			teacherId: teacher.id,
			partnerId: quote.partner.id,
			source: quote.referralSource === 'link' ? 'link' : 'code',
			code: quote.promoCode,
			subscriptionId: sub.id,
			attributedAt: at
		})
		.onConflictDoNothing();
	return true;
}

/** Is a code free in both code namespaces (partner and member referral)? */
async function codeFree(code) {
	const [p] = await db
		.select({ id: partner.id })
		.from(partner)
		.where(sql`upper(${partner.code}) = ${code}`)
		.limit(1);
	if (p) return false;
	const [m] = await db
		.select({ id: memberReferralCode.id })
		.from(memberReferralCode)
		.where(sql`upper(${memberReferralCode.code}) = ${code}`)
		.limit(1);
	return !m;
}

/**
 * A teacher's referral code, made the first time they need one: their
 * name in capitals (JANESMITH), with a number added if it's taken.
 */
export async function ensureTeacherCode(teacher) {
	const [row] = await db.select().from(partner).where(eq(partner.userId, teacher.id)).limit(1);
	if (row) return row;
	const base =
		normalizePartnerCode(`${teacher.firstName || ''}${teacher.lastName || ''}`)
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, 16) || 'TEACHER';
	let code = base.length >= 3 ? base : `${base}AGE`;
	for (let n = 2; !(await codeFree(code)); n++) code = `${base}${n}`;
	try {
		const [made] = await db
			.insert(partner)
			.values({ userId: teacher.id, code, isActive: true, payoutNotes: 'Teacher (Partner model)' })
			.returning();
		await bump(`user:${teacher.id}`);
		return made;
	} catch (err) {
		// Made at the same moment by another request.
		if (err?.code === '23505' || err?.cause?.code === '23505') {
			const [again] = await db
				.select()
				.from(partner)
				.where(eq(partner.userId, teacher.id))
				.limit(1);
			if (again) return again;
		}
		throw err;
	}
}

/** A teacher's referrals, newest first, for their dashboard. */
export async function teacherReferrals(teacherId) {
	return db
		.select({
			status: partnerAttribution.status,
			source: partnerAttribution.source,
			attributedAt: partnerAttribution.attributedAt,
			decidedAt: partnerAttribution.decidedAt,
			firstName: userTable.firstName
		})
		.from(partnerAttribution)
		.innerJoin(userTable, eq(partnerAttribution.referredUserId, userTable.id))
		.where(eq(partnerAttribution.teacherId, teacherId))
		.orderBy(sql`${partnerAttribution.attributedAt} desc`)
		.limit(100);
}

/**
 * Decide pending referrals: record the bonus once the member's first real
 * payment is past the refund window, or void the referral if that payment
 * was refunded or the membership ended without one.
 *
 * @returns {Promise<{ recorded: number, voided: number, waiting: number }>}
 */
export async function decideReferralBonuses({ now = new Date() } = {}) {
	const out = { recorded: 0, voided: 0, waiting: 0 };
	const pending = await db
		.select()
		.from(partnerAttribution)
		.where(eq(partnerAttribution.status, 'pending'))
		.orderBy(asc(partnerAttribution.attributedAt))
		.limit(500);
	for (const a of pending) {
		const [first] = await db
			.select()
			.from(payment)
			.where(
				and(
					eq(payment.userId, a.referredUserId),
					inArray(payment.kind, ['sub_first', 'sub_promo_first', 'sub_renewal']),
					gt(payment.amount, '0')
				)
			)
			.orderBy(asc(payment.occurredAt))
			.limit(1);
		let verdict = null;
		if (a.teacherId === a.referredUserId) verdict = { void: 'self_referral' };
		else if (first && Number(first.refundedAmount) > 0) verdict = { void: 'refunded' };
		else if (first && now - new Date(first.occurredAt) >= REFERRAL_REFUND_WINDOW_DAYS * DAY)
			verdict = { pay: first };
		else if (!first) {
			const [live] = await db
				.select({ id: subscription.id })
				.from(subscription)
				.where(
					and(
						eq(subscription.userId, a.referredUserId),
						inArray(subscription.status, ['incomplete', 'active', 'past_due', 'cancelled'])
					)
				)
				.limit(1);
			if (!live) verdict = { void: 'never_paid' };
		}
		if (!verdict) {
			out.waiting++;
			continue;
		}
		await db.transaction(async (tx) => {
			const [row] = await tx
				.select()
				.from(partnerAttribution)
				.where(eq(partnerAttribution.referredUserId, a.referredUserId))
				.for('update');
			if (row?.status !== 'pending') return;
			if (verdict.void) {
				await tx
					.update(partnerAttribution)
					.set({ status: 'void', voidReason: verdict.void, decidedAt: now })
					.where(eq(partnerAttribution.referredUserId, a.referredUserId));
				out.voided++;
				return;
			}
			const written = await tx
				.insert(partnerLedger)
				.values({
					entryType: 'referral_bonus',
					status: 'earned',
					teacherId: a.teacherId,
					referredUserId: a.referredUserId,
					teacherCents: REFERRAL_BONUS_CENTS,
					ageNetCents: -REFERRAL_BONUS_CENTS,
					occurredAt: now,
					payableAt: now,
					statementMonth: monthOf(now),
					note: `Premium referral (${a.source})`
				})
				.onConflictDoNothing()
				.returning({ id: partnerLedger.id });
			await tx
				.update(partnerAttribution)
				.set({
					status: written.length ? 'bonus_recorded' : 'void',
					voidReason: written.length ? null : 'already_paid',
					decidedAt: now
				})
				.where(eq(partnerAttribution.referredUserId, a.referredUserId));
			if (written.length) out.recorded++;
			else out.voided++;
		});
	}
	return out;
}
