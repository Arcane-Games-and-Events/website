import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { cmsCourse, savedCard, entitlement, order } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { hasCourseAccess, entitlementProductForCourse } from '$lib/server/cms/course-access.js';
import { userHasAnyRole } from '$lib/server/guards.js';

/**
 * POST /api/cms/courses/[slug]/purchase
 * One-time purchase that grants access to a single course.
 * Mirrors the event-ticket purchase flow: charge via Authorize.net, write an
 * order row, and create an entitlement linked to course:{slug}.
 */
export async function POST({ params, request, locals }) {
	if (!locals.user) {
		return json({ error: 'You must be logged in to purchase' }, { status: 401 });
	}

	const [course] = await db
		.select()
		.from(cmsCourse)
		.where(eq(cmsCourse.slug, params.slug))
		.limit(1);
	if (!course || course.status !== 'published') {
		return json({ error: 'Course not found' }, { status: 404 });
	}

	// Already owns it? bounce.
	if (await hasCourseAccess(locals.user, course)) {
		return json({ error: 'You already have access to this course', alreadyOwned: true }, {
			status: 400
		});
	}

	const body = await request.json().catch(() => ({}));
	const {
		amount,
		cardNumber,
		expirationDate,
		cardCode,
		billTo,
		useSavedCard,
		savedCardId,
		saveCard
	} = body;

	// Validate amount matches expected (allow 1¢ tolerance for rounding)
	const isPremium = userHasAnyRole(locals.user, ['premium', 'admin']);
	const basePrice = Number(course.price || 0);
	const expected =
		course.premiumDiscount && isPremium && basePrice > 0
			? Math.max(basePrice * 0.9, 0)
			: basePrice;
	if (Math.abs(parseFloat(amount) - expected) > 0.01) {
		return json({ error: 'Invalid payment amount' }, { status: 400 });
	}

	let result;
	let cardLastFour = null;
	try {
		if (useSavedCard && savedCardId) {
			const [card] = await db
				.select()
				.from(savedCard)
				.where(and(eq(savedCard.id, savedCardId), eq(savedCard.userId, locals.user.id)))
				.limit(1);
			if (!card) return json({ error: 'Saved card not found' }, { status: 404 });

			result = await authnet.chargeCustomerProfile({
				customerProfileId: card.customerProfileId,
				paymentProfileId: card.paymentProfileId,
				amount: Number(amount).toFixed(2),
				description: `AGE Course: ${course.title}`
			});
			cardLastFour = card.lastFour;
		} else {
			if (!cardNumber || !expirationDate || !cardCode) {
				return json({ error: 'Card details are required' }, { status: 400 });
			}
			result = await authnet.chargeCard({
				cardNumber,
				expirationDate,
				cardCode,
				amount: Number(amount).toFixed(2),
				description: `AGE Course: ${course.title}`,
				billTo
			});
			cardLastFour = cardNumber.slice(-4);

			// Save card if requested
			if (result?.success && saveCard) {
				try {
					const profileResult = await authnet.getOrCreateCustomerProfile({
						customerId: locals.user.id,
						email: locals.user.email
					});
					if (profileResult?.customerProfileId) {
						const paymentProfileResult = await authnet.addPaymentProfile({
							customerProfileId: profileResult.customerProfileId,
							cardNumber,
							expirationDate,
							cardCode,
							billTo
						});
						if (paymentProfileResult?.paymentProfileId) {
							await db.insert(savedCard).values({
								userId: locals.user.id,
								customerProfileId: profileResult.customerProfileId,
								paymentProfileId: paymentProfileResult.paymentProfileId,
								lastFour: cardLastFour,
								cardType: paymentProfileResult.cardType || 'Unknown',
								expirationMonth: expirationDate.split('/')[0] || expirationDate.substring(0, 2),
								expirationYear: expirationDate.split('/')[1] || expirationDate.substring(2)
							});
						}
					}
				} catch (e) {
					console.error('Failed to save card:', e);
					// Don't fail the purchase if saving card fails
				}
			}
		}
	} catch (e) {
		console.error('Authorize.net error:', e);
		return json({ error: e?.message || 'Payment failed' }, { status: 402 });
	}

	if (!result?.success) {
		return json({ error: 'Payment failed' }, { status: 402 });
	}

	// Record order + entitlement
	await db.insert(order).values({
		provider: 'authnet',
		providerRef: result.transactionId,
		userEmail: locals.user.email,
		amount: Number(amount).toFixed(2),
		currency: 'USD',
		meta: {
			type: 'course',
			courseId: course.id,
			courseSlug: course.slug,
			courseTitle: course.title,
			lastFour: cardLastFour
		}
	});

	await db.insert(entitlement).values({
		userId: locals.user.id,
		product: entitlementProductForCourse(course.slug)
	});

	return json({
		success: true,
		transactionId: result.transactionId,
		redirectUrl: `/courses/${course.slug}`
	});
}
