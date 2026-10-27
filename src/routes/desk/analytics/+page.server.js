import { redirect } from '@sveltejs/kit';
import { canViewSiteAnalytics } from '$lib/server/auth/roles.js';
import { siteOverview, parseRange } from '$lib/server/contentAnalytics/query.js';

/** /desk/analytics — content analytics overview. Editors and admins only. */
export async function load({ locals, url }) {
	if (!canViewSiteAnalytics(locals.user)) throw redirect(302, '/desk');
	const range = parseRange(url.searchParams.get('range'));
	let report = null;
	try {
		report = await siteOverview(range);
	} catch (err) {
		console.error('content analytics overview failed:', err);
	}
	return { range, report };
}
