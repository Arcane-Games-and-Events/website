import { error } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import { statementsCsv } from '$lib/server/partner/statements.js';

/** GET ?month=YYYY-MM-01: a month's teacher statements as CSV (admins). */
export async function GET({ url, locals }) {
	if (!isAdmin(locals.user)) throw error(403, 'Admins only.');
	const month = url.searchParams.get('month') || '';
	if (!/^\d{4}-\d{2}-01$/.test(month)) throw error(400, 'Choose a month.');
	return new Response(await statementsCsv(month), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="age-teacher-statements-${month.slice(0, 7)}.csv"`,
			'cache-control': 'private, no-store'
		}
	});
}
