import { db } from '$lib/server/db/index.js';
import { event, eventResult, eventDecklist, seasonStanding } from '$lib/server/db/schema.js';
import { asc, desc, eq, and, sql, gt } from 'drizzle-orm';

/**
 * Compare two standings using tiebreaker rules:
 * 1. Total Points (primary)
 * 2. Number of Top 8's made
 * 3. Total match wins
 * 4. Number of events attended
 * Returns negative if a should rank higher, positive if b should rank higher
 */
function compareStandings(a, b) {
	// Primary: Total Points (higher is better)
	const pointsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
	if (pointsDiff !== 0) return pointsDiff;

	// Tiebreaker 1: Top 8 finishes (higher is better)
	const top8Diff = (b.top8Finishes || 0) - (a.top8Finishes || 0);
	if (top8Diff !== 0) return top8Diff;

	// Tiebreaker 2: Total match wins (higher is better)
	const winsDiff = (b.matchesWon || 0) - (a.matchesWon || 0);
	if (winsDiff !== 0) return winsDiff;

	// Tiebreaker 3: Events attended (higher is better)
	const eventsDiff = (b.eventsPlayed || 0) - (a.eventsPlayed || 0);
	return eventsDiff;
}

export async function load({ url }) {
	const currentYear = new Date().getFullYear().toString();
	const selectedSeason = url.searchParams.get('season') || currentYear;
	const selectedCircuit = url.searchParams.get('circuit') || null;

	// Available seasons (newest first) - 'all' represents career/all-time stats
	const availableSeasons = ['all', '2025', '2024', '2023'];

	// Circuits available per season
	const circuitsByYear = {
		'all': ['Los Angeles', 'New England', 'St. Louis'],
		'2023': ['Los Angeles'],
		'2024': ['Los Angeles'],
		'2025': ['Los Angeles', 'New England'],
		'2026': ['Los Angeles', 'New England', 'St. Louis']
	};

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

		let standings = [];

		if (selectedSeason === 'all') {
			// Aggregate career stats across all seasons/circuits by gemId
			const allStandings = await db
				.select()
				.from(seasonStanding)
				.orderBy(desc(seasonStanding.totalPoints));

			// Group by gemId to aggregate career stats
			const careerStatsMap = new Map();

			for (const standing of allStandings) {
				const key = standing.gemId || standing.playerName; // Use gemId if available, otherwise playerName

				if (!careerStatsMap.has(key)) {
					careerStatsMap.set(key, {
						gemId: standing.gemId,
						playerName: standing.playerName,
						totalPoints: 0,
						matchesWon: 0,
						matchesPlayed: 0,
						eventsPlayed: 0,
						top8Finishes: 0,
						seasonsPlayed: new Set(),
						circuitsPlayed: new Set()
					});
				}

				const career = careerStatsMap.get(key);
				career.totalPoints += standing.totalPoints || 0;
				career.matchesWon += standing.matchesWon || 0;
				career.matchesPlayed += standing.matchesPlayed || 0;
				career.eventsPlayed += standing.eventsPlayed || 0;
				career.top8Finishes += standing.top8Finishes || 0;
				career.seasonsPlayed.add(standing.season);
				career.circuitsPlayed.add(standing.circuit);
			}

			// Convert map to array and calculate win percentage
			const careerStats = Array.from(careerStatsMap.values()).map((career) => ({
				...career,
				winPercentage: career.matchesPlayed > 0
					? Math.round((career.matchesWon / career.matchesPlayed) * 10000) / 100
					: null,
				seasonsPlayed: Array.from(career.seasonsPlayed),
				circuitsPlayed: Array.from(career.circuitsPlayed)
			}));

			// Sort using tiebreaker rules and assign ranks
			careerStats.sort(compareStandings);
			standings = careerStats.map((player, index) => ({
				...player,
				calculatedRank: index + 1
			}));

			// Apply circuit filter if selected
			if (selectedCircuit) {
				standings = standings.filter(s => s.circuitsPlayed.includes(selectedCircuit));
				// Recalculate ranks after filtering
				standings = standings.map((player, index) => ({
					...player,
					calculatedRank: index + 1
				}));
			}
		} else {
			// Get season standings for selected season
			let standingsQuery = db
				.select()
				.from(seasonStanding)
				.where(eq(seasonStanding.season, selectedSeason));

			if (selectedCircuit) {
				standingsQuery = db
					.select()
					.from(seasonStanding)
					.where(
						and(
							eq(seasonStanding.season, selectedSeason),
							eq(seasonStanding.circuit, selectedCircuit)
						)
					);
			}

			const rawStandings = await standingsQuery;

			// Sort using tiebreaker rules and assign ranks
			rawStandings.sort(compareStandings);

			// Calculate ranks and win percentage
			standings = rawStandings.map((standing, index) => {
				const winPercentage = standing.matchesPlayed > 0
					? Math.round((standing.matchesWon / standing.matchesPlayed) * 10000) / 100
					: null;

				return {
					...standing,
					calculatedRank: index + 1,
					winPercentage: standing.winPercentage || winPercentage
				};
			});
		}

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
			selectedSeason,
			selectedCircuit,
			availableSeasons,
			circuitsByYear
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
			selectedSeason: currentYear,
			selectedCircuit,
			availableSeasons: ['2025', '2024', '2023'],
			circuitsByYear: {
				'2023': ['Los Angeles'],
				'2024': ['Los Angeles'],
				'2025': ['Los Angeles', 'New England'],
				'2026': ['Los Angeles', 'New England', 'St. Louis']
			}
		};
	}
}
