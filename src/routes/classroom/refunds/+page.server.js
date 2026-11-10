import { error } from '@sveltejs/kit';
import { isAdmin, isTeacher } from '$lib/server/auth/roles.js';
import { listGuideRefunds } from '$lib/server/partner/guideRefunds.js';
import { ledgerDetail } from '$lib/server/partner/statements.js';
import { withinRequestWindow } from '$lib/academy/partner/refundPolicy.js';

/** How far back an admin's "refund a sale" list goes. */
const ADMIN_SALE_DAYS = 90;

/**
 * Classroom → Refunds: every guide refund in one place. Requests waiting
 * for a decision (teachers approve on their own guides; admins approve or
 * decline any), refunds that failed at the gateway (admins retry), sales
 * that can still be refunded without a request, and what was decided.
 */
export const load = async ({ locals, depends }) => {
	depends('classroom:refunds');
	const admin = isAdmin(locals.user);
	if (!admin && !isTeacher(locals.user)) throw error(403, 'Refunds are for teachers and admins.');
	const teacherId = admin ? null : locals.user.id;
	const [pending, failed, decided, ledger] = await Promise.all([
		listGuideRefunds({ status: 'pending', teacherId }),
		admin ? listGuideRefunds({ status: 'failed' }) : [],
		listGuideRefunds({ status: 'decided', teacherId, limit: 40 }),
		ledgerDetail({ teacherId, limit: 500 })
	]);
	const since = Date.now() - ADMIN_SALE_DAYS * 86400000;
	// Teachers see buyers by name; the consent record (IP and all) is AGE's.
	const shape = (r) => ({
		...r,
		buyerEmail: admin ? r.buyerEmail : null,
		consent: admin ? r.consent : { given: r.consent.given, at: r.consent.at }
	});
	return {
		admin,
		pending: pending.map(shape),
		failed: failed.map(shape),
		decided: decided.map(shape),
		sales: ledger.filter(
			(r) =>
				r.entryType === 'sale' &&
				r.checkoutItemId &&
				r.status !== 'refunded' &&
				r.status !== 'charged_back' &&
				(admin ? new Date(r.occurredAt).getTime() >= since : withinRequestWindow(r.occurredAt))
		)
	};
};
