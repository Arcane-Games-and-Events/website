import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, decklist } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { resolveCardImage } from '$lib/server/cards/index.js';

export async function load({ params }) {
	try {
		// Fetch the decklist with event info
		const [decklistData] = await db
			.select({
				id: decklist.id,
				eventId: decklist.eventId,
				playerName: decklist.playerName,
				gemId: decklist.gemId,
				hero: decklist.hero,
				format: decklist.format,
				placement: decklist.placement,
				cards: decklist.cards,
				isPublic: decklist.isPublic,
				createdAt: decklist.createdAt,
				eventTitle: event.title,
				eventDate: event.eventDate,
				eventLocation: event.location,
				circuit: event.circuit,
				month: event.month
			})
			.from(decklist)
			.innerJoin(event, eq(decklist.eventId, event.id))
			.where(and(eq(decklist.id, params.decklistId), eq(decklist.eventId, params.eventId)))
			.limit(1);

		if (!decklistData) {
			throw error(404, 'Decklist not found');
		}

		if (!decklistData.isPublic) {
			throw error(403, 'This decklist is not public');
		}

		// Resolve card images server-side using database lookup
		const cards = Array.isArray(decklistData.cards) ? decklistData.cards : [];
		const cardsWithImages = await Promise.all(
			cards.map(async (card) => {
				const resolved = await resolveCardImage({
					name: card.name,
					color: card.section // section is the color (red/yellow/blue)
				});
				return {
					...card,
					imageUrl: resolved.imageUrl,
					fallbackUrl: resolved.fallbackUrl,
					pitch: resolved.pitch
				};
			})
		);

		// Resolve hero image
		const heroResolved = decklistData.hero
			? await resolveCardImage({ name: decklistData.hero })
			: null;

		return {
			decklist: {
				...decklistData,
				cards: cardsWithImages,
				heroImage: heroResolved
					? {
							imageUrl: heroResolved.imageUrl,
							fallbackUrl: heroResolved.fallbackUrl
						}
					: null
			}
		};
	} catch (err) {
		if (err.status === 404 || err.status === 403) {
			throw err;
		}
		console.error('Error loading decklist:', err);
		throw error(500, 'Failed to load decklist');
	}
}
