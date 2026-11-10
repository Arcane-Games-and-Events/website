import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { order, user, ticket, event, courseEnrollment, deskCourse } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { partnerLedger } from '$lib/server/db/schema.js';

export async function load({ params, locals }) {
	try {
		// Fetch order details
		const [orderData] = await db.select().from(order).where(eq(order.id, params.orderId)).limit(1);

		if (!orderData) {
			throw redirect(302, '/admin/orders');
		}

		// Fetch customer info
		const [customerData] = await db
			.select()
			.from(user)
			.where(eq(user.email, orderData.userEmail))
			.limit(1);

		// Fetch related data based on order type
		let relatedData = null;

		if (orderData.meta?.type === 'ticket' && orderData.meta.ticketId) {
			const [ticketData] = await db
				.select()
				.from(ticket)
				.where(eq(ticket.id, orderData.meta.ticketId))
				.limit(1);

			let eventData = null;
			if (ticketData?.eventId) {
				const [eventResult] = await db
					.select()
					.from(event)
					.where(eq(event.id, ticketData.eventId))
					.limit(1);
				eventData = eventResult;
			}

			relatedData = {
				type: 'ticket',
				ticket: ticketData,
				event: eventData
			};
		} else if (orderData.kind === 'course' || orderData.meta?.type === 'course') {
			// A course bought once: the enrollment it created (revoked by a full refund).
			const [enrollment] = await db
				.select()
				.from(courseEnrollment)
				.where(eq(courseEnrollment.orderId, orderData.id))
				.limit(1);
			const [course] = orderData.meta?.courseId
				? await db
						.select({ id: deskCourse.id, title: deskCourse.title, slug: deskCourse.slug })
						.from(deskCourse)
						.where(eq(deskCourse.id, orderData.meta.courseId))
						.limit(1)
				: [];
			// The Partner ledger: each guide's sale, and whether it was refunded
			// or charged back.
			const sales = await db
				.select({
					itemId: partnerLedger.checkoutItemId,
					status: partnerLedger.status,
					teacherCents: partnerLedger.teacherCents,
					level: partnerLedger.level,
					copyNumber: partnerLedger.copyNumber,
					legacy: partnerLedger.legacySaleId
				})
				.from(partnerLedger)
				.where(and(eq(partnerLedger.orderId, orderData.id), eq(partnerLedger.entryType, 'sale')));
			const byItem = new Map(sales.map((s) => [s.itemId, s]));
			const { disputeEvidence } = await import('$lib/server/partner/evidence.js');
			relatedData = {
				evidence: await disputeEvidence(orderData.id),
				type: 'course',
				enrollment: enrollment || null,
				course: course || null,
				guides: (orderData.meta?.guides || []).map((g) => ({
					...g,
					sale: byItem.get(g.itemId) || null
				})),
				legacySale: sales.find((s) => s.legacy) || null
			};
		} else if (orderData.meta?.type === 'subscription') {
			relatedData = {
				type: 'subscription'
			};
		}

		return {
			user: locals.user,
			order: orderData,
			customer: customerData || null,
			relatedData
		};
	} catch (err) {
		if (err.status === 302) {
			throw err;
		}
		console.error('Error loading order:', err);
		throw redirect(302, '/admin/orders');
	}
}

const ADMIN_ONLY = (locals) => !locals.user || locals.user.role !== 'admin';

export const actions = {
	/** Refund one guide from a guides order: everything paid for it, card fee included. */
	refundGuide: async ({ params, request, locals }) => {
		if (ADMIN_ONLY(locals)) return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const itemId = form.get('itemId')?.toString();
		if (!itemId) return fail(400, { error: 'Choose a guide.' });
		const { staffRefundGuide } = await import('$lib/server/partner/guideRefunds.js');
		try {
			const r = await staffRefundGuide({
				actor: locals.user,
				orderId: params.orderId,
				itemId,
				note: form.get('reason')?.toString() || null
			});
			if (r.refundStatus === 'refund_failed')
				return fail(400, { error: `The refund failed: ${r.gatewayResponse}` });
			return { success: true, message: r.gatewayResponse || 'Refund started.' };
		} catch (err) {
			return fail(err.status || 500, { error: err.message });
		}
	},

	/** Record a chargeback the bank took (one guide, or the whole order). */
	chargeback: async ({ params, request, locals }) => {
		if (ADMIN_ONLY(locals)) return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const itemId = form.get('itemId')?.toString() || null;
		const { recordChargeback } = await import('$lib/server/partner/refunds.js');
		const r = await recordChargeback({
			actor: locals.user,
			orderId: params.orderId,
			itemIds: itemId ? [itemId] : [],
			note: form.get('note')?.toString() || null
		});
		if (!r.ok) return fail(400, { error: r.message });
		return { success: true, message: r.message };
	},

	refund: async ({ params, request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}
		const formData = await request.formData().catch(() => null);
		const effect = formData?.get('subscriptionEffect')?.toString() || null;
		try {
			const { refundOrderRemainder } = await import('$lib/server/payments/refunds.js');
			const result = await refundOrderRemainder({
				actor: locals.user,
				orderId: params.orderId,
				reason: formData?.get('reason')?.toString() || 'admin refund',
				subscriptionEffect: ['keep', 'end_now', 'cancel_at_period_end'].includes(effect)
					? effect
					: null
			});
			if (!result.ok && result.status !== 'waiting_settlement') {
				return fail(400, { error: result.message });
			}
			return { success: true, message: result.message };
		} catch (err) {
			console.error('Error refunding order:', err);
			return fail(500, { error: err.message || 'Failed to process refund' });
		}
	}
};
