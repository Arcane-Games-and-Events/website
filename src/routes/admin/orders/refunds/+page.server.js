import { fail, redirect } from '@sveltejs/kit';
import {
	approveRefundRequest,
	declineRefundRequest,
	listRefundRequests
} from '$lib/server/payments/refunds.js';

export async function load({ locals, url }) {
	if (!locals.user || locals.user.role !== 'admin')
		throw redirect(302, '/login?redirect=/admin/orders/refunds');
	const view = url.searchParams.get('view') === 'all' ? 'all' : 'pending';
	const requests = await listRefundRequests({ status: view, limit: 200 });
	return { requests, view };
}

const admin = (locals) => locals.user?.role === 'admin';

export const actions = {
	approve: async ({ request, locals }) => {
		if (!admin(locals)) return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const result = await approveRefundRequest({
			actor: locals.user,
			requestId: form.get('id')?.toString(),
			note: form.get('note')?.toString().trim() || null
		});
		if (!result.ok && result.status !== 'waiting_settlement')
			return fail(400, { error: result.message });
		return { success: true, message: result.message };
	},
	decline: async ({ request, locals }) => {
		if (!admin(locals)) return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const result = await declineRefundRequest({
			actor: locals.user,
			requestId: form.get('id')?.toString(),
			note: form.get('note')?.toString().trim() || null
		});
		if (!result.ok) return fail(400, { error: result.message });
		return { success: true, message: result.message };
	}
};
