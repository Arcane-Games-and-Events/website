import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, match, eventPlayerHero } from '$lib/server/db/schema.js';
import { eq, asc, and } from 'drizzle-orm';
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

		// Fetch hero data for this event (by season/circuit/month)
		let heroData = [];
		let metagameBreakdown = [];
		if (eventData.circuit && eventData.month && eventData.eventDate) {
			const season = new Date(eventData.eventDate).getFullYear().toString();
			heroData = await db
				.select()
				.from(eventPlayerHero)
				.where(and(
					eq(eventPlayerHero.season, season),
					eq(eventPlayerHero.circuit, eventData.circuit),
					eq(eventPlayerHero.month, eventData.month)
				));

			// Calculate metagame breakdown
			if (heroData.length > 0) {
				const counts = {};
				for (const entry of heroData) {
					counts[entry.hero] = (counts[entry.hero] || 0) + 1;
				}
				metagameBreakdown = Object.entries(counts)
					.map(([hero, count]) => ({
						hero,
						count,
						percentage: ((count / heroData.length) * 100).toFixed(1)
					}))
					.sort((a, b) => b.count - a.count);
			}
		}

		// Create a hero lookup map for enriching results
		const heroByGemId = new Map(heroData.filter(h => h.gemId).map(h => [h.gemId, h.hero]));
		const heroByName = new Map(heroData.map(h => [h.playerName.toLowerCase(), h.hero]));

		// Enrich results with hero data
		const enrichedResults = results.map(r => ({
			...r,
			hero: (r.gemId && heroByGemId.get(r.gemId)) || heroByName.get(r.playerName.toLowerCase()) || null
		}));

		return {
			event: eventData,
			results: enrichedResults,
			totalRounds: eventMatches.length > 0 ? Math.max(...eventMatches.map((m) => m.round)) : 0,
			metagameBreakdown,
			totalPlayers: heroData.length
		};
	} catch (err) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading event results:', err);
		throw error(500, 'Failed to load event results');
	}
}
