import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { event } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';

export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/events/new');
	}

	return {
		user: locals.user
	};
}

export const actions = {
	default: async ({ locals, request }) => {
		// Require admin authentication
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();

		const title = formData.get('title');
		const location = formData.get('location');
		const price = formData.get('price');
		const format = formData.get('format');
		const circuit = formData.get('circuit');
		const eventDate = formData.get('eventDate');
		const description = formData.get('description');
		const gemIdRequired = formData.get('gemIdRequired') === 'on';
		const premiumDiscount = formData.get('premiumDiscount') === 'on';

		// Validation
		if (!title || !location || !price || !format || !eventDate) {
			return fail(400, {
				error: 'Missing required fields',
				values: {
					title,
					location,
					price,
					format,
					circuit,
					eventDate,
					description
				}
			});
		}

		// Validate price is a valid number
		const priceNum = parseFloat(price);
		if (isNaN(priceNum) || priceNum < 0) {
			return fail(400, {
				error: 'Invalid price',
				values: {
					title,
					location,
					price,
					format,
					circuit,
					eventDate,
					description
				}
			});
		}

		try {
			// Create event with unique ID
			const eventId = nanoid(10); // Short unique ID

			await db.insert(event).values({
				id: eventId,
				title,
				location,
				price: priceNum.toFixed(2),
				format,
				circuit: circuit || null,
				eventDate: new Date(eventDate),
				description: description || null,
				gemIdRequired,
				premiumDiscount,
				createdBy: locals.user.id
			});
		} catch (err) {
			console.error('Error creating event:', err);
			return fail(500, {
				error: 'Failed to create event. Please try again.',
				values: {
					title,
					location,
					price,
					format,
					circuit,
					eventDate,
					description
				}
			});
		}

		// Redirect to admin dashboard on success
		throw redirect(303, '/admin');
	}
};
