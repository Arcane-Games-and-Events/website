import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskCourse } from '$lib/server/db/schema.js';
import { authnet, describeOutcome } from '$lib/server/authnet/client.js';
import { guardPayment } from '$lib/server/ratelimit.js';
import { recordConversion } from '$lib/server/contentAnalytics/collect.js';
import { ownedCard, isExpired, saveCardFromTransaction } from '$lib/server/payments/cards.js';
import { claimCheckout, markCheckout } from '$lib/server/payments/checkout.js';
import { createCourseCheckout, fulfilCourseCheckout } from '$lib/server/courses/purchase.js';
import { enrollmentFor } from '$lib/server/courses/access.js';

/**
 * POST /api/academy/[slug]/purchase
 *
 * Body: { payment: { savedCardId } | { opaqueData, billTo, expiry, lastFour, saveCard },
 *         idempotencyKey }
 *
 * Buy a course once and keep it. The price is the server's and the same for
 * everyone. A `checkout` row carries the invoice number before the card is
 * charged; an approved charge becomes the enrollment exactly once.
 *
 * Responses: 200 success · 202 pending (poll /api/checkout/[id]) ·
 * 400 bad request · 402 declined · 409 already enrolled · 429 slow down.
 */
export async function POST({ params, request, locals, cookies, url, getClientAddress }) {
	const user = locals.user;
	if (!user) return json({ error: 'Sign in to enroll.' }, { status: 401 });

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request' }, { status: 400 });
	}
	const { payment = {}, idempotencyKey } = body || {};
	if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length > 80)
		return json({ error: 'Bad request' }, { status: 400 });

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

	const [course] = await db
		.select()
		.from(deskCourse)
		.where(and(eq(deskCourse.slug, params.slug), eq(deskCourse.status, 'published')))
		.limit(1);
	if (!course) return json({ error: 'Course not found' }, { status: 404 });
	const done = { success: true, redirectUrl: `/academy/${course.slug}?enrolled=1` };

	// Already enrolled (a retry after success lands here too): send them in.
	if (await enrollmentFor(user.id, course.id))
		return json(
			{ error: 'You’re already enrolled in this course.', redirectUrl: done.redirectUrl },
			{ status: 409 }
		);

	const created = await createCourseCheckout({ user, course, idempotencyKey });
	if (created.error) return json({ error: created.error }, { status: created.status });
	let co = created.checkout;

	// A retry of a request we already finished, or one still in flight.
	if (co.status === 'fulfilled') return json(done);
	if (co.status === 'charging' || co.status === 'unknown' || co.status === 'paid')
		return json(
			{ pending: true, checkoutId: co.id, message: 'Your payment is being confirmed.' },
			{ status: 202 }
		);

	// A free course: no gateway.
	if (co.amountCents === 0) {
		const claimed = await claimCheckout(co.id);
		if (!claimed) return json({ pending: true, checkoutId: co.id }, { status: 202 });
		await fulfilCourseCheckout(co.id, { transId: null, email: user.email });
		await recordConversion({ cookies, url }, user.id, 'course', {
			meta: { courseId: course.id, amount: 0 }
		});
		return json(done);
	}

	const description = `Course: ${course.title}`.slice(0, 255);
	let charge;
	if (payment.savedCardId) {
		let card;
		try {
			card = await ownedCard(user.id, payment.savedCardId);
		} catch {
			return json({ error: 'Saved card not found.' }, { status: 404 });
		}
		if (card.status !== 'active' || isExpired(card))
			return json({ error: 'That saved card has expired. Use a different card.' }, { status: 400 });
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
		return json({ error: 'Choose a saved card or enter a new one.' }, { status: 400 });
	}

	const claimed = await claimCheckout(co.id);
	if (!claimed) return json({ pending: true, checkoutId: co.id }, { status: 202 });
	co = claimed;

	const outcome = await charge();

	if (outcome.outcome === 'approved') {
		await markCheckout(co.id, 'paid', { transId: outcome.transId });
		await fulfilCourseCheckout(co.id, {
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
		await recordConversion({ cookies, url }, user.id, 'course', {
			meta: { courseId: course.id, amount: co.amountCents / 100 }
		});
		return json({
			...done,
			cardSaved,
			saveRequested: !!(payment.opaqueData && payment.saveCard)
		});
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
