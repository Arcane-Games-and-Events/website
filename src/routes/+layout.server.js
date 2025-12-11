import { db } from '$lib/server/db/index.js';
import { eventStaff } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load = async ({ locals }) => {
	// locals.user is set in hooks.server.js by Lucia
	let assignedEventsCount = 0;

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
	}

	return {
		user: locals.user,
		assignedEventsCount
	};
};
