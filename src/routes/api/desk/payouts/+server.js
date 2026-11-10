import { body, requireAdmin, respond } from '$lib/server/courses/http.js';
import { markStatementPaid } from '$lib/server/partner/statements.js';

/** POST { teacherId, month, reference?, note? }: an admin marks a month's statement paid. */
export async function POST({ request, locals }) {
	requireAdmin(locals);
	const { teacherId, month, reference, note } = await body(request);
	return respond(async () => ({
		payout: await markStatementPaid({ teacherId, month, reference, note, actor: locals.user })
	}));
}
