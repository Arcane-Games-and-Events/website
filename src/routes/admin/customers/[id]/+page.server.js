import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { order, user, ticket, entitlement, event } from '$lib/server/db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';

export async function load({ params, locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin');
	}

	const customerId = decodeURIComponent(params.id);

	// Determine if this is a user ID or an email (for guest customers)
	const isEmail = customerId.includes('@');

	try {
		// Fetch customer user record (if they have an account)
		let customerData = null;
		let customerEmail = isEmail ? customerId : null;

		if (isEmail) {
			// Look up by email (guest customer or account lookup by email)
			const [result] = await db
				.select({
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					gemId: user.gemId,
					role: user.role,
					subscriptionId: user.subscriptionId,
					subscriptionType: user.subscriptionType,
					subscriptionStatus: user.subscriptionStatus,
					subscriptionStartDate: user.subscriptionStartDate,
					subscriptionEndDate: user.subscriptionEndDate,
					nextBillingDate: user.nextBillingDate,
					createdAt: user.createdAt
				})
				.from(user)
				.where(eq(user.email, customerId))
				.limit(1);
			customerData = result || null;
		} else {
			// Look up by user ID
			const [result] = await db
				.select({
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					gemId: user.gemId,
					role: user.role,
					subscriptionId: user.subscriptionId,
					subscriptionType: user.subscriptionType,
					subscriptionStatus: user.subscriptionStatus,
					subscriptionStartDate: user.subscriptionStartDate,
					subscriptionEndDate: user.subscriptionEndDate,
					nextBillingDate: user.nextBillingDate,
					createdAt: user.createdAt
				})
				.from(user)
				.where(eq(user.id, customerId))
				.limit(1);
			customerData = result || null;
			customerEmail = customerData?.email || null;
		}

		// If we have a user, use their email for order lookups
		if (customerData) {
			customerEmail = customerData.email;
		}

		// If no email found (invalid ID and not an email), redirect
		if (!customerEmail) {
			throw redirect(302, '/admin?tab=orders');
		}

		// Fetch all orders for this customer
		const customerOrders = await db
			.select()
			.from(order)
			.where(eq(order.userEmail, customerEmail))
			.orderBy(desc(order.createdAt));

		if (customerOrders.length === 0 && !customerData) {
			// No orders and no user record - redirect back
			throw redirect(302, '/admin?tab=orders');
		}

		// Calculate stats
		const totalSpent = customerOrders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
		const ordersByType = {
			ticket: customerOrders.filter((o) => o.meta?.type === 'ticket'),
			course: customerOrders.filter((o) => o.meta?.type === 'course'),
			subscription: customerOrders.filter((o) => o.meta?.type === 'subscription'),
			other: customerOrders.filter(
				(o) => !['ticket', 'course', 'subscription'].includes(o.meta?.type)
			)
		};

		const firstOrder = customerOrders.length
			? customerOrders.reduce((min, o) =>
					new Date(o.createdAt) < new Date(min.createdAt) ? o : min
				)
			: null;

		const lastOrder = customerOrders.length
			? customerOrders.reduce((max, o) =>
					new Date(o.createdAt) > new Date(max.createdAt) ? o : max
				)
			: null;

		// Get ticket IDs from orders for this customer
		const ticketOrders = customerOrders.filter(
			(o) => o.meta?.type === 'ticket' && o.meta?.ticketId
		);
		const ticketIds = ticketOrders.map((o) => o.meta.ticketId);

		// Fetch tickets for this customer
		const ticketsRaw =
			ticketIds.length > 0
				? await db
						.select()
						.from(ticket)
						.where(inArray(ticket.id, ticketIds))
						.orderBy(desc(ticket.createdAt))
				: [];

		// Fetch associated events for these tickets
		const eventIds = [...new Set(ticketsRaw.map((t) => t.eventId).filter(Boolean))];
		const eventsData =
			eventIds.length > 0 ? await db.select().from(event).where(inArray(event.id, eventIds)) : [];

		// Combine tickets with their events
		const eventsMap = new Map(eventsData.map((e) => [e.id, e]));
		const customerTickets = ticketsRaw.map((t) => ({
			ticket: t,
			event: eventsMap.get(t.eventId) || null
		}));

		// Count active tickets (not refunded, event not passed)
		const now = new Date();
		const activeTickets = customerTickets.filter((t) => {
			if (t.ticket.refunded) return false;
			if (t.event?.eventDate && new Date(t.event.eventDate) < now) return false;
			return true;
		});

		// Fetch entitlements (courses) for this customer if they have an account
		const customerEntitlements = customerData
			? await db
					.select()
					.from(entitlement)
					.where(eq(entitlement.userId, customerData.id))
					.orderBy(desc(entitlement.createdAt))
			: [];

		return {
			user: locals.user,
			customerEmail,
			customer: customerData || null,
			hasAccount: !!customerData,
			orders: customerOrders,
			stats: {
				totalOrders: customerOrders.length,
				totalSpent,
				avgOrderValue: customerOrders.length > 0 ? totalSpent / customerOrders.length : 0,
				firstOrder,
				lastOrder
			},
			ordersByType: {
				ticket: {
					count: ordersByType.ticket.length,
					total: ordersByType.ticket.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0)
				},
				course: {
					count: ordersByType.course.length,
					total: ordersByType.course.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0)
				},
				subscription: {
					count: ordersByType.subscription.length,
					total: ordersByType.subscription.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0)
				}
			},
			tickets: customerTickets,
			activeTicketsCount: activeTickets.length,
			entitlements: customerEntitlements
		};
	} catch (err) {
		if (err.status === 302) {
			throw err;
		}
		console.error('Error loading customer:', err);
		throw redirect(302, '/admin?tab=orders');
	}
}

