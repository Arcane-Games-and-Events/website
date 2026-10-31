import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { order, user, ticket, event, courseEnrollment, deskCourse } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

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
			relatedData = { type: 'course', enrollment: enrollment || null, course: course || null };
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

export const actions = {
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
