import { db } from '$lib/server/db/index.js';
import { eventStaff, partner } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { userHasAnyRole } from '$lib/server/guards.js';

export const load = async ({ locals }) => {
	// locals.user is set in hooks.server.js by Lucia
	let assignedEventsCount = 0;
	let isPartner = false;

	// Check if user has any event staff assignments
	if (locals.user) {
		try {
			const assignments = await db
				.select({ id: eventStaff.id })
				.from(eventStaff)
				.where(eq(eventStaff.userId, locals.user.id));
			assignedEventsCount = assignments.length;
		} catch {
			// Ignore errors - just don't show the events link
		}

		// Check if user is an AGE Partner
		try {
			const [partnerRow] = await db
				.select({ id: partner.id })
				.from(partner)
				.where(eq(partner.userId, locals.user.id))
				.limit(1);
			isPartner = !!partnerRow;
		} catch {
			// Silent fail — link is optional
		}
	}

	const isPremiumMember =
		locals.user?.role === 'premium' || locals.user?.role === 'admin';

	// Surface CMS access for the profile dropdown — true for any user who can
	// edit articles or courses (writer / creator / admin, including stacked).
	const hasCmsAccess = userHasAnyRole(locals.user, ['admin', 'writer', 'creator']);

	return {
		user: locals.user,
		assignedEventsCount,
		isPartner,
		isPremiumMember,
		hasCmsAccess
	};
};
