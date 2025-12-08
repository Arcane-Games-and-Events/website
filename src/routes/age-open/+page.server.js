import { db } from '$lib/server/db/index.js';
import { event, match, decklist, standing, lssEvent } from '$lib/server/db/schema.js';
import { calculateFinalStandings } from '$lib/server/tournament-processor.js';
import { asc, desc, eq, and, sql, gt, gte } from 'drizzle-orm';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';
import {
	calculateAgeRatingTotal,
	getRatingTier,
	calculatePercentile,
	calculateRankPercentile
} from '$lib/age-rating.js';

/**
 * Calculate derived stats from monthly data
 * - eventsPlayed: count of months with points > 0
 * - top8Finishes: count of months with points >= 15 (5th-8th or better)
 */
function calculateDerivedStats(standing) {
	const monthlyPoints = [
		standing.januaryPoints || 0,
		standing.februaryPoints || 0,
		standing.marchPoints || 0,
		standing.aprilPoints || 0,
		standing.mayPoints || 0,
		standing.junePoints || 0,
		standing.julyPoints || 0,
		standing.augustPoints || 0,
		standing.septemberPoints || 0,
		standing.octoberPoints || 0,
		standing.novemberPoints || 0,
		standing.decemberPoints || 0
	];

	const eventsPlayed = monthlyPoints.filter(p => p > 0).length;
	const top8Finishes = monthlyPoints.filter(p => p >= 15).length;

	return { eventsPlayed, top8Finishes };
}

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

	// Calculate derived stats for tiebreakers
	const aDerived = calculateDerivedStats(a);
	const bDerived = calculateDerivedStats(b);

	// Tiebreaker 1: Top 8 finishes (higher is better)
	const top8Diff = bDerived.top8Finishes - aDerived.top8Finishes;
	if (top8Diff !== 0) return top8Diff;

	// Tiebreaker 2: Total match wins (higher is better)
	const winsDiff = (b.matchesWon || 0) - (a.matchesWon || 0);
	if (winsDiff !== 0) return winsDiff;

	// Tiebreaker 3: Events attended (higher is better)
	const eventsDiff = bDerived.eventsPlayed - aDerived.eventsPlayed;
	return eventsDiff;
}

// Note: calculatePercentile, calculateRankPercentile, calculateAgeRating, and getRatingTier
// are imported from $lib/age-rating.js for single source of truth

