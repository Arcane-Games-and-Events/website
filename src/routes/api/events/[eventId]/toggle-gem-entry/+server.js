import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { ticket } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function POST({ request, locals }) {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
		throw error(403, 'Unauthorized');
	}

	try {
		const { ticketId, enteredIntoGem } = await request.json();

		await db
			.update(ticket)
			.set({ enteredIntoGem })
			.where(eq(ticket.id, ticketId));

		return json({ success: true, enteredIntoGem });
	} catch (err) {
		console.error('Error toggling GEM entry:', err);
		throw error(500, 'Failed to update');
	}
}
