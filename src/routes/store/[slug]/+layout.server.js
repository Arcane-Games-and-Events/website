import { error, redirect } from '@sveltejs/kit';
import { seasonCounts, storeAccess } from '$lib/server/stores/portal.js';

/**
 * /store/[slug] — only the store's members (and admins, acting as owners).
 * Everyone else gets a 404, so store addresses aren't confirmed to outsiders.
 */
export async function load({ locals, params, url }) {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	const where = await storeAccess(locals.user, params.slug);
	if (!where) throw error(404, 'Store not found');
	return { where, season: await seasonCounts(where) };
}
