import { db } from '$lib/server/db';
import { player, seasonStanding, playerAlias } from '$lib/server/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';

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

	// Try to find the player by GEM ID
	const playerRecord = await db
		.select()
		.from(player)
		.where(eq(player.gemId, gemId))
		.limit(1);

	// Get all standings for this GEM ID (even if no player record exists)
	const standings = await db
		.select()
		.from(seasonStanding)
		.where(eq(seasonStanding.gemId, gemId))
		.orderBy(desc(seasonStanding.season), seasonStanding.circuit);

	if (!playerRecord.length && !standings.length) {
		throw error(404, 'Player not found');
	}

	// Get player aliases if player record exists
	let aliases = [];
	if (playerRecord.length) {
		aliases = await db
			.select()
			.from(playerAlias)
			.where(eq(playerAlias.playerId, playerRecord[0].id));
	}

	// Calculate rank for each standing using tiebreaker rules
	// For each standing, fetch all standings in the same circuit/season and determine rank
	const standingsWithRank = await Promise.all(
		standings.map(async (standing) => {
			// Get all standings for the same circuit/season
			const circuitSeasonStandings = await db
				.select()
				.from(seasonStanding)
				.where(
					and(
						eq(seasonStanding.season, standing.season),
						eq(seasonStanding.circuit, standing.circuit)
					)
				);

			// Sort using tiebreaker rules
			circuitSeasonStandings.sort(compareStandings);

			// Find this player's position in the sorted list
			const rank = circuitSeasonStandings.findIndex(s => s.id === standing.id) + 1;

			return { ...standing, calculatedRank: rank };
		})
	);

	// Calculate aggregate stats across all standings
	const totalStats = standingsWithRank.reduce(
		(acc, s) => {
			acc.totalPoints += s.totalPoints || 0;
			acc.matchesWon += s.matchesWon || 0;
			acc.matchesPlayed += s.matchesPlayed || 0;
			acc.eventsPlayed += s.eventsPlayed || 0;
			acc.top8Finishes += s.top8Finishes || 0;
			return acc;
		},
		{ totalPoints: 0, matchesWon: 0, matchesPlayed: 0, eventsPlayed: 0, top8Finishes: 0 }
	);

	// Get the most recent display name from standings
	const displayName = playerRecord[0]?.displayName || standingsWithRank[0]?.playerName || 'Unknown Player';

	// Check if user is admin
	const isAdmin = locals.user?.role === 'admin';

	// === FETCH ALL PLAYER STATS FOR PERCENTILE CALCULATION ===
	// Get all unique players and their aggregate stats from seasonStanding
	const allStandings = await db.select().from(seasonStanding);

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

		const playerData = playerStatsMap.get(playerGemId);
		playerData.totalPoints += standing.totalPoints || 0;
		playerData.matchesWon += standing.matchesWon || 0;
		playerData.matchesPlayed += standing.matchesPlayed || 0;
		playerData.eventsPlayed += standing.eventsPlayed || 0;
		playerData.top8Finishes += standing.top8Finishes || 0;
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

	return {
		player: playerRecord[0] || null,
		gemId,
		displayName,
		aliases,
		standings: standingsWithRank,
		totalStats,
		isAdmin,
		percentiles
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
			'totalPoints', 'eventsPlayed', 'matchesWon', 'matchesPlayed', 'top8Finishes',
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
			// First update the specific field
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

					// Count events played (months with any activity)
					const months = [
						{ points: standing.januaryPoints, matches: standing.januaryMatches },
						{ points: standing.februaryPoints, matches: standing.februaryMatches },
						{ points: standing.marchPoints, matches: standing.marchMatches },
						{ points: standing.aprilPoints, matches: standing.aprilMatches },
						{ points: standing.mayPoints, matches: standing.mayMatches },
						{ points: standing.junePoints, matches: standing.juneMatches },
						{ points: standing.julyPoints, matches: standing.julyMatches },
						{ points: standing.augustPoints, matches: standing.augustMatches },
						{ points: standing.septemberPoints, matches: standing.septemberMatches },
						{ points: standing.octoberPoints, matches: standing.octoberMatches },
						{ points: standing.novemberPoints, matches: standing.novemberMatches },
						{ points: standing.decemberPoints, matches: standing.decemberMatches }
					];
					const eventsPlayed = months.filter(m => (m.points || 0) > 0 || (m.matches || 0) > 0).length;

					// Update aggregate fields
					await db
						.update(seasonStanding)
						.set({
							totalPoints,
							matchesWon,
							matchesPlayed,
							winPercentage,
							eventsPlayed,
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
				eventsPlayed: 0,
				matchesWon: 0,
				matchesPlayed: 0,
				top8Finishes: 0
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
