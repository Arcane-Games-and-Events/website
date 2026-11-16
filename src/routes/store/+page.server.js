import { redirect } from '@sveltejs/kit';
import { storesForUser } from '$lib/server/stores/members.js';

/** /store — the stores this account helps run; straight in when there's one. */
export async function load({ locals, url }) {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	const stores = await storesForUser(locals.user.id);
	if (!stores.length) throw redirect(302, '/account');
	if (stores.length === 1) throw redirect(302, `/store/${stores[0].slug}`);
	return { stores };
}
