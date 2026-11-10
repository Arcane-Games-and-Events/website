import { json } from '@sveltejs/kit';
import { guardPayment } from '$lib/server/ratelimit.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { canManageCourse } from '$lib/server/courses/access.js';
import { writeCart } from '$lib/server/partner/cart.js';
import {
	consentFrom,
	createGuideCheckout,
	guidesByIds,
	ownedAmong
} from '$lib/server/partner/checkout.js';
import { payGuideCheckout } from '$lib/server/partner/pay.js';

/**
 * POST /api/academy/cart/checkout
 *
 * Body: { courseIds: string[], payment: { savedCardId } | { opaqueData, billTo, expiry, lastFour, saveCard },
 *         idempotencyKey, consent }
 *
 * `consent: true` is the refund-policy box, required to pay.
 *
 * Buy every guide in the cart in one charge. The server prices it again;
 * the browser's numbers are never used. Guides the buyer already has (or
 * teaches) are refused, so the cart page can drop them and try again.
 *
 * Responses: 200 success · 202 pending (poll /api/checkout/[id]) ·
 * 400 bad request · 402 declined · 409 already own some · 429 slow down.
 */
export async function POST({ request, locals, cookies, url, getClientAddress }) {
	const user = locals.user;
	if (!user) return json({ error: 'Sign in to check out.' }, { status: 401 });

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request' }, { status: 400 });
	}
	const { courseIds, payment = {}, idempotencyKey, consent = false } = body || {};
	if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length > 80)
		return json({ error: 'Bad request' }, { status: 400 });
	if (!Array.isArray(courseIds) || !courseIds.length)
		return json({ error: 'Your cart is empty.' }, { status: 400 });

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

	const guides = await guidesByIds(courseIds);
	if (guides.length !== new Set(courseIds).size)
		return json(
			{ error: 'A guide in your cart is no longer available. Refresh the cart.' },
			{ status: 400 }
		);
	const owned = await ownedAmong(
		user.id,
		guides.map((g) => g.id)
	);
	const have = guides.filter((g) => owned.has(g.id) || canManageCourse(user, g));
	if (have.length)
		return json(
			{
				error: `You already have ${have.map((g) => g.title).join(', ')}.`,
				owned: have.map((g) => g.id)
			},
			{ status: 409 }
		);

	const made = await createGuideCheckout({
		user,
		courses: guides,
		member: userHasPremiumAccess(user),
		idempotencyKey,
		consent: consentFrom(request, getClientAddress, consent)
	});
	if (made.error) return json({ error: made.error }, { status: made.status });
	const r = await payGuideCheckout({ user, co: made.checkout, payment, cookies, url });
	if (r.status === 200) writeCart(cookies, []);
	return json(r.body, { status: r.status });
}
