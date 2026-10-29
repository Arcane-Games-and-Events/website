/**
 * Ticket purchases.
 *
 * The price is worked out here, never taken from the browser. A `checkout`
 * row is written before the card is charged (it holds the seats and
 * carries the invoice number), and `fulfilCheckout` turns an approved
 * charge into an order and tickets exactly once.
 */
import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '$lib/server/db/index.js';
import {
	checkout as checkoutTable,
	event as eventTable,
	order as orderTable,
	ticket as ticketTable
} from '$lib/server/db/schema.js';
import { calculatePremiumDiscount } from '$lib/server/premium-discount.js';
import { recordPayment } from '$lib/server/payments/ledger.js';
import { nextInvoiceNumber } from '$lib/server/payments/invoice.js';
import { bump } from '$lib/server/cache/index.js';
import { sendTicketReceipt } from '$lib/server/email.js';
import { sendOnce } from '$lib/server/billing/notices.js';

/** Minutes a pending checkout holds its seats. */
export const HOLD_MINUTES = 15;
export const MAX_TICKETS_PER_ORDER = 8;

const toCents = (v) => Math.round(Number(v) * 100);

/**
 * Price `quantity` tickets for an event. The member discount, if the event
 * offers one and the buyer is premium, applies to the first ticket.
 *
 * @returns {{ listCents: number, discountCents: number, amountCents: number, discountLabel: string|null,
 *   lines: Array<{ listCents: number, discountCents: number, amountCents: number }> }}
 */
export function priceTickets(event, quantity, isPremium) {
	const unit = toCents(event.price);
	const lines = [];
	for (let i = 0; i < quantity; i++) {
		let discountCents = 0;
		if (i === 0 && event.premiumDiscount && isPremium) {
			discountCents = toCents(
				calculatePremiumDiscount(Number(event.price), event.eventDate).discountAmount
			);
		}
		lines.push({ listCents: unit, discountCents, amountCents: Math.max(0, unit - discountCents) });
	}
	const sum = (k) => lines.reduce((a, l) => a + l[k], 0);
	return {
		listCents: sum('listCents'),
		discountCents: sum('discountCents'),
		amountCents: sum('amountCents'),
		discountLabel:
			event.premiumDiscount && isPremium
				? calculatePremiumDiscount(Number(event.price), event.eventDate).discountLabel
				: null,
		lines
	};
}

/** Seats taken: issued tickets plus checkouts still in flight. */
export async function seatsTaken(eventId, { tx = db, excludeCheckoutId = null } = {}) {
	const [{ tickets }] = await tx
		.select({ tickets: sql`count(*)::int` })
		.from(ticketTable)
		.where(and(eq(ticketTable.eventId, eventId), eq(ticketTable.refunded, false)));
	const holdsSince = new Date(Date.now() - HOLD_MINUTES * 60000);
	const [{ held }] = await tx
		.select({ held: sql`coalesce(sum(${checkoutTable.quantity}), 0)::int` })
		.from(checkoutTable)
		.where(
			and(
				eq(checkoutTable.eventId, eventId),
				inArray(checkoutTable.status, ['pending', 'charging', 'paid', 'unknown']),
				gt(checkoutTable.createdAt, holdsSince),
				excludeCheckoutId ? sql`${checkoutTable.id} <> ${excludeCheckoutId}` : sql`true`
			)
		);
	return Number(tickets) + Number(held);
}

/**
 * Create (or return) the checkout for an idempotency key, holding seats
 * against the player cap.
 *
 * @param {{ user: any, event: any, players: Array<{ firstName: string, lastName: string, gemId?: string|null }>,
 *   idempotencyKey: string, isPremium: boolean, saveCard?: boolean }} input
 * @returns {Promise<{ checkout: any, existing: boolean } | { error: string, status: number, full?: boolean }>}
 */
