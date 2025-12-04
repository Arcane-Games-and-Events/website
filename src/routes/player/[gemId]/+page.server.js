import { db } from '$lib/server/db';
import { seasonStanding, eventMatch } from '$lib/server/db/schema';
import { eq, desc, or, asc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';

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

/**
 * Calculate percentile rank (0-100) for a value in an array
 * Higher percentile = better (e.g., 95th percentile means better than 95% of players)
 */
function calculatePercentile(value, allValues) {
	if (allValues.length === 0) return 50;
	const sorted = [...allValues].sort((a, b) => a - b);
	const belowCount = sorted.filter(v => v < value).length;
	const equalCount = sorted.filter(v => v === value).length;
	// Use midpoint method for ties
	return ((belowCount + equalCount / 2) / sorted.length) * 100;
}

/**
 * Calculate percentile rank for rank values (lower is better)
 */
function calculateRankPercentile(rank, allRanks) {
	if (allRanks.length === 0 || rank === null) return 50;
	const sorted = [...allRanks].sort((a, b) => a - b);
	// For ranks, lower is better, so we count how many are WORSE (higher)
	const worseCount = sorted.filter(r => r > rank).length;
	const equalCount = sorted.filter(r => r === rank).length;
	return ((worseCount + equalCount / 2) / sorted.length) * 100;
}

export async function load({ params, locals }) {
	const { gemId } = params;

	// Get all standings for this GEM ID - this is now the single source of truth
	const standings = await db
		.select()
		.from(seasonStanding)
		.where(eq(seasonStanding.gemId, gemId))
		.orderBy(desc(seasonStanding.season), seasonStanding.circuit);

	if (!standings.length) {
		throw error(404, 'Player not found');
	}

	// Check if user is admin
	const isAdmin = locals.user?.role === 'admin';

	// === FETCH ALL STANDINGS ONCE (for rank calculation and percentiles) ===
	const allStandings = await db.select().from(seasonStanding);

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
		const rank = circuitSeasonStandings.findIndex(s => s.id === standing.id) + 1;
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

	// Group by gemId to get aggregate stats per player
	const playerStatsMap = new Map();
	for (const standing of allStandings) {
		const playerGemId = standing.gemId;
		if (!playerGemId) continue;

		if (!playerStatsMap.has(playerGemId)) {
			playerStatsMap.set(playerGemId, {
				gemId: playerGemId,
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

		const derived = calculateDerivedStats(standing);
		const playerData = playerStatsMap.get(playerGemId);
		playerData.totalPoints += standing.totalPoints || 0;
		playerData.matchesWon += standing.matchesWon || 0;
		playerData.matchesPlayed += standing.matchesPlayed || 0;
		playerData.eventsPlayed += derived.eventsPlayed;
		playerData.top8Finishes += derived.top8Finishes;
		playerData.standings.push(standing);
	}

	// Calculate ranks for all players in their circuits
	for (const [playerGemId, playerData] of playerStatsMap) {
		for (const standing of playerData.standings) {
			// Get all standings for the same circuit/season
			const circuitStandings = allStandings.filter(
				s => s.season === standing.season && s.circuit === standing.circuit
			);
			circuitStandings.sort(compareStandings);
			const rank = circuitStandings.findIndex(s => s.gemId === playerGemId) + 1;

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
	const allPlayers = Array.from(playerStatsMap.values()).filter(p => p.eventsPlayed >= 1);
	const allWinRates = allPlayers.map(p => p.matchesPlayed > 0 ? p.matchesWon / p.matchesPlayed : 0);
	const allTop8Rates = allPlayers.map(p => p.eventsPlayed > 0 ? p.top8Finishes / p.eventsPlayed : 0);
	const allEventsPlayed = allPlayers.map(p => p.eventsPlayed);
	const allBestRanks = allPlayers.filter(p => p.bestRank !== null).map(p => p.bestRank);
	const allAvgPointsPerEvent = allPlayers.map(p => p.eventsPlayed > 0 ? p.totalPoints / p.eventsPlayed : 0);
	const allChampionshipQuals = allPlayers.map(p => p.championshipQualifications);

	// Calculate this player's metrics
	const thisPlayerWinRate = totalStats.matchesPlayed > 0 ? totalStats.matchesWon / totalStats.matchesPlayed : 0;
	const thisPlayerTop8Rate = totalStats.eventsPlayed > 0 ? totalStats.top8Finishes / totalStats.eventsPlayed : 0;
	const thisPlayerBestRank = standingsWithRank.length > 0
		? Math.min(...standingsWithRank.filter(s => s.calculatedRank).map(s => s.calculatedRank))
		: null;
	const thisPlayerAvgPts = totalStats.eventsPlayed > 0 ? totalStats.totalPoints / totalStats.eventsPlayed : 0;
	const thisPlayerChampionshipQuals = standingsWithRank.filter(s => s.calculatedRank && s.calculatedRank <= 16).length;

	// Calculate percentiles for this player
	const percentiles = {
		winRate: calculatePercentile(thisPlayerWinRate, allWinRates),
		top8Rate: calculatePercentile(thisPlayerTop8Rate, allTop8Rates),
		experience: calculatePercentile(totalStats.eventsPlayed, allEventsPlayed),
		bestRank: thisPlayerBestRank !== null && thisPlayerBestRank !== Infinity
			? calculateRankPercentile(thisPlayerBestRank, allBestRanks)
			: 50,
		efficiency: calculatePercentile(thisPlayerAvgPts, allAvgPointsPerEvent),
		championship: calculatePercentile(thisPlayerChampionshipQuals, allChampionshipQuals),
		totalPlayers: allPlayers.length
	};

	// === MATCH HISTORY ===
	// Query all matches for this player (now using year, circuit, month directly on eventMatch)
	const playerMatchesRaw = await db
		.select()
		.from(eventMatch)
		.where(
			or(
				eq(eventMatch.player1GemId, gemId),
				eq(eventMatch.player2GemId, gemId)
			)
		)
		.orderBy(desc(eventMatch.year), asc(eventMatch.round));

	// Transform to match expected format
	const playerMatches = playerMatchesRaw.map(match => ({
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
		const isPlayer1 = match.player1GemId === gemId;
		const opponentGemId = isPlayer1 ? match.player2GemId : match.player1GemId;
		const opponentName = isPlayer1 ? match.player2Name : match.player1Name;
		const won = (isPlayer1 && match.winner === 'player1') ||
			(!isPlayer1 && match.winner === 'player2');
		const lost = (isPlayer1 && match.winner === 'player2') ||
			(!isPlayer1 && match.winner === 'player1');

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
		const idx = h2h.matches.findIndex(m => m.result === resultType);
		return idx === -1 ? Infinity : idx;
	};

	const nemesis = headToHeadArray
		.filter(h => h.losses > 0)
		.sort((a, b) => {
			// Primary sort: most losses
			if (b.losses !== a.losses) return b.losses - a.losses;
			// Tiebreaker: most recent loss (lower index = more recent)
			return getMostRecentMatchIndex(a, 'L') - getMostRecentMatchIndex(b, 'L');
		})[0] || null;
	const bestMatchup = headToHeadArray
		.filter(h => h.wins > 0)
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
		const isPlayer1 = match.player1GemId === gemId;
		const won = (isPlayer1 && match.winner === 'player1') ||
			(!isPlayer1 && match.winner === 'player2');

		if (won) {
			tempStreak++;
			longestWinStreak = Math.max(longestWinStreak, tempStreak);
		} else {
			tempStreak = 0;
		}
	}

	// Current streak (from most recent match backwards)
	for (const { match } of playerMatches) {
		const isPlayer1 = match.player1GemId === gemId;
		const won = (isPlayer1 && match.winner === 'player1') ||
			(!isPlayer1 && match.winner === 'player2');

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

	const matchHistory = playerMatches.length > 0 ? {
		totalMatches: playerMatches.length,
		recentMatches: playerMatches.slice(0, 20),
		headToHead: headToHeadArray.sort((a, b) =>
			(b.wins + b.losses + b.draws) - (a.wins + a.losses + a.draws)
		),
		nemesis,
		bestMatchup,
		currentWinStreak: currentStreak,
		longestWinStreak,
		matchesByEvent: matchesByEventObj
	} : null;

	return {
		gemId,
		displayName,
		standings: standingsWithRank,
		totalStats,
		isAdmin,
		percentiles,
		matchHistory
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
			'januaryPoints', 'februaryPoints', 'marchPoints', 'aprilPoints', 'mayPoints',
			'junePoints', 'julyPoints', 'augustPoints', 'septemberPoints', 'octoberPoints',
			'novemberPoints', 'decemberPoints'
		];
		const monthlyMatchesWonFields = [
			'januaryMatchesWon', 'februaryMatchesWon', 'marchMatchesWon', 'aprilMatchesWon',
			'mayMatchesWon', 'juneMatchesWon', 'julyMatchesWon', 'augustMatchesWon',
			'septemberMatchesWon', 'octoberMatchesWon', 'novemberMatchesWon', 'decemberMatchesWon'
		];
		const monthlyMatchesFields = [
			'januaryMatches', 'februaryMatches', 'marchMatches', 'aprilMatches', 'mayMatches',
			'juneMatches', 'julyMatches', 'augustMatches', 'septemberMatches', 'octoberMatches',
			'novemberMatches', 'decemberMatches'
		];
		const numericFields = [
			'totalPoints', 'matchesWon', 'matchesPlayed',
			...monthlyPointsFields, ...monthlyMatchesWonFields, ...monthlyMatchesFields
		];
		const decimalFields = ['winPercentage'];
		const isMonthlyField = [...monthlyPointsFields, ...monthlyMatchesWonFields, ...monthlyMatchesFields].includes(field);

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
					.from(seasonStanding)
					.where(eq(seasonStanding.id, standingId));

				if (!currentStanding) {
					return fail(404, { error: 'Standing not found' });
				}

				const oldGemId = currentStanding.gemId;
				if (oldGemId) {
					// Update ALL standings with the old gemId to the new gemId
					await db
						.update(seasonStanding)
						.set({ gemId: parsedValue, updatedAt: new Date() })
						.where(eq(seasonStanding.gemId, oldGemId));
				} else {
					// No old gemId, just update this standing
					await db
						.update(seasonStanding)
						.set({ gemId: parsedValue, updatedAt: new Date() })
						.where(eq(seasonStanding.id, standingId));
				}

				return { success: true, message: 'GEM ID updated across all seasons' };
			}

			// Special handling for playerName - only update if this is the most recent season
			if (field === 'playerName') {
				const [currentStanding] = await db
					.select()
					.from(seasonStanding)
					.where(eq(seasonStanding.id, standingId));

				if (!currentStanding || !currentStanding.gemId) {
					// No gemId, just update this standing directly
					await db
						.update(seasonStanding)
						.set({ playerName: parsedValue, updatedAt: new Date() })
						.where(eq(seasonStanding.id, standingId));
					return { success: true };
				}

				// Get all standings for this gemId, sorted by season desc
				const playerStandings = await db
					.select()
					.from(seasonStanding)
					.where(eq(seasonStanding.gemId, currentStanding.gemId))
					.orderBy(desc(seasonStanding.season));

				const mostRecentStandingId = playerStandings[0]?.id;

				// Only update if this IS the most recent season
				if (standingId === mostRecentStandingId) {
					await db
						.update(seasonStanding)
						.set({ playerName: parsedValue, updatedAt: new Date() })
						.where(eq(seasonStanding.id, standingId));
					return { success: true };
				} else {
					return fail(400, {
						error: 'Can only update player name on the most recent season. Historical names are preserved.'
					});
				}
			}

			// Standard field update
			await db
				.update(seasonStanding)
				.set({ [field]: parsedValue, updatedAt: new Date() })
				.where(eq(seasonStanding.id, standingId));

			// If a monthly field was updated, recalculate all aggregate fields
			if (isMonthlyField) {
				// Fetch the current standing to get all monthly values
				const [standing] = await db
					.select()
					.from(seasonStanding)
					.where(eq(seasonStanding.id, standingId));

				if (standing) {
					// Calculate total points from monthly points
					const totalPoints = (standing.januaryPoints || 0) + (standing.februaryPoints || 0) +
						(standing.marchPoints || 0) + (standing.aprilPoints || 0) +
						(standing.mayPoints || 0) + (standing.junePoints || 0) +
						(standing.julyPoints || 0) + (standing.augustPoints || 0) +
						(standing.septemberPoints || 0) + (standing.octoberPoints || 0) +
						(standing.novemberPoints || 0) + (standing.decemberPoints || 0);

					// Calculate total matches won from monthly matches won
					const matchesWon = (standing.januaryMatchesWon || 0) + (standing.februaryMatchesWon || 0) +
						(standing.marchMatchesWon || 0) + (standing.aprilMatchesWon || 0) +
						(standing.mayMatchesWon || 0) + (standing.juneMatchesWon || 0) +
						(standing.julyMatchesWon || 0) + (standing.augustMatchesWon || 0) +
						(standing.septemberMatchesWon || 0) + (standing.octoberMatchesWon || 0) +
						(standing.novemberMatchesWon || 0) + (standing.decemberMatchesWon || 0);

					// Calculate total matches played from monthly matches
					const matchesPlayed = (standing.januaryMatches || 0) + (standing.februaryMatches || 0) +
						(standing.marchMatches || 0) + (standing.aprilMatches || 0) +
						(standing.mayMatches || 0) + (standing.juneMatches || 0) +
						(standing.julyMatches || 0) + (standing.augustMatches || 0) +
						(standing.septemberMatches || 0) + (standing.octoberMatches || 0) +
						(standing.novemberMatches || 0) + (standing.decemberMatches || 0);

					// Calculate win percentage
					const winPercentage = matchesPlayed > 0
						? Math.round((matchesWon / matchesPlayed) * 10000) / 100
						: null;

					// Update aggregate fields (eventsPlayed and top8Finishes are calculated dynamically)
					await db
						.update(seasonStanding)
						.set({
							totalPoints,
							matchesWon,
							matchesPlayed,
							winPercentage,
							updatedAt: new Date()
						})
						.where(eq(seasonStanding.id, standingId));
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
			await db.insert(seasonStanding).values({
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
			await db.delete(seasonStanding).where(eq(seasonStanding.id, standingId));
			return { success: true };
		} catch (err) {
			console.error('Failed to delete standing:', err);
			return fail(500, { error: 'Failed to delete standing' });
		}
	}
};
