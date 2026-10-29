import { redirect } from '@sveltejs/kit';

/** The old single-page account used `?tab=`; each tab is its own page now. */
const TABS = {
	general: '/account/profile',
	security: '/account/security',
	plan: '/account/membership',
	cards: '/account/payment-methods',
	billing: '/account/purchases'
};

export function load({ url }) {
	throw redirect(302, TABS[url.searchParams.get('tab')] || '/account/membership');
}
