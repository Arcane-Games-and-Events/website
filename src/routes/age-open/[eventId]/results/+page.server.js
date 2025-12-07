import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, match } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { calculateFinalStandings } from '$lib/server/tournament-processor.js';

export async function load({ params }) {
	try {
		// Fetch the event
		const [eventData] = await db
			.select()
			.from(event)
			.where(eq(event.id, params.eventId))
			.limit(1);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		// Only show results for completed or in_progress events
		if (eventData.status !== 'completed' && eventData.status !== 'in_progress') {
			throw error(404, 'Results not available for this event');
		}

		// Fetch matches for this event
		const eventMatches = await db
			.select()
			.from(match)
			.where(eq(match.eventId, params.eventId))
			.orderBy(asc(match.round));

		// Calculate standings from matches
		let results = [];

		if (eventMatches.length > 0) {
			// Extract unique players from matches
			const playerMap = new Map();
			for (const m of eventMatches) {
				if (m.player1GemId || m.player1Name) {
					const key = m.player1GemId || m.player1Name;
					if (!playerMap.has(key)) {
						playerMap.set(key, { playerId: m.player1GemId, name: m.player1Name, wins: 0 });
					}
				}
				if (m.player2GemId || m.player2Name) {
					const key = m.player2GemId || m.player2Name;
					if (!playerMap.has(key)) {
						playerMap.set(key, { playerId: m.player2GemId, name: m.player2Name, wins: 0 });
					}
				}
			}

			// Convert matches to pairings format
			const pairings = eventMatches.map((m) => ({
				round: m.round,
				table: m.table,
				player1Id: m.player1GemId,
				player1Name: m.player1Name,
				player2Id: m.player2GemId,
				player2Name: m.player2Name,
				result: m.winner === 'player1' ? '1WIN' : m.winner === 'player2' ? '2WIN' : 'DRAW'
			}));

			// Calculate standings
			try {
				const swissStandings = Array.from(playerMap.values());
				const standings = calculateFinalStandings(swissStandings, pairings);
				results = standings.results.map((r) => ({
					playerName: r.name,
					gemId: r.playerId,
					placement: r.placement,
					wins: r.matchesWon,
					losses: r.matchesPlayed - r.matchesWon,
					draws: 0,
					agePoints: r.points,
					prizeAmount: r.prize
				}));
			} catch (err) {
				console.error('Error calculating standings:', err);
			}
		}

		return {
			event: eventData,
			results,
			totalRounds: eventMatches.length > 0 ? Math.max(...eventMatches.map((m) => m.round)) : 0
		};
	} catch (err) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading event results:', err);
		throw error(500, 'Failed to load event results');
	}
}
