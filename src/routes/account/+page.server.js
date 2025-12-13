import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, order, ticket } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';
import { authnet } from '$lib/server/authnet/client.js';

/**
 * Sync subscription billing date from Authorize.net
 * Called automatically when loading the account page
 */
async function syncSubscriptionBillingDate(currentUser) {
	if (!currentUser.subscriptionId || currentUser.subscriptionStatus === 'expired') {
		return null;
	}

	try {
		// Get subscription details from Authorize.net
		const subDetails = await authnet.getSubscription(currentUser.subscriptionId);

		if (!subDetails.transactions || subDetails.transactions.length === 0) {
			return null;
		}

		// Sort by payNum descending to get the most recent
		const sortedTx = [...subDetails.transactions].sort((a, b) => b.payNum - a.payNum);
		const latestTx = sortedTx[0];

		// Check if approved (ARB returns text like "This transaction has been approved.")
		const isApproved =
			latestTx.response === '1' ||
			latestTx.response === 1 ||
			(typeof latestTx.response === 'string' &&
				latestTx.response.toLowerCase().includes('approved'));

		if (!isApproved) {
			return null;
		}

		// Calculate next billing date based on subscription type
		const txDate = new Date(latestTx.submitTimeUTC);
		let nextBillingDate;

		if (currentUser.subscriptionType === 'yearly') {
			nextBillingDate = new Date(txDate);
			nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
		} else if (currentUser.subscriptionType === 'weekly_test') {
			nextBillingDate = new Date(txDate);
			nextBillingDate.setDate(nextBillingDate.getDate() + 7);
		} else {
			nextBillingDate = new Date(txDate);
			nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
		}

		// Check if different (more than 1 hour difference)
		if (currentUser.nextBillingDate) {
			const currentNext = new Date(currentUser.nextBillingDate);
			if (Math.abs(nextBillingDate.getTime() - currentNext.getTime()) <= 1000 * 60 * 60) {
				return null; // No significant difference
			}
		}

		// Update the database
		await db
			.update(user)
			.set({ nextBillingDate })
			.where(eq(user.id, currentUser.id));

		return nextBillingDate;
	} catch (err) {
		// Silently fail - don't break the page load if sync fails
		console.error('[Account] Subscription sync error:', err.message);
		return null;
	}
}

export async function load({ locals }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/account');
	}

	// Sync subscription billing date in the background (don't block page load)
	const syncPromise = syncSubscriptionBillingDate(locals.user);

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

	// Wait for subscription sync to complete and update user data if needed
	const updatedBillingDate = await syncPromise;
	const userData = updatedBillingDate
		? { ...locals.user, nextBillingDate: updatedBillingDate }
		: locals.user;

	return {
		user: userData,
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
