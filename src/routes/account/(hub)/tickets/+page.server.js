import { fail } from '@sveltejs/kit';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	event as eventTable,
	refundRequest,
	ticket as ticketTable
} from '$lib/server/db/schema.js';
import {
	memberRefundTicket,
	ticketRefundability,
	withdrawRefundRequest
} from '$lib/server/payments/refunds.js';

export async function load({ locals }) {
	const rows = await db
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
			createdAt: ticketTable.createdAt,
			orderId: ticketTable.orderId,
			eventId: eventTable.id,
			eventTitle: eventTable.title,
			eventDate: eventTable.eventDate,
			location: eventTable.location,
			circuit: eventTable.circuit,
			format: eventTable.format,
			enteredIntoGem: ticketTable.enteredIntoGem,
			tournamentResults: eventTable.tournamentResults,
			eventStatus: eventTable.status
		})
		.from(ticketTable)
		.innerJoin(eventTable, eq(eventTable.id, ticketTable.eventId))
		.where(eq(ticketTable.userId, locals.user.id))
		.orderBy(desc(eventTable.eventDate), desc(ticketTable.createdAt));

	const ids = rows.map((r) => r.id);
	const requests = ids.length
		? await db
				.select()
				.from(refundRequest)
				.where(
					and(
						inArray(refundRequest.ticketId, ids),
						inArray(refundRequest.status, ['pending', 'declined'])
					)
				)
		: [];
	const byTicket = new Map();
	for (const r of requests)
		if (!byTicket.has(r.ticketId) || r.status === 'pending') byTicket.set(r.ticketId, r);

	const now = new Date();
	const tickets = rows.map((t) => {
		const req = byTicket.get(t.id) || null;
		const pending = req?.status === 'pending' ? req : null;
		const can = ticketRefundability(
			{ ...t },
			{ eventDate: t.eventDate, circuit: t.circuit },
			pending,
			now
		);
		// Played once the day is over, or once staff close the event out.
		const past =
			t.eventStatus === 'completed' ||
			t.eventStatus === 'cancelled' ||
			(t.eventDate ? new Date(t.eventDate).getTime() < now.getTime() - 86400000 : false);
		// The player's own finish, once results are in.
		let finish = null;
		if (Array.isArray(t.tournamentResults) && t.tournamentResults.length) {
			const me = `${t.firstName || ''} ${t.lastName || ''}`.trim().toLowerCase();
			const mine = t.tournamentResults.find(
				(r) =>
					(t.gemId && String(r.gemId || '') === String(t.gemId)) ||
					(!t.gemId && `${r.playerName || r.name || ''}`.toLowerCase() === me)
			);
			if (mine) {
				finish = {
					rank: mine.rank ?? mine.placement ?? null,
					of: t.tournamentResults.length,
					wins: mine.wins ?? null,
					losses: mine.losses ?? null
				};
			}
		}
		const { tournamentResults: _r, ...rest } = t;
		void _r;
		return {
			...rest,
			finish,
			request: req
				? {
						id: req.id,
						status: req.status,
						reason: req.reason,
						decisionNote: req.decisionNote,
						createdAt: req.createdAt
					}
				: null,
			can,
			past
		};
	});
	return {
		upcoming: tickets.filter((t) => !t.past),
		past: tickets.filter((t) => t.past)
	};
}

export const actions = {
	refund: async ({ locals, request }) => {
		const form = await request.formData();
		const r = await memberRefundTicket({
			user: locals.user,
			ticketId: form.get('ticketId')?.toString(),
			reason: form.get('reason')?.toString().slice(0, 300) || null
		});
		if (!r.ok && r.status !== 'waiting_settlement') return fail(400, { error: r.message });
		return { success: true, message: r.message };
	},
	withdraw: async ({ locals, request }) => {
		const form = await request.formData();
		const r = await withdrawRefundRequest({
			user: locals.user,
			requestId: form.get('requestId')?.toString()
		});
		if (!r.ok) return fail(400, { error: 'That request is no longer pending.' });
		return { success: true, message: 'Request withdrawn. Your ticket stands.' };
	}
};
