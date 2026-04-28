import { db } from '$lib/server/db/index.js';
import { partner, user } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Amount discounted off the first premium charge when a partner code is used.
 * Partner also earns this amount as commission.
 */
export const PARTNER_DISCOUNT_AMOUNT = 5.0;

/**
 * Calculate the payout due date for a referral — same day of the following month
 * from when the referral was recorded. JS auto-handles month overflow (e.g. Jan 31
 * becomes Mar 3 when adding a month; that's fine for payout purposes).
 *
 * @param {Date|string} createdAt
 * @returns {Date}
 */
export function calculatePayoutDueDate(createdAt) {
	const d = new Date(createdAt);
	d.setMonth(d.getMonth() + 1);
	return d;
}

/**
 * Is this pending referral past its payout due date?
 * @param {Date|string} createdAt
 * @param {'pending' | 'paid'} payoutStatus
 */
export function isReadyToPayOut(createdAt, payoutStatus) {
	if (payoutStatus !== 'pending') return false;
	return calculatePayoutDueDate(createdAt) <= new Date();
}

/**
 * Normalize a partner code for storage and lookup (uppercased, trimmed).
 */
export function normalizePartnerCode(code) {
	if (!code) return '';
	return String(code).trim().toUpperCase();
}

/**
 * Validate a partner code for use at premium checkout.
 *
 * @param {string} rawCode - The code the user entered (any case)
 * @param {string} userId - The user attempting to redeem
 * @returns {Promise<{ valid: boolean, partner?: object, reason?: 'not_found' | 'inactive' | 'already_used' | 'self_referral' }>}
 */
export async function validatePartnerCode(rawCode, userId) {
	const code = normalizePartnerCode(rawCode);
	if (!code) return { valid: false, reason: 'not_found' };

	// Look up the partner using the same query as getPartnerByCode for consistency
	const partnerInfo = await getPartnerByCode(code);
	if (!partnerInfo) return { valid: false, reason: 'not_found' };

	// Check if user has already redeemed any partner code
	const [userRow] = await db
		.select({ usedPartnerCode: user.usedPartnerCode })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	if (userRow?.usedPartnerCode) {
		return { valid: false, reason: 'already_used' };
	}

	// A partner cannot redeem their own code
	if (partnerInfo.userId === userId) {
		return { valid: false, reason: 'self_referral' };
	}

	return { valid: true, partner: partnerInfo };
}

/**
 * Look up a partner by code for display purposes (no user context needed).
 * Used by the /premium/[code] link route to show the referral banner.
 */
export async function getPartnerByCode(rawCode) {
	const code = normalizePartnerCode(rawCode);
	if (!code) return null;

	const [partnerRow] = await db
		.select({
			id: partner.id,
			code: partner.code,
			displayName: partner.displayName,
			isActive: partner.isActive,
			userId: partner.userId,
			partnerFirstName: user.firstName,
			partnerLastName: user.lastName
		})
		.from(partner)
		.leftJoin(user, eq(partner.userId, user.id))
		.where(sql`upper(${partner.code}) = ${code}`)
		.limit(1);

	if (!partnerRow || !partnerRow.isActive) return null;
	return partnerRow;
}

/**
 * Resolve the public-facing name for a partner row.
 * Prefers displayName, falls back to the user's first name.
 */
export function getPartnerPublicName(partnerRow) {
	if (!partnerRow) return null;
	if (partnerRow.displayName?.trim()) return partnerRow.displayName.trim();
	if (partnerRow.partnerFirstName) return partnerRow.partnerFirstName;
	return null;
}