export async function createCheckout({
	user,
	event,
	players,
	idempotencyKey,
	isPremium,
	saveCard = false
}) {
	const [existing] = await db
		.select()
		.from(checkoutTable)
		.where(eq(checkoutTable.idempotencyKey, idempotencyKey))
		.limit(1);
	if (existing) {
		if (existing.userId !== user.id) return { error: 'Invalid request', status: 400 };
		return { checkout: existing, existing: true };
	}
	const price = priceTickets(event, players.length, isPremium);
	const invoiceNumber = await nextInvoiceNumber('ticket');

	try {
		return await db.transaction(async (tx) => {
			// Serialize capacity checks for this event.
			await tx.execute(sql`select 1 from events where id = ${event.id} for update`);
			if (event.playerCap != null) {
				const taken = await seatsTaken(event.id, { tx });
				if (taken + players.length > event.playerCap) {
					const left = Math.max(0, event.playerCap - taken);
					return {
						error:
							left === 0
								? 'This event is full.'
								: `Only ${left} seat${left === 1 ? '' : 's'} left.`,
						status: 409,
						full: left === 0,
						left
					};
				}
			}
			const [row] = await tx
				.insert(checkoutTable)
				.values({
					userId: user.id,
					eventId: event.id,
					idempotencyKey,
					invoiceNumber,
					status: 'pending',
					quantity: players.length,
					listCents: price.listCents,
					discountCents: price.discountCents,
					amountCents: price.amountCents,
					payload: {
						players: players.map((p) => ({
							firstName: p.firstName,
							lastName: p.lastName,
							gemId: p.gemId || null
						})),
						lines: price.lines,
						discountLabel: price.discountLabel,
						eventTitle: event.title,
						premiumDiscount: !!(event.premiumDiscount && isPremium),
						saveCard: !!saveCard
					}
				})
				.returning();
			return { checkout: row, existing: false };
		});
	} catch (err) {
		if (err?.code === '23505' || err?.cause?.code === '23505') {
			const [row] = await db
				.select()
				.from(checkoutTable)
				.where(eq(checkoutTable.idempotencyKey, idempotencyKey))
				.limit(1);
			if (row) return { checkout: row, existing: true };
		}
		throw err;
	}
}

/** Move a checkout to `charging` (only from pending/failed-to-charge states). */
export async function claimCheckout(checkoutId) {
	const [row] = await db
		.update(checkoutTable)
		.set({ status: 'charging', updatedAt: new Date() })
		.where(
			and(
				eq(checkoutTable.id, checkoutId),
				inArray(checkoutTable.status, ['pending', 'declined', 'failed'])
			)
		)
		.returning();
	return row || null;
}

export async function markCheckout(checkoutId, status, { error = null, transId = undefined } = {}) {
	const set = { status, updatedAt: new Date(), lastError: error };
	if (transId !== undefined) set.transId = transId;
	const [row] = await db
		.update(checkoutTable)
		.set(set)
		.where(eq(checkoutTable.id, checkoutId))
		.returning();
	return row;
}

/**
 * Turn an approved charge into an order and tickets. Safe to call twice:
 * the second call finds the order and returns it.
 *
 * @param {string} checkoutId
 * @param {{ transId: string|null, lastFour?: string|null, cardType?: string|null, networkTransId?: string|null, email: string }} charge
 */
