import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { store } from '$lib/server/db/schema.js';
import { isAdmin } from '$lib/server/auth/roles.js';
import { payoutsCsv } from '$lib/server/stores/payouts.js';

/** GET /admin/stores/[slug]/payouts.csv — every payout of a store. Admins. */
export async function GET({ locals, params }) {
	if (!isAdmin(locals.user)) throw error(403, 'Admins only');
	const [s] = await db.select().from(store).where(eq(store.slug, params.slug)).limit(1);
	if (!s) throw error(404, 'Store not found');
	return new Response(await payoutsCsv(s.id), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${s.slug}-payouts.csv"`
		}
	});
}
