import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, order, ticket } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';

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

	// Batch fetch ALL ticket refund statuses at once (fixes N+1 query problem)
	const ticketIds = userOrders
		.filter((o) => o.meta?.type === 'ticket' && o.meta.ticketId)
		.map((o) => o.meta.ticketId);

	// Only query if there are ticket orders
	const ticketRefundMap = new Map();
	if (ticketIds.length > 0) {
		const ticketRefunds = await db
			.select({ id: ticket.id, refunded: ticket.refunded })
			.from(ticket)
			.where(inArray(ticket.id, ticketIds));

		for (const t of ticketRefunds) {
			ticketRefundMap.set(t.id, t.refunded);
		}
	}

	// Enrich orders with refund status (no additional queries needed)
	const enrichedOrders = userOrders.map((ord) => {
		if (ord.meta?.type === 'ticket' && ord.meta.ticketId) {
			return {
				...ord,
				refunded: ticketRefundMap.get(ord.meta.ticketId) || false
			};
		}
		return ord;
	});

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
	},

	changePassword: async ({ request, locals }) => {
		// Require authentication
		if (!locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword');
		const newPassword = formData.get('newPassword');
		const confirmPassword = formData.get('confirmPassword');

		// Validate required fields
		if (
			typeof currentPassword !== 'string' ||
			typeof newPassword !== 'string' ||
			typeof confirmPassword !== 'string' ||
			!currentPassword ||
			!newPassword ||
			!confirmPassword
		) {
			return fail(400, { passwordError: 'All password fields are required.' });
		}

		// Validate new password length
		if (newPassword.length < 8) {
			return fail(400, { passwordError: 'New password must be at least 8 characters.' });
		}

		// Validate passwords match
		if (newPassword !== confirmPassword) {
			return fail(400, { passwordError: 'New passwords do not match.' });
		}

		try {
			// Fetch user with password hash
			const [userData] = await db
				.select({ hashedPassword: user.hashedPassword })
				.from(user)
				.where(eq(user.id, locals.user.id))
				.limit(1);

			if (!userData || !userData.hashedPassword) {
				return fail(400, { passwordError: 'Unable to verify current password.' });
			}

			// Verify current password
			const argon2id = new Argon2id();
			const validPassword = await argon2id.verify(userData.hashedPassword, currentPassword);

			if (!validPassword) {
				return fail(400, { passwordError: 'Current password is incorrect.' });
			}

			// Hash new password
			const newHashedPassword = await argon2id.hash(newPassword);

			// Update password in database
			await db
				.update(user)
				.set({ hashedPassword: newHashedPassword })
				.where(eq(user.id, locals.user.id));

			return {
				passwordSuccess: true,
				passwordMessage: 'Password changed successfully!'
			};
		} catch (error) {
			console.error('Error changing password:', error);
			return fail(500, { passwordError: 'Failed to change password. Please try again.' });
		}
	}
};
