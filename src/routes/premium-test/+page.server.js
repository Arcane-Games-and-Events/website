import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { savedCard } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load({ locals }) {
	// Only allow in development
	if (!dev) {
		throw redirect(302, '/premium');
	}

	// Fetch saved cards if user is logged in
	let userSavedCards = [];
	if (locals.user) {
		userSavedCards = await db.select().from(savedCard).where(eq(savedCard.userId, locals.user.id));
	}

	return {
		user: locals.user,
		savedCards: userSavedCards
	};
}
