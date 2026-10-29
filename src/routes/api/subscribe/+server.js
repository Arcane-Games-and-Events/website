import { json } from '@sveltejs/kit';
import { auth, forgetSession } from '$lib/server/lucia.js';
import { guardPayment } from '$lib/server/ratelimit.js';
import { recordConversion } from '$lib/server/contentAnalytics/collect.js';
import { startSubscription, quoteSignup } from '$lib/server/billing/subscriptions.js';

/**
 * POST /api/subscribe
 *
 * Body: {
 *   plan: 'monthly' | 'yearly',
 *   promoCode?: string,
 *   payment: { savedCardId } | { opaqueData, billTo, expiry, lastFour },
 *   consent: true
 * }
 *
 * The price comes from the server (see billing/plans.js); nothing in the
 * body says what to charge. Responses: 200 member · 202 pending (poll
 * /api/subscribe/status) · 400 · 402 declined · 409 already a member /
 * retoken · 429 slow down.
 */
export async function POST({ request, locals, cookies, url, getClientAddress }) {
	const user = locals.user;
	if (!user) return json({ error: 'Sign in to become a member.' }, { status: 401 });

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request' }, { status: 400 });
	}
	const { plan, promoCode = null, payment = {}, consent = false } = body || {};

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

	const result = await startSubscription({ user, plan, promoCode, payment, consent: !!consent });

	if (!result.ok) {
		if (result.retoken)
			return json({ error: 'retoken', retoken: true, cardId: result.cardId }, { status: 409 });
		if (result.pending) {
			return json(
				{ pending: true, subscriptionId: result.subscriptionId, message: result.error },
				{ status: 202 }
			);
		}
		return json(
			{ error: result.error, resume: result.resume || false },
			{ status: result.status || 400 }
		);
	}

	// The role changed: give the browser a session that reflects it.
	const headers = {};
	if (locals.session) {
		await auth.invalidateSession(locals.session.id);
		await forgetSession(locals.session.id);
	}
	const session = await auth.createSession(user.id, {});
	headers['Set-Cookie'] = auth.createSessionCookie(session.id).serialize();

	await recordConversion({ cookies, url }, user.id, 'premium', {
		meta: {
			subscriptionType: plan,
			promo: result.subscription.promoCode || null,
			amountCents: result.amountCents
		}
	});

	return json(
		{
			success: true,
			subscriptionId: result.subscription.ref,
			subscriptionType: result.subscription.plan,
			nextBillingDate: result.subscription.nextChargeAt,
			redirectUrl: '/premium/confirmation'
		},
		{ headers }
	);
}

/**
 * GET /api/subscribe?plan=yearly&code=ABC — the price a signup would cost.
 */
export async function GET({ url, locals }) {
	const plan = url.searchParams.get('plan') || 'monthly';
	const code = url.searchParams.get('code') || null;
	const q = await quoteSignup({ user: locals.user, plan, promoCode: code });
	if (!q.ok) return json({ ok: false, error: q.error }, { status: 400 });
	return json({
		ok: true,
		plan: q.plan,
		promoKind: q.promoKind,
		promoCode: q.promoCode,
		listCents: q.listCents,
		discountCents: q.discountCents,
		amountCents: q.amountCents,
		renewalCents: q.renewalCents
	});
}
