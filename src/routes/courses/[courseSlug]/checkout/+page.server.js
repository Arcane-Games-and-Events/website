import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsCourse, savedCard } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { hasCourseAccess } from '$lib/server/cms/course-access.js';

export async function load({ params, locals }) {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=/courses/${params.courseSlug}/checkout`);
	}

	const [course] = await db
		.select()
		.from(cmsCourse)
		.where(eq(cmsCourse.slug, params.courseSlug))
		.limit(1);
	if (!course || course.status !== 'published') throw error(404, 'Course not found');

	// Free course or already-owned: bounce back to landing.
	if (await hasCourseAccess(locals.user, course)) {
		throw redirect(302, `/courses/${course.slug}`);
	}

	const userSavedCards = await db
		.select()
		.from(savedCard)
		.where(eq(savedCard.userId, locals.user.id));

	// Premium discount: 10% off for premium members when premiumDiscount is set
	const isPremium =
		locals.user.role === 'premium' || locals.user.role === 'admin';
	const basePrice = Number(course.price || 0);
	const hasPremiumDiscount = course.premiumDiscount && isPremium && basePrice > 0;
	const finalPrice = hasPremiumDiscount
		? Math.max(basePrice * 0.9, 0).toFixed(2)
		: basePrice.toFixed(2);

	return {
		user: locals.user,
		course,
		savedCards: userSavedCards,
		isSandbox: env.AUTHNET_ENVIRONMENT === 'sandbox',
		hasPremiumDiscount,
		basePrice: basePrice.toFixed(2),
		finalPrice
	};
}
