import { db } from '$lib/server/db';
import { standing, match, decklist, event, eventPlayerHero } from '$lib/server/db/schema';
import { eq, desc, or, asc, inArray, and, isNull } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { calculatePercentile, calculateRankPercentile } from '$lib/age-rating.js';
import { playerKey as getPlayerKey } from '$lib/server/players/key.js';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';

/**
 * Convert hero name to static image URL
 * e.g., "Kayo, Armed and Dangerous" -> "/hero_images/kayo-armed-and-dangerous.webp"
 * e.g., "Arakni, 5L!p3d 7hRu 7h3 cR4X" -> "/hero_images/arakni-5lp3d-7hru-7h3-cr4x.webp"
 * e.g., "Jarl Vetreiði" -> "/hero_images/jarl-vetreidi.webp"
 */
function getHeroImageUrl(heroName) {
	if (!heroName) return null;
	const slug = heroName
		.toLowerCase()
		// Normalize special characters (ð → d, etc.)
		.replace(/ð/g, 'd')
		.replace(/þ/g, 'th')
		.replace(/æ/g, 'ae')
		.replace(/ø/g, 'o')
		.replace(/å/g, 'a')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove diacritics
		.replace(/[!@#$%^&*()+=[\]{}|\\:;<>?/~`]/g, '') // Remove special chars
		.replace(/[,'"]/g, '') // Remove commas, quotes
		.replace(/\s+/g, '-') // Replace spaces with dashes
		.replace(/-+/g, '-') // Collapse multiple dashes
		.trim();
	return `/hero_images/${slug}.webp`;
}

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

	const eventsPlayed = monthlyPoints.filter((p) => p > 0).length;
	const top8Finishes = monthlyPoints.filter((p) => p >= 15).length;

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

// Note: calculatePercentile and calculateRankPercentile are imported from $lib/age-rating.js

export async function load({ params, locals }) {
	const { gemId } = params;

	// Get all standings for this GEM ID - this is now the single source of truth
	const standings = await db
		.select()
		.from(standing)
		.where(eq(standing.gemId, gemId))
		.orderBy(desc(standing.season), standing.circuit);

	if (!standings.length) {
		throw error(404, 'Player not found');
	}

	// Check if user is admin
	const isAdmin = locals.user?.role === 'admin';

	// === FETCH ALL STANDINGS ONCE (for rank calculation and percentiles) ===
	// Reuse the shared cache populated by the age-open page so we don't
	// re-pull the entire standings table per profile view.
	const allStandings = await getCachedOrFetch(
		`${CACHE_KEYS.STANDINGS}:all`,
		() => db.select().from(standing).orderBy(desc(standing.totalPoints)),
		CACHE_TTL.MEDIUM
	);

	// Group standings by circuit/season for efficient rank lookup
	const standingsByCircuitSeason = new Map();
	for (const s of allStandings) {
		const key = `${s.season}|${s.circuit}`;
		if (!standingsByCircuitSeason.has(key)) {
			standingsByCircuitSeason.set(key, []);
		}
		standingsByCircuitSeason.get(key).push(s);
	}

	// Sort each circuit/season group and cache the sorted order
	for (const [key, group] of standingsByCircuitSeason) {
		group.sort(compareStandings);
	}

	// Calculate rank for each of this player's standings using cached data
	const standingsWithRank = standings.map((standing) => {
		const key = `${standing.season}|${standing.circuit}`;
		const circuitSeasonStandings = standingsByCircuitSeason.get(key) || [];
		const rank = circuitSeasonStandings.findIndex((s) => s.id === standing.id) + 1;
		return { ...standing, calculatedRank: rank };
	});

	// Calculate aggregate stats across all standings
	const totalStats = standingsWithRank.reduce(
		(acc, s) => {
			const derived = calculateDerivedStats(s);
			acc.totalPoints += s.totalPoints || 0;
			acc.matchesWon += s.matchesWon || 0;
			acc.matchesPlayed += s.matchesPlayed || 0;
			acc.eventsPlayed += derived.eventsPlayed;
			acc.top8Finishes += derived.top8Finishes;
			return acc;
		},
		{ totalPoints: 0, matchesWon: 0, matchesPlayed: 0, eventsPlayed: 0, top8Finishes: 0 }
	);

	// Display name comes from the most recent season's standings (first in array since sorted desc)
	const displayName = standingsWithRank[0]?.playerName || 'Unknown Player';

	// Collect ALL player names from ALL standings for this player (handles name changes across seasons)
	const allPlayerNames = [...new Set(standings.map((s) => s.playerName).filter(Boolean))];

	// Group by gemId to get aggregate stats per player
	// Also build cache for derived stats to avoid redundant calculations
	const playerStatsMap = new Map();
	const derivedStatsCache = new Map();

	for (const standing of allStandings) {
		// Identity by GEM ID; rows without one stay isolated (no name merging).
		const key = getPlayerKey(standing);
		if (!key) continue;

		if (!playerStatsMap.has(key)) {
			playerStatsMap.set(key, {
				gemId: standing.gemId,
				playerName: standing.playerName,
				totalPoints: 0,
				matchesWon: 0,
				matchesPlayed: 0,
				eventsPlayed: 0,
				top8Finishes: 0,
				bestRank: null,
				championshipQualifications: 0,
				standings: []
			});
		}

		// Cache derived stats calculation
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
		playerData.standings.push(standing);
	}

	// Calculate ranks for all players using pre-grouped and pre-sorted data
	// (standingsByCircuitSeason was already built and sorted above)
	for (const [playerKey, playerData] of playerStatsMap) {
		for (const standing of playerData.standings) {
			const circuitSeasonKey = `${standing.season}|${standing.circuit}`;
			const circuitSeasonStandings = standingsByCircuitSeason.get(circuitSeasonKey) || [];
			// Match using the canonical playerKey so both sides use the same identity rule.
			const rank =
				circuitSeasonStandings.findIndex((s) => getPlayerKey(s) === playerKey) + 1;

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

	// Extract arrays of all player metrics for percentile calculation
	const allPlayers = Array.from(playerStatsMap.values()).filter((p) => p.eventsPlayed >= 1);
	const allWinRates = allPlayers.map((p) =>
		p.matchesPlayed > 0 ? p.matchesWon / p.matchesPlayed : 0
	);
	const allTop8Rates = allPlayers.map((p) =>
		p.eventsPlayed > 0 ? p.top8Finishes / p.eventsPlayed : 0
	);
	const allEventsPlayed = allPlayers.map((p) => p.eventsPlayed);
	const allBestRanks = allPlayers.filter((p) => p.bestRank !== null).map((p) => p.bestRank);
	const allAvgPointsPerEvent = allPlayers.map((p) =>
		p.eventsPlayed > 0 ? p.totalPoints / p.eventsPlayed : 0
	);
	const allChampionshipQuals = allPlayers.map((p) => p.championshipQualifications);

	// Calculate this player's metrics
	const thisPlayerWinRate =
		totalStats.matchesPlayed > 0 ? totalStats.matchesWon / totalStats.matchesPlayed : 0;
	const thisPlayerTop8Rate =
		totalStats.eventsPlayed > 0 ? totalStats.top8Finishes / totalStats.eventsPlayed : 0;
	const thisPlayerBestRank =
		standingsWithRank.length > 0
			? Math.min(...standingsWithRank.filter((s) => s.calculatedRank).map((s) => s.calculatedRank))
			: null;
	const thisPlayerAvgPts =
		totalStats.eventsPlayed > 0 ? totalStats.totalPoints / totalStats.eventsPlayed : 0;
	const thisPlayerChampionshipQuals = standingsWithRank.filter(
		(s) => s.calculatedRank && s.calculatedRank <= 16
	).length;

	// Calculate percentiles for this player
	const percentiles = {
		winRate: calculatePercentile(thisPlayerWinRate, allWinRates),
		top8Rate: calculatePercentile(thisPlayerTop8Rate, allTop8Rates),
		experience: calculatePercentile(totalStats.eventsPlayed, allEventsPlayed),
		bestRank:
			thisPlayerBestRank !== null && thisPlayerBestRank !== Infinity
				? calculateRankPercentile(thisPlayerBestRank, allBestRanks)
				: 50,
		efficiency: calculatePercentile(thisPlayerAvgPts, allAvgPointsPerEvent),
		championship: calculatePercentile(thisPlayerChampionshipQuals, allChampionshipQuals),
		totalPlayers: allPlayers.length
	};

	// === MATCH HISTORY ===
	// Pull matches that belong to THIS player. The name fallback only applies
	// to matches where the corresponding player slot has NO GEM ID — otherwise
	// a same-named different player (e.g., two "John Kim"s with different GEM
	// IDs) would have their matches incorrectly merged into this profile.
	const playerMatchesRaw = await db
		.select()
		.from(match)
		.where(
			or(
				eq(match.player1GemId, gemId),
				eq(match.player2GemId, gemId),
				and(isNull(match.player1GemId), inArray(match.player1Name, allPlayerNames)),
				and(isNull(match.player2GemId), inArray(match.player2Name, allPlayerNames))
			)
		)
		.orderBy(desc(match.year), asc(match.round));

	// Transform to match expected format
	const playerMatches = playerMatchesRaw.map((match) => ({
		match,
		event: {
			title: `${match.circuit} ${match.month} Open`,
			circuit: match.circuit,
			month: match.month,
			year: match.year
		}
	}));

	// Calculate head-to-head records
	const headToHeadMap = new Map();

	for (const { match, event: eventData } of playerMatches) {
		// Check if this player is player1 (by GEM ID or any of their known names)
		const isPlayer1 =
			match.player1GemId === gemId ||
			(!match.player1GemId && allPlayerNames.includes(match.player1Name));
		const opponentGemId = isPlayer1 ? match.player2GemId : match.player1GemId;
		const opponentName = isPlayer1 ? match.player2Name : match.player1Name;
		const won =
			(isPlayer1 && match.winner === 'player1') || (!isPlayer1 && match.winner === 'player2');
		const lost =
			(isPlayer1 && match.winner === 'player2') || (!isPlayer1 && match.winner === 'player1');

		const key = opponentGemId || opponentName;
		if (!headToHeadMap.has(key)) {
			headToHeadMap.set(key, {
				opponentGemId,
				opponentName,
				wins: 0,
				losses: 0,
				draws: 0,
				matches: []
			});
		}

		const h2h = headToHeadMap.get(key);
		if (won) h2h.wins++;
		else if (lost) h2h.losses++;
		else h2h.draws++;

		h2h.matches.push({
			eventTitle: eventData.title,
			circuit: eventData.circuit,
			month: eventData.month,
			year: eventData.year,
			round: match.round,
			result: won ? 'W' : lost ? 'L' : 'D'
		});
	}

	// Calculate nemesis (most losses to) and best matchup (most wins against)
	// Tiebreakers: most recent loss (nemesis) / most recent win (bestMatchup)
	const headToHeadArray = Array.from(headToHeadMap.values());

	// Helper to get index of most recent match with a specific result (lower index = more recent)
	const getMostRecentMatchIndex = (h2h, resultType) => {
		const idx = h2h.matches.findIndex((m) => m.result === resultType);
		return idx === -1 ? Infinity : idx;
	};

	const nemesis =
		headToHeadArray
			.filter((h) => h.losses > 0)
			.sort((a, b) => {
				// Primary sort: most losses
				if (b.losses !== a.losses) return b.losses - a.losses;
				// Tiebreaker: most recent loss (lower index = more recent)
				return getMostRecentMatchIndex(a, 'L') - getMostRecentMatchIndex(b, 'L');
			})[0] || null;
	const bestMatchup =
		headToHeadArray
			.filter((h) => h.wins > 0)
			.sort((a, b) => {
				// Primary sort: most wins
				if (b.wins !== a.wins) return b.wins - a.wins;
				// Tiebreaker: most recent win (lower index = more recent)
				return getMostRecentMatchIndex(a, 'W') - getMostRecentMatchIndex(b, 'W');
			})[0] || null;

	// Calculate win streaks
	let currentStreak = 0;
	let longestWinStreak = 0;
	let tempStreak = 0;

	// For longest streak, iterate chronologically (reversed since matches are sorted desc)
	const chronologicalMatches = [...playerMatches].reverse();
	for (const { match } of chronologicalMatches) {
		const isPlayer1 =
			match.player1GemId === gemId ||
			(!match.player1GemId && allPlayerNames.includes(match.player1Name));
		const won =
			(isPlayer1 && match.winner === 'player1') || (!isPlayer1 && match.winner === 'player2');

		if (won) {
			tempStreak++;
			longestWinStreak = Math.max(longestWinStreak, tempStreak);
		} else {
			tempStreak = 0;
		}
	}

	// Current streak (from most recent match backwards)
	for (const { match } of playerMatches) {
		const isPlayer1 =
			match.player1GemId === gemId ||
			(!match.player1GemId && allPlayerNames.includes(match.player1Name));
		const won =
			(isPlayer1 && match.winner === 'player1') || (!isPlayer1 && match.winner === 'player2');

		if (won) currentStreak++;
		else break;
	}

	// Group matches by circuit/year/month for expandable monthly breakdown
	const matchesByEvent = new Map();
	for (const { match, event: eventData } of playerMatches) {
		const key = `${eventData.year}|${eventData.circuit}|${eventData.month}`;
		if (!matchesByEvent.has(key)) {
			matchesByEvent.set(key, []);
		}
		matchesByEvent.get(key).push({ match, event: eventData });
	}

	// Convert to object for serialization
	const matchesByEventObj = {};
	for (const [key, matches] of matchesByEvent) {
		matchesByEventObj[key] = matches;
	}

	const matchHistory =
		playerMatches.length > 0
			? {
					totalMatches: playerMatches.length,
					recentMatches: playerMatches.slice(0, 20),
					headToHead: headToHeadArray.sort(
						(a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws)
					),
					nemesis,
					bestMatchup,
					currentWinStreak: currentStreak,
					longestWinStreak,
					matchesByEvent: matchesByEventObj
				}
			: null;

	// === DECKLISTS ===
	// Query decklists for this player with event join (single query, no N+1)
	const decklistsWithEvents = await db
		.select({
			decklist: decklist,
			event: {
				id: event.id,
				title: event.title,
				circuit: event.circuit,
				month: event.month,
				eventDate: event.eventDate,
				format: event.format
			}
		})
		.from(decklist)
		.leftJoin(event, eq(decklist.eventId, event.id))
		.where(eq(decklist.gemId, gemId));

	// Transform to expected format
	const playerDecklists = decklistsWithEvents.map((row) => ({
		decklist: row.decklist,
		event: row.event?.id ? row.event : null
	}));

	// Sort by event date (newest first)
	playerDecklists.sort((a, b) => {
		const dateA = a.event?.eventDate ? new Date(a.event.eventDate) : new Date(0);
		const dateB = b.event?.eventDate ? new Date(b.event.eventDate) : new Date(0);
		return dateB - dateA;
	});

	// === HERO HISTORY ===
	// Query hero choices for this player from event_player_heroes
	const heroHistory = await db
		.select()
		.from(eventPlayerHero)
		.where(eq(eventPlayerHero.gemId, gemId))
		.orderBy(desc(eventPlayerHero.season), eventPlayerHero.month);

	// Calculate hero usage stats
	const heroStats = heroHistory.reduce((acc, entry) => {
		if (!acc[entry.hero]) {
			acc[entry.hero] = { hero: entry.hero, count: 0, events: [] };
		}
		acc[entry.hero].count++;
		acc[entry.hero].events.push({
			season: entry.season,
			circuit: entry.circuit,
			month: entry.month
		});
		return acc;
	}, {});

	// Sort heroes by usage count (most played first) and add image URLs
	const heroUsage = Object.values(heroStats)
		.sort((a, b) => b.count - a.count)
		.map((usage) => ({
			...usage,
			imageUrl: getHeroImageUrl(usage.hero)
		}));

	// Create hero lookup map by season|circuit|month for this player
	const heroByEvent = {};
	for (const entry of heroHistory) {
		const key = `${entry.season}|${entry.circuit}|${entry.month}`;
		heroByEvent[key] = {
			hero: entry.hero,
			imageUrl: getHeroImageUrl(entry.hero)
		};
	}

	// === OPPONENT HERO LOOKUP ===
	// Collect all unique opponent GEM IDs and event keys from matches
	const opponentEventKeys = new Set();
	const opponentGemIds = new Set();
	for (const { match, event: eventData } of playerMatches) {
		const isPlayer1 =
			match.player1GemId === gemId ||
			(!match.player1GemId && allPlayerNames.includes(match.player1Name));
		const opponentGemId = isPlayer1 ? match.player2GemId : match.player1GemId;
		if (opponentGemId) {
			opponentGemIds.add(opponentGemId);
			// Format: opponentGemId|season|circuit|month
			opponentEventKeys.add(
				`${opponentGemId}|${eventData.year}|${eventData.circuit}|${eventData.month}`
			);
		}
	}

	// Query opponent heroes - only fetch records for relevant GEM IDs
	const opponentHeroMap = {};
	if (opponentGemIds.size > 0) {
		const relevantHeroes = await db
			.select()
			.from(eventPlayerHero)
			.where(inArray(eventPlayerHero.gemId, [...opponentGemIds]));

		for (const entry of relevantHeroes) {
			const key = `${entry.gemId}|${entry.season}|${entry.circuit}|${entry.month}`;
			if (opponentEventKeys.has(key)) {
				opponentHeroMap[key] = {
					hero: entry.hero,
					imageUrl: getHeroImageUrl(entry.hero)
				};
			}
		}
	}

	return {
		gemId,
		displayName,
		standings: standingsWithRank,
		totalStats,
		isAdmin,
		percentiles,
		matchHistory,
		decklists: playerDecklists,
		heroHistory,
		heroUsage,
		heroByEvent,
		opponentHeroMap
	};
}

export const actions = {
	updateStanding: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const standingId = formData.get('standingId');
		const field = formData.get('field');
		const value = formData.get('value');

		if (!standingId || !field) {
			return fail(400, { error: 'Missing required fields' });
		}

		// Parse value based on field type
		let parsedValue;
		const monthlyPointsFields = [
			'januaryPoints',
			'februaryPoints',
			'marchPoints',
			'aprilPoints',
			'mayPoints',
			'junePoints',
			'julyPoints',
			'augustPoints',
			'septemberPoints',
			'octoberPoints',
			'novemberPoints',
			'decemberPoints'
		];
		const monthlyMatchesWonFields = [
			'januaryMatchesWon',
			'februaryMatchesWon',
			'marchMatchesWon',
			'aprilMatchesWon',
			'mayMatchesWon',
			'juneMatchesWon',
			'julyMatchesWon',
			'augustMatchesWon',
			'septemberMatchesWon',
			'octoberMatchesWon',
			'novemberMatchesWon',
			'decemberMatchesWon'
		];
		const monthlyMatchesFields = [
			'januaryMatches',
			'februaryMatches',
			'marchMatches',
			'aprilMatches',
			'mayMatches',
			'juneMatches',
			'julyMatches',
			'augustMatches',
			'septemberMatches',
			'octoberMatches',
			'novemberMatches',
			'decemberMatches'
		];
		const numericFields = [
			'totalPoints',
			'matchesWon',
			'matchesPlayed',
			...monthlyPointsFields,
			...monthlyMatchesWonFields,
			...monthlyMatchesFields
		];
		const decimalFields = ['winPercentage'];
		const isMonthlyField = [
			...monthlyPointsFields,
			...monthlyMatchesWonFields,
			...monthlyMatchesFields
		].includes(field);

		if (numericFields.includes(field)) {
			parsedValue = parseInt(value, 10) || 0;
		} else if (decimalFields.includes(field)) {
			parsedValue = parseFloat(value) || null;
		} else {
			parsedValue = value || null;
		}

		try {
			// Special handling for gemId - update ALL standings for this player
			if (field === 'gemId') {
				const [currentStanding] = await db
					.select()
					.from(standing)
					.where(eq(standing.id, standingId));

				if (!currentStanding) {
					return fail(404, { error: 'Standing not found' });
				}

				const oldGemId = currentStanding.gemId;
				if (oldGemId) {
					// Update ALL standings with the old gemId to the new gemId
					await db
						.update(standing)
						.set({ gemId: parsedValue, updatedAt: new Date() })
						.where(eq(standing.gemId, oldGemId));
				} else {
					// No old gemId, just update this standing
					await db
						.update(standing)
						.set({ gemId: parsedValue, updatedAt: new Date() })
						.where(eq(standing.id, standingId));
				}

				return { success: true, message: 'GEM ID updated across all seasons' };
			}

			// Special handling for playerName - only update if this is the most recent season
			if (field === 'playerName') {
				const [currentStanding] = await db
					.select()
					.from(standing)
					.where(eq(standing.id, standingId));

				if (!currentStanding || !currentStanding.gemId) {
					// No gemId, just update this standing directly
					await db
						.update(standing)
						.set({ playerName: parsedValue, updatedAt: new Date() })
						.where(eq(standing.id, standingId));
					return { success: true };
				}

				// Get all standings for this gemId, sorted by season desc
				const playerStandings = await db
					.select()
					.from(standing)
					.where(eq(standing.gemId, currentStanding.gemId))
					.orderBy(desc(standing.season));

				const mostRecentStandingId = playerStandings[0]?.id;

				// Only update if this IS the most recent season
				if (standingId === mostRecentStandingId) {
					await db
						.update(standing)
						.set({ playerName: parsedValue, updatedAt: new Date() })
						.where(eq(standing.id, standingId));
					return { success: true };
				} else {
					return fail(400, {
						error:
							'Can only update player name on the most recent season. Historical names are preserved.'
					});
				}
			}

			// Standard field update
			await db
				.update(standing)
				.set({ [field]: parsedValue, updatedAt: new Date() })
				.where(eq(standing.id, standingId));

			// If a monthly field was updated, recalculate all aggregate fields
			if (isMonthlyField) {
				// Fetch the current standing to get all monthly values
				const [standing] = await db.select().from(standing).where(eq(standing.id, standingId));

				if (standing) {
					// Calculate total points from monthly points
					const totalPoints =
						(standing.januaryPoints || 0) +
						(standing.februaryPoints || 0) +
						(standing.marchPoints || 0) +
						(standing.aprilPoints || 0) +
						(standing.mayPoints || 0) +
						(standing.junePoints || 0) +
						(standing.julyPoints || 0) +
						(standing.augustPoints || 0) +
						(standing.septemberPoints || 0) +
						(standing.octoberPoints || 0) +
						(standing.novemberPoints || 0) +
						(standing.decemberPoints || 0);

					// Calculate total matches won from monthly matches won
					const matchesWon =
						(standing.januaryMatchesWon || 0) +
						(standing.februaryMatchesWon || 0) +
						(standing.marchMatchesWon || 0) +
						(standing.aprilMatchesWon || 0) +
						(standing.mayMatchesWon || 0) +
						(standing.juneMatchesWon || 0) +
						(standing.julyMatchesWon || 0) +
						(standing.augustMatchesWon || 0) +
						(standing.septemberMatchesWon || 0) +
						(standing.octoberMatchesWon || 0) +
						(standing.novemberMatchesWon || 0) +
						(standing.decemberMatchesWon || 0);

					// Calculate total matches played from monthly matches
					const matchesPlayed =
						(standing.januaryMatches || 0) +
						(standing.februaryMatches || 0) +
						(standing.marchMatches || 0) +
						(standing.aprilMatches || 0) +
						(standing.mayMatches || 0) +
						(standing.juneMatches || 0) +
						(standing.julyMatches || 0) +
						(standing.augustMatches || 0) +
						(standing.septemberMatches || 0) +
						(standing.octoberMatches || 0) +
						(standing.novemberMatches || 0) +
						(standing.decemberMatches || 0);

					// Calculate win percentage
					const winPercentage =
						matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 10000) / 100 : null;

					// Update aggregate fields (eventsPlayed and top8Finishes are calculated dynamically)
					await db
						.update(standing)
						.set({
							totalPoints,
							matchesWon,
							matchesPlayed,
							winPercentage,
							updatedAt: new Date()
						})
						.where(eq(standing.id, standingId));
				}
			}

			return { success: true };
		} catch (err) {
			console.error('Failed to update standing:', err);
			return fail(500, { error: 'Failed to update standing' });
		}
	},

	addStanding: async ({ request, locals, params }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const season = formData.get('season');
		const circuit = formData.get('circuit');
		const playerName = formData.get('playerName');

		if (!season || !circuit || !playerName) {
			return fail(400, { error: 'Season, circuit, and player name are required' });
		}

		try {
			await db.insert(standing).values({
				season,
				circuit,
				playerName,
				gemId: params.gemId,
				totalPoints: 0,
				matchesWon: 0,
				matchesPlayed: 0
			});

			return { success: true, message: 'Standing added successfully' };
		} catch (err) {
			console.error('Failed to add standing:', err);
			if (err.code === '23505') {
				return fail(400, { error: 'Standing already exists for this season and circuit' });
			}
			return fail(500, { error: 'Failed to add standing' });
		}
	},

	deleteStanding: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const standingId = formData.get('standingId');

		if (!standingId) {
			return fail(400, { error: 'Standing ID required' });
		}

		try {
			await db.delete(standing).where(eq(standing.id, standingId));
			return { success: true };
		} catch (err) {
			console.error('Failed to delete standing:', err);
			return fail(500, { error: 'Failed to delete standing' });
		}
	}
};
