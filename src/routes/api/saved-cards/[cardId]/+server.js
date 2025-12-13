import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { savedCard } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { authnet } from '$lib/server/authnet/client.js';

/**
 * DELETE /api/saved-cards/[cardId]
 * Delete a saved card
 */
export async function DELETE({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		// Get the card
		const [card] = await db
			.select()
			.from(savedCard)
			.where(and(eq(savedCard.id, params.cardId), eq(savedCard.userId, locals.user.id)))
			.limit(1);

		if (!card) {
			throw error(404, 'Card not found');
		}

		// Delete from Authorize.net
		try {
			await authnet.deletePaymentProfile(card.customerProfileId, card.paymentProfileId);
		} catch (authnetError) {
			console.error('Error deleting from Authorize.net:', authnetError);
			// Continue anyway - card may have already been deleted from Authorize.net
		}

		// Delete from database
		await db.delete(savedCard).where(eq(savedCard.id, params.cardId));

		// If this was the default card, set another one as default
		if (card.isDefault) {
			const [nextCard] = await db
				.select()
				.from(savedCard)
				.where(eq(savedCard.userId, locals.user.id))
				.limit(1);

			if (nextCard) {
				await db.update(savedCard).set({ isDefault: true }).where(eq(savedCard.id, nextCard.id));
			}
		}

		return json({ success: true });
	} catch (err) {
		if (err.status) throw err;
		console.error('Error deleting saved card:', err);
		throw error(500, 'Failed to delete card');
	}
}

/**
 * PATCH /api/saved-cards/[cardId]
 * Update a saved card (set as default, update nickname)
 */
export async function PATCH({ params, request, locals }) {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const body = await request.json();
		const { setAsDefault, nickname } = body;

		// Verify card belongs to user
		const [card] = await db
			.select()
			.from(savedCard)
			.where(and(eq(savedCard.id, params.cardId), eq(savedCard.userId, locals.user.id)))
			.limit(1);

		if (!card) {
			throw error(404, 'Card not found');
		}

		const updates = {};

		// Handle setting as default
		if (setAsDefault) {
			// Unset other defaults
			await db
				.update(savedCard)
				.set({ isDefault: false })
				.where(eq(savedCard.userId, locals.user.id));

			updates.isDefault = true;
		}

		// Handle nickname update
		if (nickname !== undefined) {
			updates.nickname = nickname || null;
		}

		if (Object.keys(updates).length > 0) {
			updates.updatedAt = new Date();
			await db.update(savedCard).set(updates).where(eq(savedCard.id, params.cardId));
		}

		return json({ success: true });
	} catch (err) {
		if (err.status) throw err;
		console.error('Error updating saved card:', err);
		throw error(500, 'Failed to update card');
	}
}
