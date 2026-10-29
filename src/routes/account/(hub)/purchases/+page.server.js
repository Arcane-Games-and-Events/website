import { desc, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	event as eventTable,
	order as orderTable,
	subscriptionInvoice,
	ticket as ticketTable
} from '$lib/server/db/schema.js';

const isMembership = (o) =>
	(o.kind || '').startsWith('subscription') ||
	o.kind === 'legacy_subscription' ||
	(o.meta?.type || '').startsWith('subscription');

export async function load({ locals }) {
	const u = locals.user;
	const rows = await db
		.select()
		.from(orderTable)
		.where(
			sql`${orderTable.userId} = ${u.id} or lower(${orderTable.userEmail}) = lower(${u.email})`
		)
		.orderBy(desc(orderTable.createdAt))
		.limit(300);

	// What each order was for: its event, the players on it, the period a
	// membership charge paid for.
	const ids = rows.map((o) => o.id);
	const eventIds = [...new Set(rows.map((o) => o.meta?.eventId).filter(Boolean))];
	const [events, tickets, invoices] = await Promise.all([
		eventIds.length
			? db
					.select({
						id: eventTable.id,
						title: eventTable.title,
						eventDate: eventTable.eventDate,
						circuit: eventTable.circuit,
						location: eventTable.location
					})
					.from(eventTable)
					.where(inArray(eventTable.id, eventIds))
			: [],
		ids.length
			? db
					.select({
						orderId: ticketTable.orderId,
						firstName: ticketTable.firstName,
						lastName: ticketTable.lastName,
						refunded: ticketTable.refunded,
						eventId: ticketTable.eventId
					})
					.from(ticketTable)
					.where(inArray(ticketTable.orderId, ids))
			: [],
		ids.length
			? db
					.select({
						orderId: subscriptionInvoice.orderId,
						periodStart: subscriptionInvoice.periodStart,
						periodEnd: subscriptionInvoice.periodEnd,
						kind: subscriptionInvoice.kind,
						plan: subscriptionInvoice.plan
					})
					.from(subscriptionInvoice)
					.where(inArray(subscriptionInvoice.orderId, ids))
			: []
	]);
	const eventById = new Map(events.map((e) => [e.id, e]));
	const ticketsByOrder = new Map();
	for (const t of tickets) {
		if (!ticketsByOrder.has(t.orderId)) ticketsByOrder.set(t.orderId, []);
		ticketsByOrder.get(t.orderId).push(t);
	}
	const invoiceByOrder = new Map(invoices.map((i) => [i.orderId, i]));

	const orders = rows.map((o) => {
		const amount = Number(o.amount) || 0;
		const refunded = Math.min(amount, Number(o.refundedAmount) || 0);
		const status =
			amount > 0 && refunded >= amount - 0.001
				? 'refunded'
				: refunded > 0
					? 'partly refunded'
					: o.refundedAt
						? 'refunded'
						: 'paid';
		const card = o.meta?.cardLastFour
			? { brand: o.meta?.cardType || 'Card', lastFour: o.meta.cardLastFour }
			: null;

		if (isMembership(o)) {
			const inv = invoiceByOrder.get(o.id);
			const plan = inv?.plan || o.meta?.subscriptionType || null;
			const renewal = o.kind === 'subscription_renewal' || o.meta?.type === 'subscription_renewal';
			return {
				id: o.id,
				type: 'membership',
				createdAt: o.createdAt,
				amount,
				refunded,
				status,
				card,
				title:
					plan === 'yearly'
						? 'Annual membership'
						: plan === 'monthly'
							? 'Monthly membership'
							: 'AGE Premium',
				label: renewal ? 'Renewal' : 'Membership',
				periodStart: inv?.periodStart || o.meta?.periodStart || null,
				periodEnd: inv?.periodEnd || o.meta?.periodEnd || null,
				promoCode: o.meta?.promoCode || null,
				discount: Number(o.meta?.discountAmount) || 0
			};
		}

		const ev = eventById.get(o.meta?.eventId) || null;
		const players = ticketsByOrder.get(o.id) || [];
		const names = players
			.map((t) => [t.firstName, t.lastName].filter(Boolean).join(' '))
			.filter(Boolean);
		return {
			id: o.id,
			type: 'tickets',
			createdAt: o.createdAt,
			amount,
			refunded,
			status,
			card,
			title: ev?.title || o.meta?.eventTitle || 'AGE Open',
			label: 'Tickets',
			eventId: ev?.id || o.meta?.eventId || null,
			eventDate: ev?.eventDate || null,
			circuit: ev?.circuit || null,
			location: ev?.location || null,
			quantity: players.length || Number(o.meta?.quantity) || 1,
			players: names,
			refundedTickets: players.filter((t) => t.refunded).length,
			discount: Number(o.meta?.discountAmount) || 0
		};
	});

	return { orders };
}
