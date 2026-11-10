import { error } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import { payoutHistory } from '$lib/server/courses/earnings.js';
import { monthOf } from '$lib/server/partner/ledger.js';
import {
	expectedPayouts,
	ledgerDetail,
	monthClosed,
	monthStatements,
	payDateOf,
	statementMonths
} from '$lib/server/partner/statements.js';

/**
 * Classroom → Payouts (admins): each month's teacher statements, what's
 * still to be paid by pay date, every sale (pending ones included), and
 * what was paid.
 */
export const load = async ({ locals, url, depends }) => {
	depends('desk:payouts');
	if (!isAdmin(locals.user)) throw error(403, 'Admins only.');
	const months = await statementMonths();
	const asked = url.searchParams.get('month');
	// By default the latest month that has ended.
	const month = months.includes(asked)
		? asked
		: months.find((m) => monthClosed(m)) || monthOf(new Date());
	return {
		partner: {
			month,
			months,
			payDate: payDateOf(month),
			closed: monthClosed(month),
			statements: await monthStatements(month)
		},
		expected: await expectedPayouts(),
		detail: await ledgerDetail(),
		history: await payoutHistory()
	};
};
