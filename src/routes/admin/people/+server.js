import { error, json } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import { searchAccounts } from '$lib/server/stores/people.js';

/**
 * GET /admin/people?q= — AGE accounts matching a name, email or GEM ID,
 * for admin search boxes (e.g. a new store's first owner). Admins only
 * (hooks guard /admin too).
 */
export async function GET({ locals, url }) {
	if (!isAdmin(locals.user)) throw error(403, 'Admins only');
	return json(
		{ people: await searchAccounts(url.searchParams.get('q') || '') },
		{ headers: { 'cache-control': 'private, no-store' } }
	);
}
