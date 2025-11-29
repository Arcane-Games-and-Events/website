import { db } from '$lib/server/db/index.js';
import { event, eventResult, eventDecklist, seasonStanding } from '$lib/server/db/schema.js';
import { asc, desc, eq, and } from 'drizzle-orm';

export async function load({ url }) {
	const currentYear = new Date().getFullYear().toString();
	const selectedCircuit = url.searchParams.get('circuit') || null;

	try {
		// Get events sorted by date (upcoming first)
		const events = await db
			.select()
			.from(event)
			.orderBy(asc(event.eventDate));

		// Get completed events with results for the Results tab
		const completedEvents = events.filter((e) => e.status === 'completed');

		// Get results for completed events
		const allResults = [];
		for (const evt of completedEvents) {
			const results = await db
				.select()
				.from(eventResult)
				.where(eq(eventResult.eventId, evt.id))
				.orderBy(asc(eventResult.placement));

			if (results.length > 0) {
				allResults.push({
					event: evt,
					results
				});
			}
		}

		// Get season standings
		let standingsQuery = db
			.select()
			.from(seasonStanding)
			.where(eq(seasonStanding.season, currentYear));

		if (selectedCircuit) {
			standingsQuery = db
				.select()
				.from(seasonStanding)
				.where(
					and(
						eq(seasonStanding.season, currentYear),
						eq(seasonStanding.circuit, selectedCircuit)
					)
				);
		}

		const standings = await standingsQuery.orderBy(desc(seasonStanding.totalPoints));

		// Get public decklists with event info
		const decklists = await db
			.select({
				id: eventDecklist.id,
				eventId: eventDecklist.eventId,
				playerName: eventDecklist.playerName,
				gemId: eventDecklist.gemId,
				deckName: eventDecklist.deckName,
				hero: eventDecklist.hero,
				format: eventDecklist.format,
				cards: eventDecklist.cards,
				createdAt: eventDecklist.createdAt,
				eventTitle: event.title,
				eventDate: event.eventDate,
				circuit: event.circuit
			})
			.from(eventDecklist)
			.innerJoin(event, eq(eventDecklist.eventId, event.id))
			.where(eq(eventDecklist.isPublic, true))
			.orderBy(desc(eventDecklist.createdAt));

		return {
			events,
			completedEvents,
			eventResults: allResults,
			standings,
			decklists,
			currentYear,
			selectedCircuit
		};
	} catch (error) {
		console.error('Error loading AGE Open data:', error);
		return {
			events: [],
			completedEvents: [],
			eventResults: [],
			standings: [],
			decklists: [],
			currentYear,
			selectedCircuit
		};
	}
}
