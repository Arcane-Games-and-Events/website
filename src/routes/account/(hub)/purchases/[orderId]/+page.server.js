import { error } from '@sveltejs/kit';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	event as eventTable,
	order as orderTable,
	refund as refundTable,
	refundRequest,
	ticket as ticketTable
} from '$lib/server/db/schema.js';
import { ticketRefundability } from '$lib/server/payments/refunds.js';

export async function load({ params, locals, url }) {
	const u = locals.user;
	const [o] = await db
		.select()
		.from(orderTable)
		.where(
			and(
				eq(orderTable.id, params.orderId),
				sql`(${orderTable.userId} = ${u.id} or lower(${orderTable.userEmail}) = lower(${u.email}))`
			)
		)
		.limit(1);
	if (!o) throw error(404, 'Purchase not found');

	const tickets = await db
		.select({
			id: ticketTable.id,
			code: ticketTable.code,
			firstName: ticketTable.firstName,
			lastName: ticketTable.lastName,
			gemId: ticketTable.gemId,
			amountPaid: ticketTable.amountPaid,
			transactionId: ticketTable.transactionId,
			refunded: ticketTable.refunded,
			refundedAt: ticketTable.refundedAt,
			eventId: ticketTable.eventId
		})
		.from(ticketTable)
		.where(eq(ticketTable.orderId, o.id));
	const eventId = tickets[0]?.eventId || o.meta?.eventId || null;
	const [ev] = eventId
		? await db.select().from(eventTable).where(eq(eventTable.id, eventId)).limit(1)
		: [];
	const pending = tickets.length
		? await db
				.select()
				.from(refundRequest)
				.where(
					and(
						inArray(
							refundRequest.ticketId,
							tickets.map((t) => t.id)
						),
						eq(refundRequest.status, 'pending')
					)
				)
		: [];
	const refunds = /^\d+$/.test(String(o.providerRef))
		? await db
				.select()
				.from(refundTable)
				.where(
					and(eq(refundTable.transId, String(o.providerRef)), eq(refundTable.status, 'succeeded'))
				)
		: [];

	const amount = Number(o.amount) || 0;
	const refunded = Number(o.refundedAmount) || 0;
	return {
		isNew: url.searchParams.get('new') === '1',
		order: {
			id: o.id,
			createdAt: o.createdAt,
			amount,
			refunded,
			refundedAt: o.refundedAt,
			kind: o.kind || o.meta?.type || 'purchase',
			title: o.meta?.eventTitle || o.meta?.description || 'AGE Premium',
			cardLastFour: o.meta?.cardLastFour || null,
			cardType: o.meta?.cardType || null,
			invoiceNumber: o.meta?.invoiceNumber || null,
			transactionId: /^\d+$/.test(String(o.providerRef)) ? String(o.providerRef) : null,
			listAmount: o.meta?.listAmount ? Number(o.meta.listAmount) : null,
			discountAmount: o.meta?.discountAmount ? Number(o.meta.discountAmount) : null,
			subscriptionType: o.meta?.subscriptionType || null,
			promoCode: o.meta?.promoCode || null,
			periodStart: o.meta?.periodStart || null,
			periodEnd: o.meta?.periodEnd || null
		},
		event: ev
			? {
					id: ev.id,
					title: ev.title,
					eventDate: ev.eventDate,
					location: ev.location,
					address: ev.address
				}
			: null,
		tickets: tickets.map((t) => ({
			...t,
			can: ticketRefundability(t, ev, pending.find((p) => p.ticketId === t.id) || null),
			requestPending: pending.some((p) => p.ticketId === t.id)
		})),
		refunds: refunds.map((r) => ({
			id: r.id,
			amountCents: r.amountCents,
			method: r.method,
			completedAt: r.completedAt
		}))
	};
}
