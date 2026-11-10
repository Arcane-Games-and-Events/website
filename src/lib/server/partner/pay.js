/**
 * Charge a guides checkout and fulfil it: the steps the one-guide Buy
 * button and the cart share. The checkout already holds the price; this
 * only charges what it says.
 *
 * Returns `{ status, body }` for the route to send.
 */
import { authnet, describeOutcome } from '$lib/server/authnet/client.js';
import { recordConversion } from '$lib/server/contentAnalytics/collect.js';
import { ownedCard, isExpired, saveCardFromTransaction } from '$lib/server/payments/cards.js';
import { claimCheckout, markCheckout } from '$lib/server/payments/checkout.js';
import { doneUrl, fulfilGuideCheckout } from './checkout.js';

export async function payGuideCheckout({ user, co, payment = {}, cookies, url }) {
	const done = { success: true, redirectUrl: doneUrl(co) };
	const courseIds = co.payload?.courseIds || [];
	const conversion = (amount) =>
		recordConversion({ cookies, url }, user.id, 'course', {
			meta: { courseId: courseIds[0], courseIds, amount }
		});

	// A retry of a request we already finished, or one still in flight.
	if (co.status === 'fulfilled') return { status: 200, body: done };
	if (co.status === 'charging' || co.status === 'unknown' || co.status === 'paid')
		return {
			status: 202,
			body: { pending: true, checkoutId: co.id, message: 'Your payment is being confirmed.' }
		};

	// Nothing to pay (free guides): no gateway.
	if (co.amountCents === 0) {
		const claimed = await claimCheckout(co.id);
		if (!claimed) return { status: 202, body: { pending: true, checkoutId: co.id } };
		await fulfilGuideCheckout(co.id, { transId: null, email: user.email });
		await conversion(0);
		return { status: 200, body: done };
	}

	const description = `Guides: ${co.payload?.courseTitle || ''}`.slice(0, 255);
	let charge;
	if (payment.savedCardId) {
		let card;
		try {
			card = await ownedCard(user.id, payment.savedCardId);
		} catch {
			return { status: 404, body: { error: 'Saved card not found.' } };
		}
		if (card.status !== 'active' || isExpired(card))
			return {
				status: 400,
				body: { error: 'That saved card has expired. Use a different card.' }
			};
		charge = () =>
			authnet.chargeProfile({
				customerProfileId: card.customerProfileId,
				paymentProfileId: card.paymentProfileId,
				amountCents: co.amountCents,
				invoiceNumber: co.invoiceNumber,
				description,
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
				description,
				customerId: user.id,
				email: user.email,
				billTo: payment.billTo || { firstName: user.firstName, lastName: user.lastName }
			});
		charge.lastFour = String(payment.lastFour || '').slice(-4) || null;
	} else {
		return { status: 400, body: { error: 'Choose a saved card or enter a new one.' } };
	}

	const claimed = await claimCheckout(co.id);
	if (!claimed) return { status: 202, body: { pending: true, checkoutId: co.id } };
	co = claimed;

	const outcome = await charge();

	if (outcome.outcome === 'approved') {
		await markCheckout(co.id, 'paid', { transId: outcome.transId });
		await fulfilGuideCheckout(co.id, {
			transId: outcome.transId,
			lastFour: outcome.lastFour || charge.lastFour,
			cardType: outcome.cardType || charge.cardType,
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
		await conversion(co.amountCents / 100);
		return {
			status: 200,
			body: { ...done, cardSaved, saveRequested: !!(payment.opaqueData && payment.saveCard) }
		};
	}
	if (outcome.outcome === 'unknown') {
		await markCheckout(co.id, 'unknown', {
			error: outcome.message,
			transId: outcome.transId || null
		});
		return {
			status: 202,
			body: { pending: true, checkoutId: co.id, message: describeOutcome(outcome) }
		};
	}
	await markCheckout(co.id, outcome.outcome === 'declined' ? 'declined' : 'failed', {
		error: `${outcome.code || ''} ${outcome.message || ''}`.trim()
	});
	return {
		status: outcome.outcome === 'declined' ? 402 : 502,
		body: { error: describeOutcome(outcome), code: outcome.code }
	};
}
