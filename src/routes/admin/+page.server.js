import { redirect } from '@sveltejs/kit';

const validTabs = ['events', 'calendar', 'podcasts', 'vods', 'orders', 'users', 'players', 'analytics', 'cards'];

export function load({ url }) {
	const tab = url.searchParams.get('tab');
	if (tab && validTabs.includes(tab)) {
		throw redirect(302, `/admin/${tab}`);
	}
	throw redirect(302, '/admin/analytics');
}
