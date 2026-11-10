import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskCourse } from '$lib/server/db/schema.js';
import { guardPayment } from '$lib/server/ratelimit.js';
import { enrollmentFor } from '$lib/server/courses/access.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { consentFrom, createGuideCheckout } from '$lib/server/partner/checkout.js';
import { payGuideCheckout } from '$lib/server/partner/pay.js';

/**
 * POST /api/academy/[slug]/purchase
 *
 * Body: { payment: { savedCardId } | { opaqueData, billTo, expiry, lastFour, saveCard },
 *         idempotencyKey, consent }
 *
 * `consent: true` is the refund-policy box, required for a paid guide.
 *
 * Buy one guide and keep it: a cart of one. The price is the server's:
 * Premium members pay 10% less, and the card fee is included (see
 * $lib/server/partner). A `checkout` row carries the invoice number before
 * the card is charged; an approved charge becomes the enrollment exactly
 * once.
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
	const { payment = {}, idempotencyKey, consent = false } = body || {};
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

	// Already enrolled (a retry after success lands here too): send them in.
	if (await enrollmentFor(user.id, course.id))
		return json(
			{
				error: 'You’re already enrolled in this course.',
				redirectUrl: `/academy/${course.slug}?enrolled=1`
			},
			{ status: 409 }
		);

	const made = await createGuideCheckout({
		user,
		courses: [course],
		member: userHasPremiumAccess(user),
		idempotencyKey,
		consent: consentFrom(request, getClientAddress, consent)
	});
	if (made.error) return json({ error: made.error }, { status: made.status });
	const r = await payGuideCheckout({ user, co: made.checkout, payment, cookies, url });
	return json(r.body, { status: r.status });
}
