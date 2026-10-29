import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { bump } from '$lib/server/cache/index.js';
import { setMemberRole } from '$lib/server/payments/ledger.js';
import { adminCounts, listUsers } from '$lib/server/admin/dashboard.js';
import {
	user,
	session,
	ticket,
	entitlement,
	passwordResetToken,
	eventStaff,
	decklist,
	event,
	lssEvent,
	podcast,
	podcastEpisode,
	vod
} from '$lib/server/db/schema.js';
import { eq, or, ilike } from 'drizzle-orm';

export async function load({ locals }) {
	try {
		const [counts, allUsers] = await Promise.all([adminCounts(), listUsers()]);
		return { user: locals.user, allUsers, stats: { totalUsers: counts.totalUsers } };
	} catch (error) {
		console.error('Admin users page load error:', error);
		return { user: locals.user, allUsers: [], stats: { totalUsers: 0 } };
	}
}

export const actions = {
	// Update user role
	updateUserRole: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId');
		const newRole = formData.get('role');

		// Validate role
		const validRoles = ['free', 'premium', 'admin', 'writer', 'tournament staff'];
		if (!validRoles.includes(newRole)) {
			return fail(400, { error: 'Invalid role' });
		}

		// Prevent admin from changing their own role
		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot change your own role' });
		}

		try {
			const result = await setMemberRole({
				userId,
				role: newRole,
				compReason: formData.get('compReason')?.toString() || null,
				actorId: locals.user.id
			});
			if (!result.ok) return fail(400, { error: result.error });
			await bump(`user:${userId}`, 'users');

			return { success: true, message: `User role updated to ${newRole}` };
		} catch (err) {
			console.error('Error updating user role:', err);
			return fail(500, { error: 'Failed to update user role' });
		}
	},

	// Server-side search for users
	searchUsers: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const query = formData.get('query')?.toString().trim();

		if (!query || query.length < 2) {
			return fail(400, { error: 'Search query must be at least 2 characters' });
		}

		try {
			const searchPattern = `%${query}%`;
			const results = await db
				.select({
					id: user.id,
					email: user.email,
					role: user.role,
					createdAt: user.createdAt,
					first_name: user.firstName,
					last_name: user.lastName
				})
				.from(user)
				.where(
					or(
						ilike(user.email, searchPattern),
						ilike(user.firstName, searchPattern),
						ilike(user.lastName, searchPattern)
					)
				)
				.orderBy(user.createdAt)
				.limit(100);

			return {
				success: true,
				searchType: 'users',
				results: results.map((u) => ({
					id: u.id,
					email: u.email,
					role: u.role,
					createdAt: u.createdAt,
					first_name: u.first_name,
					last_name: u.last_name
				}))
			};
		} catch (err) {
			console.error('Error searching users:', err);
			return fail(500, { error: 'Failed to search users' });
		}
	},

	// Delete a user and clean up related records
	deleteUser: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId');
		const confirmEmail = formData.get('confirmEmail');

		if (!userId || !confirmEmail) {
			return fail(400, { error: 'User ID and confirmation email are required' });
		}

		// Prevent admin from deleting themselves
		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot delete your own account' });
		}

		try {
			// Fetch the user to verify email matches
			const [targetUser] = await db
				.select({ id: user.id, email: user.email })
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);

			if (!targetUser) {
				return fail(404, { error: 'User not found' });
			}

			if (targetUser.email !== confirmEmail) {
				return fail(400, { error: 'Email confirmation does not match' });
			}

			// Clean up related records in order
			// 1. Delete sessions
			await db.delete(session).where(eq(session.userId, userId));

			// 2. Delete password reset tokens
			await db.delete(passwordResetToken).where(eq(passwordResetToken.userId, userId));

			// 3. Delete entitlements
			await db.delete(entitlement).where(eq(entitlement.userId, userId));

			// 4. Delete staff assignments
			await db.delete(eventStaff).where(eq(eventStaff.userId, userId));

			// 5. Nullify references in tickets (keep for audit)
			await db.update(ticket).set({ userId: null }).where(eq(ticket.userId, userId));

			// 6. Nullify references in decklists (keep for public display)
			await db.update(decklist).set({ userId: null }).where(eq(decklist.userId, userId));

			// 7. Nullify references in events
			await db.update(event).set({ closedBy: null }).where(eq(event.closedBy, userId));
			await db.update(event).set({ createdBy: null }).where(eq(event.createdBy, userId));

			// 8. Nullify references in other tables
			await db.update(lssEvent).set({ createdBy: null }).where(eq(lssEvent.createdBy, userId));
			await db.update(podcast).set({ createdBy: null }).where(eq(podcast.createdBy, userId));
			await db
				.update(podcastEpisode)
				.set({ createdBy: null })
				.where(eq(podcastEpisode.createdBy, userId));
			await db.update(vod).set({ createdBy: null }).where(eq(vod.createdBy, userId));

			// 9. Nullify assignedBy in staff assignments
			await db
				.update(eventStaff)
				.set({ assignedBy: null })
				.where(eq(eventStaff.assignedBy, userId));

			// 10. Stop any billing: end the membership, and cancel an old
			//     Authorize.net subscription so it can't keep charging.
			const { endForDeletedUser } = await import('$lib/server/billing/subscriptions.js');
			await endForDeletedUser(userId);
			const [legacy] = await db
				.select({ subscriptionId: user.subscriptionId })
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);
			if (legacy?.subscriptionId && /^\d+$/.test(legacy.subscriptionId)) {
				const { authnet } = await import('$lib/server/authnet/client.js');
				try {
					await authnet.arbCancel(legacy.subscriptionId);
				} catch (err) {
					console.error('Could not cancel ARB on delete:', err?.message || err);
				}
			}

			// 11. Delete the user (savedCard cascades automatically)
			await db.delete(user).where(eq(user.id, userId));

			return { success: true, message: `User ${targetUser.email} has been deleted` };
		} catch (err) {
			console.error('Error deleting user:', err);
			return fail(500, { error: 'Failed to delete user. ' + err.message });
		}
	}
};
