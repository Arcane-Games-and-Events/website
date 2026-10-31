import { error } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import {
	nextPayDate,
	payDates,
	payoutHistory,
	payoutSales,
	payoutsDue
} from '$lib/server/courses/earnings.js';

/** Classroom → Payouts (admins): who to pay on the next pay date, and what was paid. */
export const load = async ({ locals, url, depends }) => {
	depends('desk:payouts');
	if (!isAdmin(locals.user)) throw error(403, 'Admins only.');
	const next = nextPayDate();
	const payDate = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '')
		? url.searchParams.get('date')
		: next;
	const open = url.searchParams.get('payout');
	return {
		next,
		payDate,
		dates: payDates(new Date(), 4),
		due: await payoutsDue(payDate),
		history: await payoutHistory(),
		openPayout: open,
		openSales: open ? await payoutSales(open) : []
	};
};
