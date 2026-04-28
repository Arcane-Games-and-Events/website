import { json } from '@sveltejs/kit';
import {
	validatePartnerCode,
	normalizePartnerCode,
	getPartnerByCode,
	getPartnerPublicName
} from '$lib/server/partner-code.js';
import {
	validateMemberReferralCode,
	getMemberReferralByCode,
	getMemberReferrerPublicName
} from '$lib/server/member-referral.js';

/**
 * Validate a partner code without committing to a purchase.
 * Used by the /premium checkout UI to show the discount preview.
 */
export async function GET({ url, locals }) {
	const rawCode = url.searchParams.get('code');
	const code = normalizePartnerCode(rawCode);

	if (!code) {
		return json({ valid: false, error: 'No code provided' });
	}

	if (!locals.user) {
		return json({ valid: false, error: 'You must be logged in' });
	}

	const messages = {
		not_found: 'Promo code not found',
		inactive: 'This promo code is no longer active',
		already_used: 'You have already used a promo code',
		self_referral: "You can't redeem your own promo code"
	};

	// Codes share a namespace — try member referral first, then partner.
	const memberLookup = await getMemberReferralByCode(code);
	if (memberLookup) {
		const result = await validateMemberReferralCode(code, locals.user.id);
		if (!result.valid) {
			console.log('[promo-code/validate] member rejected', {
				code,
				userId: locals.user.id,
				reason: result.reason
			});
			return json({ valid: false, error: messages[result.reason] || 'Invalid promo code' });
		}
		return json({
			valid: true,
			code,
			type: 'member',
			partnerName: getMemberReferrerPublicName(memberLookup),
			discountLabel: 'First month free'
		});
	}

	const result = await validatePartnerCode(code, locals.user.id);
	if (!result.valid) {
		console.log('[promo-code/validate] partner rejected', {
			code,
			userId: locals.user.id,
			reason: result.reason
		});
		return json({ valid: false, error: messages[result.reason] || 'Invalid promo code' });
	}

	let partnerName = null;
	try {
		const partnerRow = await getPartnerByCode(code);
		partnerName = getPartnerPublicName(partnerRow);
	} catch {
		// Silent fail — name is optional for UI
	}

	return json({ valid: true, code, type: 'partner', partnerName, discountLabel: '$5 off' });
}
