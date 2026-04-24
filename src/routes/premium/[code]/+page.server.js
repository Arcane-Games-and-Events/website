import { redirect } from '@sveltejs/kit';
import { normalizePartnerCode } from '$lib/server/partner-code.js';

/**
 * Partner referral link: /premium/[code]
 *
 * Simply forwards to /premium?code=CODE — the actual partner lookup,
 * banner rendering, and validation all happen on the /premium page.
 * This keeps the flow simple and avoids duplicating the checkout page.
 */
export function load({ params }) {
	const code = normalizePartnerCode(params.code);
	if (code) {
		throw redirect(302, `/premium?code=${encodeURIComponent(code)}`);
	}
	throw redirect(302, '/premium');
}