export const actions = {
	updateRole: async ({ params, request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}

		const customerId = decodeURIComponent(params.id);
		const isEmail = customerId.includes('@');
		const formData = await request.formData();
		const role = formData.get('role');

		if (!role) {
			return fail(400, { error: 'Role is required' });
		}

		const validRoles = ['free', 'premium', 'writer', 'tournament staff', 'admin'];
		if (!validRoles.includes(role)) {
			return fail(400, { error: 'Invalid role' });
		}

		try {
			if (isEmail) {
				await db.update(user).set({ role }).where(eq(user.email, customerId));
			} else {
				await db.update(user).set({ role }).where(eq(user.id, customerId));
			}

			return { success: true, message: `Role updated to ${role}` };
		} catch (err) {
			console.error('Error updating role:', err);
			return fail(500, { error: 'Failed to update role' });
		}
	},

	cancelSubscription: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}

		const customerId = decodeURIComponent(params.id);
		const isEmail = customerId.includes('@');

		try {
			// Get user data
			const [userData] = await db
				.select()
				.from(user)
				.where(isEmail ? eq(user.email, customerId) : eq(user.id, customerId))
				.limit(1);

			if (!userData) {
				return fail(404, { error: 'User not found' });
			}

			if (!userData.subscriptionId) {
				return fail(400, { error: 'User has no active subscription' });
			}

			// Cancel subscription with Authorize.net
			const { authnet } = await import('$lib/server/authnet/client.js');
			try {
				await authnet.cancelSubscription(userData.subscriptionId);
			} catch (cancelErr) {
				console.log(
					'Subscription cancellation error (may already be cancelled):',
					cancelErr.message
				);
			}

			// Update user record
			await db
				.update(user)
				.set({
					subscriptionStatus: 'cancelled',
					role: 'free'
				})
				.where(eq(user.id, userData.id));

			return { success: true, message: 'Subscription cancelled and user downgraded to free tier' };
		} catch (err) {
			console.error('Error cancelling subscription:', err);
			return fail(500, { error: 'Failed to cancel subscription' });
		}
	}
};
