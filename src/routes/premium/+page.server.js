import { db } from '$lib/server/db';
import { savedCard } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import {
	getPartnerByCode,
	getPartnerPublicName,
	normalizePartnerCode
} from '$lib/server/partner-code.js';
import {
	getMemberReferralByCode,
	getMemberReferrerPublicName
} from '$lib/server/member-referral.js';

export async function load({ locals, url }) {
	// Fetch saved cards if user is logged in
	let userSavedCards = [];
	if (locals.user) {
		userSavedCards = await db.select().from(savedCard).where(eq(savedCard.userId, locals.user.id));
	}

	// Look up partner code from query string (set by /premium/[code] redirect or direct link)
	const rawCode = url.searchParams.get('code');
	// Resolve the code as either a partner code or a member referral code.
	// Codes share one namespace, so try member referral first then fall back.
	let partnerReferral = null;
	if (rawCode) {
		const member = await getMemberReferralByCode(rawCode);
		if (member) {
			partnerReferral = {
				type: 'member',
				code: normalizePartnerCode(rawCode),
				partnerName: getMemberReferrerPublicName(member)
			};
		} else {
			const partner = await getPartnerByCode(rawCode);
			if (partner) {
				partnerReferral = {
					type: 'partner',
					code: normalizePartnerCode(rawCode),
					partnerName: getPartnerPublicName(partner)
				};
			}
		}
	}

	return {
		user: locals.user,
		savedCards: userSavedCards,
		isSandbox: env.AUTHNET_ENVIRONMENT === 'sandbox',
		partnerReferral
	};
}
