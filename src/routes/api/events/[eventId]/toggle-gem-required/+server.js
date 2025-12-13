import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function POST({ params, request, locals }) {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
		throw error(403, 'Unauthorized');
	}

	try {
		const { gemIdRequired } = await request.json();

		await db.update(event).set({ gemIdRequired }).where(eq(event.id, params.eventId));

		return json({ success: true, gemIdRequired });
	} catch (err) {
		console.error('Error toggling GEM ID required:', err);
		throw error(500, 'Failed to update setting');
	}
}
