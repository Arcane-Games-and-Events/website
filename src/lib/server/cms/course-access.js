/**
 * Course access helpers — does this user have access to this course?
 *
 * Access rules (in order):
 *   - admin role: always
 *   - course price is null/0: always (free course)
 *   - user has an entitlement row with product = 'course:{slug}': granted
 *   - otherwise: blocked
 *
 * Lessons can also be marked is_preview to allow non-purchasers to watch them.
 */
import { db } from '$lib/server/db/index.js';
import { entitlement } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { userHasAnyRole } from '$lib/server/guards.js';

export function entitlementProductForCourse(slug) {
	return `course:${slug}`;
}

export async function hasCourseAccess(user, course) {
	if (!course) return false;
	if (userHasAnyRole(user, 'admin')) return true;
	const price = course.price ? Number(course.price) : 0;
	if (!price || price <= 0) return true;
	if (!user) return false;

	const [row] = await db
		.select({ id: entitlement.id })
		.from(entitlement)
		.where(
			and(
				eq(entitlement.userId, user.id),
				eq(entitlement.product, entitlementProductForCourse(course.slug))
			)
		)
		.limit(1);

	return !!row;
}
