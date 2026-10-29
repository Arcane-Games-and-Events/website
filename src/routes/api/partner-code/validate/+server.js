import { json } from '@sveltejs/kit';
import { getPartnerPublicName } from '$lib/server/partner-code.js';
import { getMemberReferrerPublicName } from '$lib/server/member-referral.js';
import { quoteSignup } from '$lib/server/billing/subscriptions.js';

/**
 * GET /api/partner-code/validate?code=…&plan=monthly|yearly
 *
 * Check a promo or referral code and return the server's quote for it, so
 * the checkout shows the exact amounts that will be charged.
 */
export async function GET({ url, locals }) {
	const code = url.searchParams.get('code') || '';
	const plan = url.searchParams.get('plan') === 'yearly' ? 'yearly' : 'monthly';
	if (!code.trim()) return json({ valid: false, error: 'No code provided' });
	if (!locals.user) return json({ valid: false, error: 'Sign in to use a code' });

	const q = await quoteSignup({ user: locals.user, plan, promoCode: code });
	if (!q.ok) return json({ valid: false, error: q.error });
	if (!q.promoKind) return json({ valid: false, error: 'Promo code not found' });

	const partnerName =
		q.promoKind === 'partner'
			? getPartnerPublicName(q.partner)
			: getMemberReferrerPublicName(q.referral);
	return json({
		valid: true,
		code: q.promoCode,
		type: q.promoKind === 'partner' ? 'partner' : 'member',
		partnerName,
		discountLabel:
			q.promoKind === 'partner' ? '$5 off' : plan === 'monthly' ? 'First month free' : '$10 off',
		quote: {
			plan,
			listCents: q.listCents,
			discountCents: q.discountCents,
			amountCents: q.amountCents,
			renewalCents: q.renewalCents
		}
	});
}
