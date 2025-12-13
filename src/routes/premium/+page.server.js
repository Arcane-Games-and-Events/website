import { db } from '$lib/server/db';
import { savedCard } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { AUTHNET_ENVIRONMENT } from '$env/static/private';

export async function load({ locals }) {
	// Fetch saved cards if user is logged in
	let userSavedCards = [];
	if (locals.user) {
		userSavedCards = await db.select().from(savedCard).where(eq(savedCard.userId, locals.user.id));
	}

	return {
		user: locals.user,
		savedCards: userSavedCards,
		isSandbox: AUTHNET_ENVIRONMENT === 'sandbox'
	};
}
