import { error, json } from '@sveltejs/kit';
import { storeAccess } from '$lib/server/stores/portal.js';
import { searchAccounts } from '$lib/server/stores/people.js';

/**
 * GET /store/[slug]/people?q= — AGE accounts matching a name, email or GEM
 * ID, for the store's "add to the team" and "add staff" search boxes.
 * Only the store's members (and admins) can search.
 */
export async function GET({ locals, params, url }) {
	const where = await storeAccess(locals.user, params.slug);
	if (!where) throw error(404, 'Store not found');
	return json(
		{ people: await searchAccounts(url.searchParams.get('q') || '') },
		{ headers: { 'cache-control': 'private, no-store' } }
	);
}
