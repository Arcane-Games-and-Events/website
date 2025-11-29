import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, eventDecklist, eventResult } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export async function load({ params }) {
	try {
		// Fetch the decklist with event info
		const [decklist] = await db
			.select({
				id: eventDecklist.id,
				eventId: eventDecklist.eventId,
				playerName: eventDecklist.playerName,
				gemId: eventDecklist.gemId,
				deckName: eventDecklist.deckName,
				hero: eventDecklist.hero,
				format: eventDecklist.format,
				cards: eventDecklist.cards,
				isPublic: eventDecklist.isPublic,
				createdAt: eventDecklist.createdAt,
				eventTitle: event.title,
				eventDate: event.eventDate,
				eventLocation: event.location,
				circuit: event.circuit
			})
			.from(eventDecklist)
			.innerJoin(event, eq(eventDecklist.eventId, event.id))
			.where(
				and(
					eq(eventDecklist.id, params.decklistId),
					eq(eventDecklist.eventId, params.eventId)
				)
			)
			.limit(1);

		if (!decklist) {
			throw error(404, 'Decklist not found');
		}

		if (!decklist.isPublic) {
			throw error(403, 'This decklist is not public');
		}

		// Try to find the player's result for this event
		const [playerResult] = await db
			.select()
			.from(eventResult)
			.where(
				and(
					eq(eventResult.eventId, params.eventId),
					eq(eventResult.playerName, decklist.playerName)
				)
			)
			.limit(1);

		return {
			decklist,
			playerResult: playerResult || null
		};
	} catch (err) {
		if (err.status === 404 || err.status === 403) {
			throw err;
		}
		console.error('Error loading decklist:', err);
		throw error(500, 'Failed to load decklist');
	}
}
