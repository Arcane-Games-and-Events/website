import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, order, ticket } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function load({ locals }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/account');
	}

	// Fetch user's orders
	const userOrders = await db
		.select()
		.from(order)
		.where(eq(order.userEmail, locals.user.email))
		.orderBy(desc(order.createdAt));

	// Enrich orders with refund status for tickets
	const enrichedOrders = await Promise.all(
		userOrders.map(async (ord) => {
			if (ord.meta?.type === 'ticket' && ord.meta.ticketId) {
				const [ticketData] = await db
					.select({ refunded: ticket.refunded })
					.from(ticket)
					.where(eq(ticket.id, ord.meta.ticketId))
					.limit(1);

				return {
					...ord,
					refunded: ticketData?.refunded || false
				};
			}
			return ord;
		})
	);

	return {
		user: locals.user,
		orders: enrichedOrders
	};
}

export const actions = {
	updateProfile: async ({ request, locals }) => {
		// Require authentication
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const firstName = formData.get('firstName');
		const lastName = formData.get('lastName');
		const gemId = formData.get('gemId');

		// Validate required fields
		if (
			typeof firstName !== 'string' ||
			typeof lastName !== 'string' ||
			firstName.trim() === '' ||
			lastName.trim() === ''
		) {
			return fail(400, { error: 'First name and last name are required.' });
		}

		try {
			// Update user in database
			await db
				.update(user)
				.set({
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					gemId: gemId && typeof gemId === 'string' && gemId.trim() !== '' ? gemId.trim() : null
				})
				.where(eq(user.id, locals.user.id));

			return {
				success: true,
				message: 'Profile updated successfully!'
			};
		} catch (error) {
			console.error('Error updating profile:', error);
			return fail(500, { error: 'Failed to update profile. Please try again.' });
		}
	}
};
