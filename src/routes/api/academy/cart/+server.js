import { json } from '@sveltejs/kit';
import { readCart, writeCart } from '$lib/server/partner/cart.js';
import { guidesByIds } from '$lib/server/partner/checkout.js';

/**
 * POST /api/academy/cart
 *
 * Body: { courseId, action: 'add' | 'remove' } or { action: 'clear' }
 *
 * Change the guides cart. Only published guides go in. Responds with the
 * ids now in the cart.
 */
export async function POST({ request, cookies }) {
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request' }, { status: 400 });
	}
	const { courseId, action } = body || {};
	let ids = readCart(cookies);
	if (action === 'clear') ids = [];
	else if (action === 'remove') ids = ids.filter((id) => id !== courseId);
	else if (action === 'add') {
		const [guide] = await guidesByIds([courseId]);
		if (!guide) return json({ error: 'Guide not found' }, { status: 404 });
		if (!ids.includes(guide.id)) ids.push(guide.id);
	} else return json({ error: 'Bad request' }, { status: 400 });
	ids = writeCart(cookies, ids);
	return json({ ids, count: ids.length });
}
