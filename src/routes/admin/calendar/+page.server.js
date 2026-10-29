import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { lssEvent } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { bump } from '$lib/server/cache/index.js';
import { listLssEvents } from '$lib/server/admin/dashboard.js';

// The AGE Open page caches active LSS events under the `lss` tag. Every
// LSS write below bumps it so the calendar updates on the next request.

export async function load({ locals }) {
	const lssEvents = await listLssEvents().catch((err) => {
		console.error('Admin calendar load error:', err);
		return [];
	});

	return { user: locals.user, lssEvents };
}

export const actions = {
	// Create a new LSS event (season or tournament)
	createLssSeason: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.trim();
		const description = formData.get('description')?.trim() || null;
		const startDate = formData.get('startDate');
		const endDate = formData.get('endDate');
		const eventType = formData.get('eventType')?.trim() || null;
		const formatValues = formData.getAll('format');
		const format = formatValues.length > 0 ? formatValues.join(', ') : null;
		const link = formData.get('link')?.trim() || null;

		if (!name || !startDate || !endDate) {
			return fail(400, { error: 'Name, start date, and end date are required' });
		}

		const start = new Date(startDate);
		const end = new Date(endDate);

		if (end <= start) {
			return fail(400, { error: 'End date must be after start date' });
		}

		try {
			await db.insert(lssEvent).values({
				name,
				description,
				startDate: start,
				endDate: end,
				eventType,
				format,
				link,
				isActive: true,
				createdBy: locals.user.id
			});

			await bump('lss');
			return { success: true, message: 'LSS event created successfully' };
		} catch (err) {
			console.error('Error creating LSS event:', err);
			return fail(500, { error: 'Failed to create LSS event' });
		}
	},

	// Update an LSS event (season or tournament)
	updateLssSeason: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const seasonId = formData.get('seasonId');
		const name = formData.get('name')?.trim();
		const description = formData.get('description')?.trim() || null;
		const startDate = formData.get('startDate');
		const endDate = formData.get('endDate');
		const eventType = formData.get('eventType')?.trim() || null;
		const formatValues = formData.getAll('format');
		const format = formatValues.length > 0 ? formatValues.join(', ') : null;
		const link = formData.get('link')?.trim() || null;
		const isActive = formData.get('isActive') === 'true';

		if (!seasonId || !name || !startDate || !endDate) {
			return fail(400, { error: 'Event ID, name, start date, and end date are required' });
		}

		const start = new Date(startDate);
		const end = new Date(endDate);

		if (end <= start) {
			return fail(400, { error: 'End date must be after start date' });
		}

		try {
			await db
				.update(lssEvent)
				.set({
					name,
					description,
					startDate: start,
					endDate: end,
					eventType,
					format,
					link,
					isActive,
					updatedAt: new Date()
				})
				.where(eq(lssEvent.id, seasonId));

			await bump('lss');
			return { success: true, message: 'LSS event updated successfully' };
		} catch (err) {
			console.error('Error updating LSS event:', err);
			return fail(500, { error: 'Failed to update LSS event' });
		}
	},

	// Delete an LSS tournament season
	deleteLssSeason: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const seasonId = formData.get('seasonId');

		if (!seasonId) {
			return fail(400, { error: 'Season ID is required' });
		}

		try {
			await db.delete(lssEvent).where(eq(lssEvent.id, seasonId));

			await bump('lss');
			return { success: true, message: 'LSS season deleted successfully' };
		} catch (err) {
			console.error('Error deleting LSS season:', err);
			return fail(500, { error: 'Failed to delete LSS season' });
		}
	}
};
