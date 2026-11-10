import { json } from '@sveltejs/kit';
import { RefundError, requestGuideRefund } from '$lib/server/partner/guideRefunds.js';

/**
 * POST /api/academy/refunds
 *
 * Body: { itemId, reason: 'duplicate' | 'broken' | 'not_as_described' | 'unopened' | 'other', message? }
 *
 * A buyer asks for a refund of one guide they bought, under the guide
 * refund policy. Duplicates and unopened guides (within 7 days) are
 * refunded at once; the rest wait for AGE or the teacher.
 *
 * Responses: 200 { request } · 400 · 401 · 403 window passed · 404 · 409 already asked or refunded.
 */
export async function POST({ request, locals }) {
	if (!locals.user) return json({ error: 'Sign in first.' }, { status: 401 });
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request' }, { status: 400 });
	}
	try {
		const r = await requestGuideRefund({
			user: locals.user,
			itemId: String(body?.itemId || ''),
			reason: body?.reason,
			message: body?.message || null
		});
		return json({
			request: {
				id: r.id,
				status: r.status,
				refundStatus: r.refundStatus,
				autoReason: r.autoReason
			}
		});
	} catch (err) {
		if (err instanceof RefundError) return json({ error: err.message }, { status: err.status });
		throw err;
	}
}
