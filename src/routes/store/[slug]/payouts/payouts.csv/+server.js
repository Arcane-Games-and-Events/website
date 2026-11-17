import { error } from '@sveltejs/kit';
import { storeAccess } from '$lib/server/stores/portal.js';
import { payoutsCsv } from '$lib/server/stores/payouts.js';

/** GET /store/[slug]/payouts/payouts.csv — the store's own payouts. Its members. */
export async function GET({ locals, params }) {
	if (!locals.user) throw error(401, 'Sign in');
	const where = await storeAccess(locals.user, params.slug);
	if (!where) throw error(404, 'Store not found');
	return new Response(await payoutsCsv(where.store.id), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${where.store.slug}-payouts.csv"`
		}
	});
}
