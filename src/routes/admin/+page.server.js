import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, order, user, eventStaff } from '$lib/server/db/schema.js';
import { desc, eq, count, and } from 'drizzle-orm';

export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin');
	}

	try {
		// Fetch events
		const events = await db.select().from(event).orderBy(desc(event.createdAt));

		// Fetch recent orders (last 10)
		const recentOrders = await db
			.select()
			.from(order)
			.orderBy(desc(order.createdAt))
			.limit(10);

		// Get stats
		const [eventCount] = await db.select({ count: count() }).from(event);
		const [orderCount] = await db.select({ count: count() }).from(order);
		const [premiumCount] = await db
			.select({ count: count() })
			.from(user)
			.where(eq(user.role, 'premium'));

		// Fetch tournament staff users
		const tournamentStaff = await db
			.select()
			.from(user)
			.where(eq(user.role, 'tournament_staff'));

		// Fetch event staff assignments
		const staffAssignments = await db
			.select()
			.from(eventStaff);

		// Fetch all users for user management
		const allUsers = await db
			.select({
				id: user.id,
				email: user.email,
				role: user.role,
				createdAt: user.createdAt
			})
			.from(user)
			.orderBy(desc(user.createdAt));

		return {
			user: locals.user,
			events,
			recentOrders,
			tournamentStaff,
			staffAssignments,
			allUsers,
			stats: {
				totalEvents: eventCount.count,
				totalOrders: orderCount.count,
				premiumUsers: premiumCount.count
			}
		};
	} catch (error) {
		console.error('Admin page load error:', error);
		// Return default values if there's an error
		return {
			user: locals.user,
			events: [],
			recentOrders: [],
			tournamentStaff: [],
			staffAssignments: [],
			allUsers: [],
			stats: {
				totalEvents: 0,
				totalOrders: 0,
				premiumUsers: 0
			}
		};
	}
}

export const actions = {
	// Assign tournament staff to an event
	assignStaff: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const staffId = formData.get('staffId');
		const eventId = formData.get('eventId');

		try {
			// Check if assignment already exists
			const existing = await db
				.select()
				.from(eventStaff)
				.where(and(
					eq(eventStaff.userId, staffId),
					eq(eventStaff.eventId, eventId)
				))
				.limit(1);

			if (existing.length > 0) {
				return fail(400, { error: 'Staff member already assigned to this event' });
			}

			// Create assignment
			await db.insert(eventStaff).values({
				userId: staffId,
				eventId,
				assignedBy: locals.user.id
			});

			return { success: true, message: 'Staff assigned successfully' };
		} catch (err) {
			console.error('Error assigning staff:', err);
			return fail(500, { error: 'Failed to assign staff' });
		}
	},

	// Remove tournament staff from an event
	unassignStaff: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const staffId = formData.get('staffId');
		const eventId = formData.get('eventId');

		try {
			await db
				.delete(eventStaff)
				.where(and(
					eq(eventStaff.userId, staffId),
					eq(eventStaff.eventId, eventId)
				));

			return { success: true, message: 'Staff unassigned successfully' };
		} catch (err) {
			console.error('Error unassigning staff:', err);
			return fail(500, { error: 'Failed to unassign staff' });
		}
	},

	// Update user role
	updateUserRole: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId');
		const newRole = formData.get('role');

		// Validate role
		const validRoles = ['free', 'premium', 'admin', 'writer', 'tournament_staff'];
		if (!validRoles.includes(newRole)) {
			return fail(400, { error: 'Invalid role' });
		}

		// Prevent admin from changing their own role
		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot change your own role' });
		}

		try {
			await db
				.update(user)
				.set({ role: newRole })
				.where(eq(user.id, userId));

			return { success: true, message: `User role updated to ${newRole}` };
		} catch (err) {
			console.error('Error updating user role:', err);
			return fail(500, { error: 'Failed to update user role' });
		}
	}
};
