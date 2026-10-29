import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { event as eventTable } from '$lib/server/db/schema.js';
import { authnet, describeOutcome } from '$lib/server/authnet/client.js';
import { guardPayment } from '$lib/server/ratelimit.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { recordConversion } from '$lib/server/contentAnalytics/collect.js';
import { ownedCard, isExpired, saveCardFromTransaction } from '$lib/server/payments/cards.js';
import {
	claimCheckout,
	createCheckout,
	fulfilCheckout,
	markCheckout,
	validatePlayers
} from '$lib/server/payments/checkout.js';

/**
 * POST /api/events/[eventId]/purchase
 *
 * Body: {
 *   players: [{ firstName, lastName, gemId? }],
 *   payment: { savedCardId } | { opaqueData, billTo, expiry, lastFour, saveCard },
 *   idempotencyKey: string
 * }
 *
 * The price is worked out on the server. A `checkout` row holds the seats
 * and carries the invoice number before the card is charged; an approved
 * charge becomes an order and tickets exactly once.
 *
 * Responses: 200 success · 202 pending (poll /api/checkout/[id]) ·
 * 400 bad request · 402 declined · 409 full / in progress · 429 slow down.
 */
export async function POST({ params, request, locals, cookies, url, getClientAddress }) {
	const user = locals.user;
	if (!user) return json({ error: 'Sign in to buy tickets.' }, { status: 401 });

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request' }, { status: 400 });
	}
	const { players: rawPlayers, payment = {}, idempotencyKey } = body || {};
	if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length > 80) {
		return json({ error: 'Bad request' }, { status: 400 });
	}

	const limited = await guardPayment({
		userId: user.id,
		ip: getClientAddress(),
		card: !!payment.opaqueData
	});
	if (limited)
		return json(
			{ error: limited.error },
			{ status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
		);

	const [ev] = await db.select().from(eventTable).where(eq(eventTable.id, params.eventId)).limit(1);
	if (!ev) return json({ error: 'Event not found' }, { status: 404 });
	if (ev.status === 'cancelled')
		return json({ error: 'This event has been cancelled.' }, { status: 400 });
	if (ev.eventDate) {
		const end = new Date(ev.eventDate);
		end.setUTCHours(23, 59, 59, 999);
		if (end < new Date())
			return json({ error: 'Registration for this event has closed.' }, { status: 400 });
	}

	const v = validatePlayers(rawPlayers, { gemIdRequired: !!ev.gemIdRequired });
	if (v.error) return json({ error: v.error }, { status: 400 });

	const isPremium = userHasPremiumAccess(user);
	const created = await createCheckout({
		user,
		event: ev,
		players: v.players,
		idempotencyKey,
		isPremium,
		saveCard: !!payment.saveCard
	});
	if (created.error)
		return json({ error: created.error, full: created.full }, { status: created.status });
	let co = created.checkout;

	// A retry of a request we already finished, or one still in flight.
	if (co.status === 'fulfilled') return json(await success(co, user));
	if (co.status === 'charging' || co.status === 'unknown' || co.status === 'paid') {
		return json(
			{ pending: true, checkoutId: co.id, message: 'Your payment is being confirmed.' },
			{ status: 202 }
		);
	}

	// Free (fully discounted) order: no gateway.
	if (co.amountCents === 0) {
		const claimed = await claimCheckout(co.id);
		if (!claimed) return json({ pending: true, checkoutId: co.id }, { status: 202 });
		const result = await fulfilCheckout(co.id, { transId: null, email: user.email });
		await recordConversion({ cookies, url }, user.id, 'ticket', {
			meta: { eventId: ev.id, amount: 0, premiumDiscount: true, quantity: v.players.length }
		});
		return json(await success(result.checkout, user, result));
	}

	// The card.
	let charge;
	if (payment.savedCardId) {
		let card;
		try {
			card = await ownedCard(user.id, payment.savedCardId);
		} catch {
			return json({ error: 'Saved card not found.' }, { status: 404 });
		}
		if (card.status !== 'active' || isExpired(card)) {
			return json({ error: 'That saved card has expired. Use a different card.' }, { status: 400 });
		}
		charge = () =>
			authnet.chargeProfile({
				customerProfileId: card.customerProfileId,
				paymentProfileId: card.paymentProfileId,
				amountCents: co.amountCents,
				invoiceNumber: co.invoiceNumber,
				description:
					`${v.players.length} ticket${v.players.length > 1 ? 's' : ''}: ${ev.title}`.slice(0, 255),
				customerId: user.id,
				email: user.email
			});
		charge.lastFour = card.lastFour;
		charge.cardType = card.cardType;
	} else if (payment.opaqueData?.dataValue) {
		charge = () =>
			authnet.chargeOpaque({
				opaqueData: payment.opaqueData,
				amountCents: co.amountCents,
				invoiceNumber: co.invoiceNumber,
				description:
					`${v.players.length} ticket${v.players.length > 1 ? 's' : ''}: ${ev.title}`.slice(0, 255),
				customerId: user.id,
				email: user.email,
				billTo: payment.billTo || { firstName: user.firstName, lastName: user.lastName }
			});
		charge.lastFour = String(payment.lastFour || '').slice(-4) || null;
	} else {
		return json({ error: 'Choose a saved card or enter a new one.' }, { status: 400 });
	}

	const claimed = await claimCheckout(co.id);
	if (!claimed) return json({ pending: true, checkoutId: co.id }, { status: 202 });
	co = claimed;

	const outcome = await charge();

	if (outcome.outcome === 'approved') {
		await markCheckout(co.id, 'paid', { transId: outcome.transId });
		const result = await fulfilCheckout(co.id, {
			transId: outcome.transId,
			lastFour: outcome.lastFour || charge.lastFour,
			cardType: outcome.cardType || charge.cardType,
			networkTransId: outcome.networkTransId,
			email: user.email
		});
		let cardSaved = false;
		if (payment.opaqueData && payment.saveCard) {
			const saved = await saveCardFromTransaction({
				user,
				transId: outcome.transId,
				source: 'checkout'
			});
			cardSaved = !!saved;
		}
		await recordConversion({ cookies, url }, user.id, 'ticket', {
			meta: {
				eventId: ev.id,
				amount: co.amountCents / 100,
				premiumDiscount: co.discountCents > 0,
				quantity: v.players.length
			}
		});
		return json(
			await success(result.checkout, user, result, {
				cardSaved,
				saveRequested: !!(payment.opaqueData && payment.saveCard)
			})
		);
	}
	if (outcome.outcome === 'unknown') {
		await markCheckout(co.id, 'unknown', {
			error: outcome.message,
			transId: outcome.transId || null
		});
		return json(
			{ pending: true, checkoutId: co.id, message: describeOutcome(outcome) },
			{ status: 202 }
		);
	}
	await markCheckout(co.id, outcome.outcome === 'declined' ? 'declined' : 'failed', {
		error: `${outcome.code || ''} ${outcome.message || ''}`.trim()
	});
	return json(
		{ error: describeOutcome(outcome), code: outcome.code },
		{ status: outcome.outcome === 'declined' ? 402 : 502 }
	);
}

async function success(co, user, result = null, extra = {}) {
	let order = result?.order;
	let tickets = result?.tickets;
	if (!tickets) {
		const r = await fulfilCheckout(co.id, { transId: co.transId, email: user.email });
		order = r.order;
		tickets = r.tickets;
	}
	const first = tickets[0];
	return {
		success: true,
		orderId: order?.id,
		ticketId: first?.id,
		ticketCode: first?.code,
		ticketIds: tickets.map((t) => t.id),
		redirectUrl:
			tickets.length > 1
				? `/account/purchases/${order.id}?new=1`
				: `/events/${co.eventId}/ticket/${first.id}?new=1`,
		...extra
	};
}
