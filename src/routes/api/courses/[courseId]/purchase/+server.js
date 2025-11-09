import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { entitlement, order } from '$lib/server/db/schema.js';

/**
 * Purchase a course (one-time payment)
 */
export async function POST({ params, request, locals }) {
	try {
		const { courseId } = params;
		const currentUser = locals.user;

		if (!currentUser) {
			return json({ error: 'You must be logged in to purchase a course' }, { status: 401 });
		}

		const body = await request.json();
		const { amount, cardNumber, expirationDate, cardCode, description, billTo } = body;

		// Process one-time payment
		const result = await authnet.chargeCard({
			amount,
			cardNumber,
			expirationDate,
			cardCode,
			description,
			billTo
		});

		if (result.success) {
			// Grant course entitlement
			const [newEntitlement] = await db.insert(entitlement).values({
				userId: currentUser.id,
				product: courseId
			}).returning();

			// Record the order
			await db.insert(order).values({
				provider: 'authnet',
				providerRef: result.transactionId,
				userEmail: currentUser.email,
				amount,
				currency: 'USD',
				meta: {
					type: 'course',
					courseId,
					entitlementId: newEntitlement.id,
					transactionId: result.transactionId
				}
			});

			return json({
				success: true,
				entitlementId: newEntitlement.id,
				redirectUrl: `/courses/${courseId}`
			});
		} else {
			return json({ error: 'Payment failed' }, { status: 500 });
		}
	} catch (err) {
		console.error('Course purchase error:', err);
		return json({ error: err.message || 'Payment processing failed' }, { status: 500 });
	}
}
