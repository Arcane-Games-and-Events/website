import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { bump } from '$lib/server/cache/index.js';
import { setMemberRole } from '$lib/server/payments/ledger.js';
import {
	order,
	user,
	ticket,
	entitlement,
	event,
	payment,
	memberEvent
} from '$lib/server/db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';
import {
	membershipFor,
	cancelSubscription,
	adminEndNow,
	adminExtend,
	adminHold
} from '$lib/server/billing/subscriptions.js';
import { chargeSubscriptionNow } from '$lib/server/billing/renewals.js';
import { liveSubscription } from '$lib/server/billing/access.js';
import { cancelLegacyMembership } from '$lib/server/billing/legacy.js';
import { refundTransaction } from '$lib/server/payments/refunds.js';

export async function load({ params, locals }) {
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
			throw redirect(302, '/admin/orders');
		}

		// Fetch all orders for this customer
		const customerOrders = await db
			.select()
			.from(order)
			.where(eq(order.userEmail, customerEmail))
			.orderBy(desc(order.createdAt));

		if (customerOrders.length === 0 && !customerData) {
			// No orders and no user record - redirect back
			throw redirect(302, '/admin/orders');
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

		// The membership (new billing system), the money ledger and the history.
		let membership = null;
		let ledger = [];
		let history = [];
		if (customerData) {
			const m = await membershipFor(customerData.id);
			const sub = m.subscription || m.latest;
			membership = {
				subscription: sub,
				live: !!m.subscription,
				invoices: m.invoices,
				card: m.card,
				cards: m.cards,
				comp: m.comp,
				legacy: m.legacy
			};
			ledger = await db
				.select()
				.from(payment)
				.where(eq(payment.userId, customerData.id))
				.orderBy(desc(payment.occurredAt))
				.limit(100);
			history = await db
				.select()
				.from(memberEvent)
				.where(eq(memberEvent.userId, customerData.id))
				.orderBy(desc(memberEvent.at))
				.limit(50);
		}

		return {
			user: locals.user,
			customerEmail,
			customer: customerData || null,
			hasAccount: !!customerData,
			membership,
			ledger,
			history,
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
		throw redirect(302, '/admin/orders');
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
			const [target] = await db
				.select({ id: user.id })
				.from(user)
				.where(isEmail ? eq(user.email, customerId) : eq(user.id, customerId))
				.limit(1);
			if (!target) return fail(404, { error: 'User not found' });
			const result = await setMemberRole({
				userId: target.id,
				role,
				compReason: formData.get('compReason')?.toString() || null,
				actorId: locals.user.id
			});
			if (!result.ok) return fail(400, { error: result.error });
			await bump('users', `user:${target.id}`);

			return { success: true, message: `Role updated to ${role}` };
		} catch (err) {
			console.error('Error updating role:', err);
			return fail(500, { error: 'Failed to update role' });
		}
	},

	/** Cancel at period end (new system) or cancel the old ARB (legacy). */
	cancelSubscription: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'admin')
			return fail(403, { error: 'Admin access required' });
		const target = await targetUser(params.id);
		if (!target) return fail(404, { error: 'User not found' });
		try {
			if (await liveSubscription(target.id)) {
				const r = await cancelSubscription({
					user: target,
					actorId: locals.user.id,
					reason: 'admin'
				});
				if (!r.ok) return fail(r.status || 400, { error: r.error });
				return {
					success: true,
					message: r.endedNow
						? 'Membership ended.'
						: `Cancelled; access runs to ${r.accessUntil?.toISOString?.().slice(0, 10)}.`
				};
			}
			if (!target.subscriptionId) return fail(400, { error: 'No subscription on file.' });
			const r = await cancelLegacyMembership(target, { actorId: locals.user.id });
			if (!r.ok) return fail(502, { error: r.error });
			return {
				success: true,
				message: `Old Authorize.net subscription cancelled; access runs to ${r.accessUntil.toISOString().slice(0, 10)}.`
			};
		} catch (err) {
			console.error('Error cancelling subscription:', err);
			return fail(500, { error: err.message || 'Failed to cancel subscription' });
		}
	},

	endNow: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin')
			return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const r = await adminEndNow({
			subscriptionId: form.get('subscriptionId')?.toString(),
			actorId: locals.user.id,
			reason: form.get('reason')?.toString() || 'admin'
		});
		if (!r.ok) return fail(400, { error: r.error });
		return { success: true, message: 'Membership ended now.' };
	},

	extend: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin')
			return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const r = await adminExtend({
			subscriptionId: form.get('subscriptionId')?.toString(),
			actorId: locals.user.id,
			days: form.get('days')
		});
		if (!r.ok) return fail(400, { error: r.error });
		return { success: true, message: `Extended to ${r.end.toISOString().slice(0, 10)}.` };
	},

	hold: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin')
			return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const r = await adminHold({
			subscriptionId: form.get('subscriptionId')?.toString(),
			hold: form.get('hold') === '1',
			actorId: locals.user.id
		});
		if (!r.ok) return fail(400, { error: r.error });
		return {
			success: true,
			message: form.get('hold') === '1' ? 'Billing held.' : 'Billing resumed.'
		};
	},

	chargeNow: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin')
			return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const r = await chargeSubscriptionNow(form.get('subscriptionId')?.toString(), {
			reason: 'admin'
		});
		if (!r.ok) return fail(400, { error: r.message });
		return { success: true, message: r.message };
	},

	/** Refund any ledger transaction, in full or part. */
	refundTransaction: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin')
			return fail(403, { error: 'Admin access required' });
		const form = await request.formData();
		const effect = form.get('subscriptionEffect')?.toString() || null;
		const r = await refundTransaction({
			transId: form.get('transId')?.toString(),
			amountCents: Math.round(Number(form.get('amount')) * 100),
			reason: form.get('reason')?.toString() || 'admin refund',
			requestedBy: locals.user.id,
			subscriptionEffect: ['keep', 'end_now', 'cancel_at_period_end'].includes(effect)
				? effect
				: null
		});
		if (!r.ok && r.status !== 'waiting_settlement') return fail(400, { error: r.message });
		await bump('orders', 'users');
		return { success: true, message: r.message };
	}
};

async function targetUser(param) {
	const id = decodeURIComponent(param);
	const [u] = await db
		.select()
		.from(user)
		.where(id.includes('@') ? eq(user.email, id) : eq(user.id, id))
		.limit(1);
	return u || null;
}
