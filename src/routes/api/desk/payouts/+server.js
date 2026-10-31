import { markPaid } from '$lib/server/courses/earnings.js';
import { body, requireAdmin, respond } from '$lib/server/courses/http.js';

/** POST { teacherId, payDate, reference?, note? }: an admin marks a payout as paid. */
export async function POST({ request, locals }) {
	requireAdmin(locals);
	const { teacherId, payDate, reference, note } = await body(request);
	return respond(async () => ({
		payout: await markPaid({ teacherId, payDate, reference, note, actor: locals.user })
	}));
}
