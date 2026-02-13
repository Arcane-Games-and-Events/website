import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
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
		const validRoles = ['free', 'premium', 'admin', 'writer', 'tournament staff'];
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
	}
};
