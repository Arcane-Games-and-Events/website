import { json } from '@sveltejs/kit';
import {
	RefundError,
	decideGuideRefund,
	retryGuideRefund
} from '$lib/server/partner/guideRefunds.js';

/**
 * POST /api/academy/refunds/[id]
 *
 * Body: { action: 'approve' | 'deny' | 'retry', note? }
 *
 * Decide a guide refund request: admins approve or deny; the guide's own
 * teacher may approve. Admins retry a refund that failed at the gateway.
 */
export async function POST({ params, request, locals }) {
	if (!locals.user) return json({ error: 'Sign in first.' }, { status: 401 });
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request' }, { status: 400 });
	}
	try {
		const r =
			body?.action === 'retry'
				? await retryGuideRefund({ actor: locals.user, requestId: params.id })
				: await decideGuideRefund({
						actor: locals.user,
						requestId: params.id,
						action: body?.action,
						note: body?.note || null
					});
		return json({ request: { id: r.id, status: r.status, refundStatus: r.refundStatus } });
	} catch (err) {
		if (err instanceof RefundError) return json({ error: err.message }, { status: err.status });
		throw err;
	}
}
