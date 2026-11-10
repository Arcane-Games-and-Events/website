import { json } from '@sveltejs/kit';
import { RefundError, staffRefundGuide } from '$lib/server/partner/guideRefunds.js';

/**
 * POST /api/academy/refunds/staff
 *
 * Body: { itemId, note? }
 *
 * Refund one guide sale from the dashboard, without the buyer asking:
 * admins any sale, teachers their own guides within the request window.
 * Everything the buyer paid for that guide goes back, and the guide leaves
 * their library.
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
		const r = await staffRefundGuide({
			actor: locals.user,
			itemId: String(body?.itemId || ''),
			note: body?.note ? String(body.note).slice(0, 500) : null
		});
		if (r.refundStatus === 'refund_failed')
			return json(
				{ error: `The refund failed at the gateway: ${r.gatewayResponse}` },
				{ status: 502 }
			);
		return json({ request: { id: r.id, status: r.status, refundStatus: r.refundStatus } });
	} catch (err) {
		if (err instanceof RefundError) return json({ error: err.message }, { status: err.status });
		throw err;
	}
}