export async function load({ url, setHeaders }) {
	// Cache for 1 minute, allow stale for 5 minutes while revalidating
	// Shorter cache for tournament real-time updates
	// Vary by Cookie ensures sidebar updates properly after login/logout
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
		'vary': 'Cookie'
	});

	const currentYear = new Date().getFullYear().toString();
	const selectedSeason = url.searchParams.get('season') || 'all';
	const selectedCircuit = url.searchParams.get('circuit') || null;

	try {
		// Fetch raw data with Redis caching (5 minute TTL)
		// This caches the expensive database queries
		const [events, allEventMatches, allStandings, decklists, lssEvents] = await Promise.all([
			// Get events sorted by date (cached)
			getCachedOrFetch(
				`${CACHE_KEYS.EVENTS}:all`,
				() => db.select().from(event).orderBy(asc(event.eventDate)),
				CACHE_TTL.MEDIUM
			),
			// Get ALL event matches in one query (cached with shorter TTL for real-time updates)
			getCachedOrFetch(
				`${CACHE_KEYS.EVENTS}:matches:all`,
				() => db.select().from(match).orderBy(asc(match.round)),
				CACHE_TTL.SHORT
			),
			// Get all standings (cached with shorter TTL for real-time tournament updates)
			getCachedOrFetch(
				`${CACHE_KEYS.STANDINGS}:all`,
				() => db.select().from(standing).orderBy(desc(standing.totalPoints)),
				CACHE_TTL.SHORT
			),
			// Get public decklists with event info (cached)
			getCachedOrFetch(
				`${CACHE_KEYS.EVENTS}:decklists:public`,
				() => db.select({
					id: decklist.id,
					eventId: decklist.eventId,
					playerName: decklist.playerName,
					gemId: decklist.gemId,
					hero: decklist.hero,
					format: decklist.format,
					placement: decklist.placement,
					cards: decklist.cards,
					createdAt: decklist.createdAt,
					eventTitle: event.title,
					eventDate: event.eventDate,
					circuit: event.circuit,
					month: event.month
				})
					.from(decklist)
					.innerJoin(event, eq(decklist.eventId, event.id))
					.where(eq(decklist.isPublic, true))
					.orderBy(desc(decklist.createdAt)),
				CACHE_TTL.MEDIUM
			),
			// Get LSS tournament seasons (cached)
			getCachedOrFetch(
				`${CACHE_KEYS.EVENTS}:lss:active`,
				() => db.select().from(lssEvent).where(eq(lssEvent.isActive, true)).orderBy(asc(lssEvent.startDate)),
				CACHE_TTL.MEDIUM
			)
		]);

		// Extract unique seasons and circuits from standings data (dynamic filters)
		const uniqueSeasons = [...new Set(allStandings.map(s => s.season))].filter(Boolean).sort().reverse();
		const availableSeasons = ['all', ...uniqueSeasons];

		// Build circuits by year dynamically
		const circuitsByYear = { 'all': [] };
		for (const standing of allStandings) {
			if (!standing.season || !standing.circuit) continue;
			if (!circuitsByYear[standing.season]) {
				circuitsByYear[standing.season] = [];
			}
			if (!circuitsByYear[standing.season].includes(standing.circuit)) {
				circuitsByYear[standing.season].push(standing.circuit);
			}
			if (!circuitsByYear['all'].includes(standing.circuit)) {
				circuitsByYear['all'].push(standing.circuit);
			}
		}
		// Sort circuits alphabetically
		for (const year of Object.keys(circuitsByYear)) {
			circuitsByYear[year].sort();
		}

		// Get active/completed events with results for the Tournament Archive tab
		const archiveEvents = events.filter((e) =>
			(e.status === 'completed' || e.status === 'in_progress') && e.eventDate
		);

		// Group event matches by eventId
		const matchesByEventId = new Map();
		for (const match of allEventMatches) {
			if (!matchesByEventId.has(match.eventId)) {
				matchesByEventId.set(match.eventId, []);
			}
			matchesByEventId.get(match.eventId).push(match);
		}

		// Build results array by computing standings from matches
		const allResults = archiveEvents
			.filter(evt => matchesByEventId.has(evt.id))
			.map(evt => {
				const matches = matchesByEventId.get(evt.id);

				// Extract unique players from matches
				const playerMap = new Map();
				for (const match of matches) {
					if (match.player1GemId || match.player1Name) {
						const key = match.player1GemId || match.player1Name;
						if (!playerMap.has(key)) {
							playerMap.set(key, { playerId: match.player1GemId, name: match.player1Name, wins: 0 });
						}
					}
					if (match.player2GemId || match.player2Name) {
						const key = match.player2GemId || match.player2Name;
						if (!playerMap.has(key)) {
							playerMap.set(key, { playerId: match.player2GemId, name: match.player2Name, wins: 0 });
						}
					}
				}

				// Convert matches to pairings format
				const pairings = matches.map(m => ({
					round: m.round,
					table: m.table,
					player1Id: m.player1GemId,
					player1Name: m.player1Name,
					player2Id: m.player2GemId,
					player2Name: m.player2Name,
					result: m.winner === 'player1' ? '1WIN' : m.winner === 'player2' ? '2WIN' : 'DRAW'
				}));

				// Calculate standings from matches
				let computedResults = [];
				try {
					const swissStandings = Array.from(playerMap.values());
					const standings = calculateFinalStandings(swissStandings, pairings);
					computedResults = standings.results.map(r => ({
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
					console.error(`Error calculating results for event ${evt.id}:`, err);
				}

				return {
					event: evt,
					results: computedResults
				};
			})
			.filter(r => r.results.length > 0);

		let standings = [];

		if (selectedSeason === 'all') {
			// Group by gemId to aggregate career stats (using allStandings from Promise.all)
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

				const derived = calculateDerivedStats(standing);
				const career = careerStatsMap.get(key);
				career.totalPoints += standing.totalPoints || 0;
				career.matchesWon += standing.matchesWon || 0;
				career.matchesPlayed += standing.matchesPlayed || 0;
				career.eventsPlayed += derived.eventsPlayed;
				career.top8Finishes += derived.top8Finishes;
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
			// Filter standings from already-fetched data (no additional query needed)
			let rawStandings = allStandings.filter(s => s.season === selectedSeason);

			if (selectedCircuit) {
				rawStandings = rawStandings.filter(s => s.circuit === selectedCircuit);
			}

			// Sort using tiebreaker rules and assign ranks
			rawStandings.sort(compareStandings);

			// Calculate ranks, win percentage, and derived stats
			standings = rawStandings.map((standing, index) => {
				const winPercentage = standing.matchesPlayed > 0
					? Math.round((standing.matchesWon / standing.matchesPlayed) * 10000) / 100
					: null;
				const derived = calculateDerivedStats(standing);

				return {
					...standing,
					calculatedRank: index + 1,
					winPercentage: standing.winPercentage || winPercentage,
					eventsPlayed: derived.eventsPlayed,
					top8Finishes: derived.top8Finishes
				};
			});
		}

		// === Calculate AGE Rating for each player in standings ===
		if (standings.length > 0) {
			// Pre-group standings by circuit/season for efficient rank lookup
			const standingsByCircuitSeason = new Map();
			for (const s of allStandings) {
				const key = `${s.season}|${s.circuit}`;
				if (!standingsByCircuitSeason.has(key)) {
					standingsByCircuitSeason.set(key, []);
				}
				standingsByCircuitSeason.get(key).push(s);
			}

			// Sort each circuit/season group once (instead of sorting repeatedly in loop)
			for (const [key, group] of standingsByCircuitSeason) {
				group.sort(compareStandings);
			}

			// Cache for derived stats to avoid redundant calculations
			const derivedStatsCache = new Map();

			// Group by gemId/playerName to get aggregate stats (using allStandings from Promise.all)
			const playerStatsMap = new Map();
			for (const standing of allStandings) {
				const key = standing.gemId || standing.playerName;
				if (!key) continue;

				if (!playerStatsMap.has(key)) {
					playerStatsMap.set(key, {
						totalPoints: 0,
						matchesWon: 0,
						matchesPlayed: 0,
						eventsPlayed: 0,
						top8Finishes: 0,
						bestRank: null,
						championshipQualifications: 0,
						standingsList: []
					});
				}

				// Use cached derived stats
				if (!derivedStatsCache.has(standing.id)) {
					derivedStatsCache.set(standing.id, calculateDerivedStats(standing));
				}
				const derived = derivedStatsCache.get(standing.id);

				const playerData = playerStatsMap.get(key);
				playerData.totalPoints += standing.totalPoints || 0;
				playerData.matchesWon += standing.matchesWon || 0;
				playerData.matchesPlayed += standing.matchesPlayed || 0;
				playerData.eventsPlayed += derived.eventsPlayed;
				playerData.top8Finishes += derived.top8Finishes;
				playerData.standingsList.push(standing);
			}

			// Calculate ranks using pre-grouped and pre-sorted data (no more O(n*m) filtering)
			for (const [playerKey, playerData] of playerStatsMap) {
				for (const standing of playerData.standingsList) {
					const circuitSeasonKey = `${standing.season}|${standing.circuit}`;
					const circuitSeasonStandings = standingsByCircuitSeason.get(circuitSeasonKey) || [];
					const rank = circuitSeasonStandings.findIndex(s => (s.gemId || s.playerName) === playerKey) + 1;

					if (rank > 0) {
						if (playerData.bestRank === null || rank < playerData.bestRank) {
							playerData.bestRank = rank;
						}
						if (rank <= 16) {
							playerData.championshipQualifications++;
						}
					}
				}
			}

			// Extract arrays for percentile calculation
			const allPlayers = Array.from(playerStatsMap.values()).filter(p => p.eventsPlayed >= 1);
			const allWinRates = allPlayers.map(p => p.matchesPlayed > 0 ? p.matchesWon / p.matchesPlayed : 0);
			const allTop8Rates = allPlayers.map(p => p.eventsPlayed > 0 ? p.top8Finishes / p.eventsPlayed : 0);
			const allEventsPlayed = allPlayers.map(p => p.eventsPlayed);
			const allBestRanks = allPlayers.filter(p => p.bestRank !== null).map(p => p.bestRank);
			const allAvgPointsPerEvent = allPlayers.map(p => p.eventsPlayed > 0 ? p.totalPoints / p.eventsPlayed : 0);
			const allChampionshipQuals = allPlayers.map(p => p.championshipQualifications);

			// Calculate AGE Rating for each player in standings
			standings = standings.map(standing => {
				const key = standing.gemId || standing.playerName;
				const playerData = playerStatsMap.get(key);

				if (!playerData) {
					return { ...standing, ageRating: null, ratingTier: null };
				}

				// Calculate metrics for this player
				const winRate = playerData.matchesPlayed > 0 ? playerData.matchesWon / playerData.matchesPlayed : 0;
				const top8Rate = playerData.eventsPlayed > 0 ? playerData.top8Finishes / playerData.eventsPlayed : 0;
				const avgPtsPerEvent = playerData.eventsPlayed > 0 ? playerData.totalPoints / playerData.eventsPlayed : 0;

				// Calculate percentiles
				const percentiles = {
					winRate: calculatePercentile(winRate, allWinRates),
					top8Rate: calculatePercentile(top8Rate, allTop8Rates),
					experience: calculatePercentile(playerData.eventsPlayed, allEventsPlayed),
					bestRank: playerData.bestRank !== null
						? calculateRankPercentile(playerData.bestRank, allBestRanks)
						: 50,
					efficiency: calculatePercentile(avgPtsPerEvent, allAvgPointsPerEvent),
					championship: calculatePercentile(playerData.championshipQualifications, allChampionshipQuals)
				};

				const ageRating = calculateAgeRatingTotal(percentiles, playerData.eventsPlayed);
				const ratingTier = getRatingTier(ageRating);
				const isProvisional = playerData.eventsPlayed < 3;

				return {
					...standing,
					ageRating,
					ratingTier,
					isProvisional
				};
			});
		}

		// decklists and lssEvents already fetched in Promise.all above

		// Sort results: in_progress events first, then by date (most recent first)
		const sortedResults = [...allResults].sort((a, b) => {
			// In-progress events come first
			if (a.event.status === 'in_progress' && b.event.status !== 'in_progress') return -1;
			if (a.event.status !== 'in_progress' && b.event.status === 'in_progress') return 1;
			// Then sort by date (most recent first)
			return new Date(b.event.eventDate) - new Date(a.event.eventDate);
		});

		// Filter events to only show upcoming ones for the events list
		const upcomingEvents = events.filter(e => e.status === 'upcoming');

		return {
			events: upcomingEvents,
			allEvents: events, // All events for circuit tracker
			archiveEvents,
			eventResults: sortedResults,
			standings,
			decklists,
			lssEvents,
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
			allEvents: [],
			archiveEvents: [],
			eventResults: [],
			standings: [],
			decklists: [],
			lssEvents: [],
			currentYear,
			selectedSeason: 'all',
			selectedCircuit,
			availableSeasons: ['all'],
			circuitsByYear: { 'all': [] }
		};
	}
}
