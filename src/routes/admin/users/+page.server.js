import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
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
import { eq, or, ilike, sql } from 'drizzle-orm';

// Helper to add timeout to promises
const withTimeout = (promise, ms, fallback) =>
	Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/users');
	}

	try {
		// Single RPC call replaces 20+ individual queries with 15s timeout
		const result = await withTimeout(
			db.execute(sql`SELECT get_admin_dashboard_stats() as data`),
			15000,
			null
		);

		if (!result) {
			console.warn('Admin users RPC timed out - returning empty data');
			return { user: locals.user, allUsers: [], stats: { totalUsers: 0 } };
		}

		const data = result.rows?.[0]?.data || result[0]?.data;

		if (!data) {
			throw new Error('No data returned from get_admin_dashboard_stats()');
		}

		return {
			user: locals.user,
			allUsers: data.users || [],
			stats: {
				totalUsers: parseInt(data.stats?.totalUsers) || 0
			}
		};
	} catch (error) {
		console.error('Admin users page load error:', error);

		if (error.message?.includes('get_admin_dashboard_stats')) {
			console.error(
				'RPC function not found. Run the migration: supabase/migrations/001_rpc_functions.sql'
			);
		}

		return {
			user: locals.user,
			allUsers: [],
			stats: { totalUsers: 0 }
		};
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
		const validRoles = ['free', 'premium', 'admin', 'writer', 'creator', 'tournament staff'];
		if (!validRoles.includes(newRole)) {
			return fail(400, { error: 'Invalid role' });
		}

		// Prevent admin from changing their own role
		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot change your own role' });
		}

		try {
			await db.update(user).set({ role: newRole }).where(eq(user.id, userId));

			return { success: true, message: `User role updated to ${newRole}` };
		} catch (err) {
			console.error('Error updating user role:', err);
			return fail(500, { error: 'Failed to update user role' });
		}
	},

	// Toggle a single additional role on a user (writer / creator extras).
	updateAdditionalRoles: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId');
		// Form submits each enabled role as its own value; FormData.getAll returns
		// the full set so we replace the whole column atomically.
		const incoming = formData.getAll('additionalRoles').map((v) => String(v));
		const validExtras = new Set(['writer', 'creator']);
		const next = Array.from(new Set(incoming.filter((r) => validExtras.has(r))));

		try {
			await db.update(user).set({ additionalRoles: next }).where(eq(user.id, userId));
			return {
				success: true,
				message:
					next.length === 0
						? 'Cleared additional roles'
						: `Updated additional roles: ${next.join(', ')}`
			};
		} catch (err) {
			console.error('Error updating additional roles:', err);
			return fail(500, { error: 'Failed to update additional roles' });
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
					additionalRoles: user.additionalRoles,
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
					additionalRoles: u.additionalRoles || [],
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

			// 10. Delete the user (savedCard cascades automatically)
			await db.delete(user).where(eq(user.id, userId));

			return { success: true, message: `User ${targetUser.email} has been deleted` };
		} catch (err) {
			console.error('Error deleting user:', err);
			return fail(500, { error: 'Failed to delete user. ' + err.message });
		}
	}
};