export async function fulfilCheckout(checkoutId, charge) {
	const result = await db.transaction(async (tx) => {
		const [co] = await tx
			.select()
			.from(checkoutTable)
			.where(eq(checkoutTable.id, checkoutId))
			.for('update');
		if (!co) throw new Error('Checkout not found');
		if (co.status === 'fulfilled' && co.orderId) {
			const [ord] = await tx
				.select()
				.from(orderTable)
				.where(eq(orderTable.id, co.orderId))
				.limit(1);
			const tickets = await tx
				.select()
				.from(ticketTable)
				.where(eq(ticketTable.orderId, co.orderId));
			return { checkout: co, order: ord, tickets, already: true };
		}
		const [ev] = await tx.select().from(eventTable).where(eq(eventTable.id, co.eventId)).limit(1);
		const players = co.payload.players || [];
		const lines = co.payload.lines || [];
		const codes = players.map(() => crypto.randomBytes(8).toString('hex').toUpperCase());
		const transId = charge.transId || null;

		const [ord] = await tx
			.insert(orderTable)
			.values({
				provider: 'authnet',
				providerRef: transId || `free:${co.id}`,
				userEmail: charge.email,
				userId: co.userId,
				kind: 'ticket',
				amount: (co.amountCents / 100).toFixed(2),
				currency: 'USD',
				checkoutId: co.id,
				meta: {
					type: 'ticket',
					eventId: co.eventId,
					eventTitle: ev?.title || co.payload.eventTitle,
					ticketCode: codes[0],
					quantity: players.length,
					gemId: players[0]?.gemId || null,
					transactionId: transId,
					premiumDiscount: !!co.payload.premiumDiscount,
					cardLastFour: charge.lastFour || null,
					cardType: charge.cardType || null,
					invoiceNumber: co.invoiceNumber,
					listAmount: (co.listCents / 100).toFixed(2),
					discountAmount: (co.discountCents / 100).toFixed(2)
				}
			})
			.returning();

		const tickets = await tx
			.insert(ticketTable)
			.values(
				players.map((p, i) => ({
					userId: co.userId,
					eventId: co.eventId,
					orderId: ord.id,
					checkoutId: co.id,
					code: codes[i],
					quantity: 1,
					firstName: p.firstName || null,
					lastName: p.lastName || null,
					gemId: p.gemId || null,
					amountPaid: ((lines[i]?.amountCents ?? 0) / 100).toFixed(2),
					transactionId: transId,
					enteredIntoGem: false
				}))
			)
			.returning();

		await tx
			.update(orderTable)
			.set({
				meta: { ...ord.meta, ticketId: tickets[0]?.id || null, ticketIds: tickets.map((t) => t.id) }
			})
			.where(eq(orderTable.id, ord.id));

		if (transId) {
			await recordPayment(
				{
					transId,
					kind: 'ticket',
					amount: co.amountCents / 100,
					listAmount: co.listCents / 100,
					discountAmount: co.discountCents / 100,
					discountKind: co.discountCents > 0 ? 'premium_event' : null,
					userId: co.userId,
					userEmail: charge.email,
					orderId: ord.id,
					ticketId: tickets[0]?.id || null,
					eventId: co.eventId,
					source: 'app',
					verifiedAt: new Date()
				},
				{ tx }
			);
		}

		await tx
			.update(checkoutTable)
			.set({
				status: 'fulfilled',
				orderId: ord.id,
				transId,
				updatedAt: new Date(),
				lastError: null
			})
			.where(eq(checkoutTable.id, co.id));
		return { checkout: co, order: ord, tickets, event: ev, already: false };
	});

	await bump('tickets', 'orders');
	if (!result.already && charge.email) {
		await sendOnce('ticket_receipt', result.order.id, result.checkout.userId, () =>
			sendTicketReceipt(charge.email, {
				eventTitle: result.event?.title || result.checkout.payload.eventTitle,
				eventDate: result.event?.eventDate || null,
				location: result.event?.location || null,
				tickets: result.tickets.map((t) => ({
					code: t.code,
					firstName: t.firstName,
					lastName: t.lastName,
					gemId: t.gemId
				})),
				amountCents: result.checkout.amountCents,
				discountCents: result.checkout.discountCents,
				lastFour: charge.lastFour || null,
				invoiceNumber: result.checkout.invoiceNumber,
				orderId: result.order.id
			})
		);
	}
	return result;
}

/** Validate the players a buyer sent. */
export function validatePlayers(raw, { gemIdRequired }) {
	if (!Array.isArray(raw) || raw.length === 0) return { error: 'Add at least one player.' };
	if (raw.length > MAX_TICKETS_PER_ORDER)
		return { error: `Up to ${MAX_TICKETS_PER_ORDER} tickets per order.` };
	const players = [];
	for (const p of raw) {
		const firstName = String(p?.firstName || '')
			.trim()
			.slice(0, 60);
		const lastName = String(p?.lastName || '')
			.trim()
			.slice(0, 60);
		const gemId =
			String(p?.gemId || '')
				.trim()
				.slice(0, 40) || null;
		if (!firstName || !lastName) return { error: 'Each player needs a first and last name.' };
		if (gemIdRequired && !gemId)
			return { error: `A GEM ID is required for ${firstName} ${lastName}.` };
		players.push({ firstName, lastName, gemId });
	}
	return { players };
}
