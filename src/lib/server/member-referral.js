import { db } from '$lib/server/db/index.js';
import { memberReferralCode, memberReferral, partner, user } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Member referral discount applied to the new signup's first charge.
 * Monthly: $10 = entire month free. Yearly: $10 off the $110 first charge.
 */
export const MEMBER_REFERRAL_DISCOUNT = 10.0;

/**
 * Normalize a referral code (uppercase, trimmed) for storage and lookup.
 */
export function normalizeMemberCode(code) {
	if (!code) return '';
	return String(code).trim().toUpperCase();
}

/**
 * Generate a unique referral code based on the user's first name.
 * Format: {FIRSTNAME}{4 random alphanum}. Retries up to 5 times on collision.
 * Codes must be unique across BOTH partner.code and member_referral_code.code.
 */
export async function generateUniqueMemberCode(firstName) {
	const base = (firstName || 'AGE')
		.replace(/[^a-zA-Z0-9]/g, '')
		.toUpperCase()
		.slice(0, 10) || 'AGE';
	const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

	for (let attempt = 0; attempt < 5; attempt++) {
		const suffix = Array.from(crypto.randomBytes(4))
			.map((b) => ALPHA[b % ALPHA.length])
			.join('');
		const candidate = `${base}${suffix}`;
		const existing = await isCodeTaken(candidate);
		if (!existing) return candidate;
	}
	// Extreme fallback: use a UUID slice
	return `${base}${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

/**
 * Is a code already in use by either the partner or member referral system?
 */
export async function isCodeTaken(rawCode) {
	const code = normalizeMemberCode(rawCode);
	if (!code) return false;

	const [p] = await db
		.select({ id: partner.id })
		.from(partner)
		.where(sql`upper(${partner.code}) = ${code}`)
		.limit(1);
	if (p) return true;

	const [m] = await db
		.select({ id: memberReferralCode.id })
		.from(memberReferralCode)
		.where(sql`upper(${memberReferralCode.code}) = ${code}`)
		.limit(1);
	return !!m;
}

/**
 * Get-or-create a referral code for the given premium user.
 * Returns the row from member_referral_code.
 */
export async function getOrCreateMemberReferralCode(currentUser) {
	const [existing] = await db
		.select()
		.from(memberReferralCode)
		.where(eq(memberReferralCode.userId, currentUser.id))
		.limit(1);
	if (existing) return existing;

	const code = await generateUniqueMemberCode(currentUser.firstName);
	const [created] = await db
		.insert(memberReferralCode)
		.values({
			userId: currentUser.id,
			code,
			isActive: true
		})
		.returning();
	return created;
}

/**
 * Look up a member referral code (any case). Returns null if not found or inactive.
 * Joins user table for the referrer's display name.
 */
export async function getMemberReferralByCode(rawCode) {
	const code = normalizeMemberCode(rawCode);
	if (!code) return null;

	const [row] = await db
		.select({
			id: memberReferralCode.id,
			code: memberReferralCode.code,
			isActive: memberReferralCode.isActive,
			userId: memberReferralCode.userId,
			referrerFirstName: user.firstName,
			referrerLastName: user.lastName
		})
		.from(memberReferralCode)
		.leftJoin(user, eq(memberReferralCode.userId, user.id))
		.where(sql`upper(${memberReferralCode.code}) = ${code}`)
		.limit(1);

	if (!row || !row.isActive) return null;
	return row;
}

/**
 * Validate a member referral code for redemption at premium checkout.
 * Same one-promo-code-per-user-ever rule as partner codes (uses user.usedPartnerCode).
 */
export async function validateMemberReferralCode(rawCode, userId) {
	const code = normalizeMemberCode(rawCode);
	if (!code) return { valid: false, reason: 'not_found' };

	const referral = await getMemberReferralByCode(code);
	if (!referral) return { valid: false, reason: 'not_found' };

	const [userRow] = await db
		.select({ usedPartnerCode: user.usedPartnerCode })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	if (userRow?.usedPartnerCode) {
		return { valid: false, reason: 'already_used' };
	}

	if (referral.userId === userId) {
		return { valid: false, reason: 'self_referral' };
	}

	return { valid: true, referral };
}

/**
 * Public-facing display name for a member referrer (first name only, since this
 * is a community feature and we want to keep referrer privacy reasonable).
 */
export function getMemberReferrerPublicName(referral) {
	if (!referral) return null;
	return referral.referrerFirstName || null;
}
