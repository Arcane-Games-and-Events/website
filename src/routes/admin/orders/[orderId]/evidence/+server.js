import { error } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import { disputeEvidence, evidenceText } from '$lib/server/partner/evidence.js';

/** GET: a guides order's dispute evidence (consent, first opened) as a text file. Admins. */
export async function GET({ params, locals }) {
	if (!isAdmin(locals.user)) throw error(403, 'Admins only.');
	const e = await disputeEvidence(params.orderId);
	if (!e) throw error(404, 'Not a guide order.');
	return new Response(evidenceText(e), {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'content-disposition': `attachment; filename="age-evidence-${e.order.invoice || e.order.id}.txt"`,
			'cache-control': 'private, no-store'
		}
	});
}
