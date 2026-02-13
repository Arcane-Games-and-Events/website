import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { standing, match } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

// Helper to add timeout to promises
const withTimeout = (promise, ms, fallback) =>
	Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/players');
	}

	try {
		// Single RPC call replaces 20+ individual queries with 15s timeout
		const result = await withTimeout(
			db.execute(sql`SELECT get_admin_dashboard_stats() as data`),
			15000,
			null
		);

		if (!result) {
			console.warn('Admin dashboard RPC timed out - returning empty data');
			return { user: locals.user, standings: [] };
		}

		const data = result.rows?.[0]?.data || result[0]?.data;

		if (!data) {
			throw new Error('No data returned from get_admin_dashboard_stats()');
		}

		// Process standings with monthly breakdown
		const rawStandings = data.standings || [];
		const standings = rawStandings.map((standing) => {
			let winPercentage = standing.win_percentage || standing.winPercentage;
			const matchesPlayed = standing.matches_played || standing.matchesPlayed || 0;
			const matchesWon = standing.matches_won || standing.matchesWon || 0;

			if (winPercentage === null && matchesPlayed > 0) {
				winPercentage = parseFloat(((matchesWon / matchesPlayed) * 100).toFixed(2));
			}

			// Build monthly breakdown from flattened columns
			const monthlyBreakdown = {
				january: {
					points: standing.january_points || standing.januaryPoints || 0,
					matchesWon: standing.january_matches_won || standing.januaryMatchesWon || 0,
					events: standing.january_events || standing.januaryEvents || 0
				},
				february: {
					points: standing.february_points || standing.februaryPoints || 0,
					matchesWon: standing.february_matches_won || standing.februaryMatchesWon || 0,
					events: standing.february_events || standing.februaryEvents || 0
				},
				march: {
					points: standing.march_points || standing.marchPoints || 0,
					matchesWon: standing.march_matches_won || standing.marchMatchesWon || 0,
					events: standing.march_events || standing.marchEvents || 0
				},
				april: {
					points: standing.april_points || standing.aprilPoints || 0,
					matchesWon: standing.april_matches_won || standing.aprilMatchesWon || 0,
					events: standing.april_events || standing.aprilEvents || 0
				},
				may: {
					points: standing.may_points || standing.mayPoints || 0,
					matchesWon: standing.may_matches_won || standing.mayMatchesWon || 0,
					events: standing.may_events || standing.mayEvents || 0
				},
				june: {
					points: standing.june_points || standing.junePoints || 0,
					matchesWon: standing.june_matches_won || standing.juneMatchesWon || 0,
					events: standing.june_events || standing.juneEvents || 0
				},
				july: {
					points: standing.july_points || standing.julyPoints || 0,
					matchesWon: standing.july_matches_won || standing.julyMatchesWon || 0,
					events: standing.july_events || standing.julyEvents || 0
				},
				august: {
					points: standing.august_points || standing.augustPoints || 0,
					matchesWon: standing.august_matches_won || standing.augustMatchesWon || 0,
					events: standing.august_events || standing.augustEvents || 0
				},
				september: {
					points: standing.september_points || standing.septemberPoints || 0,
					matchesWon: standing.september_matches_won || standing.septemberMatchesWon || 0,
					events: standing.september_events || standing.septemberEvents || 0
				},
				october: {
					points: standing.october_points || standing.octoberPoints || 0,
					matchesWon: standing.october_matches_won || standing.octoberMatchesWon || 0,
					events: standing.october_events || standing.octoberEvents || 0
				},
				november: {
					points: standing.november_points || standing.novemberPoints || 0,
					matchesWon: standing.november_matches_won || standing.novemberMatchesWon || 0,
					events: standing.november_events || standing.novemberEvents || 0
				},
				december: {
					points: standing.december_points || standing.decemberPoints || 0,
					matchesWon: standing.december_matches_won || standing.decemberMatchesWon || 0,
					events: standing.december_events || standing.decemberEvents || 0
				}
			};

			return {
				...standing,
				// Normalize field names
				playerName: standing.player_name || standing.playerName,
				gemId: standing.gem_id || standing.gemId,
				totalPoints: standing.total_points || standing.totalPoints || 0,
				matchesWon,
				matchesPlayed,
				winPercentage,
				monthlyBreakdown
			};
		});

		return {
			user: locals.user,
			standings
		};
	} catch (error) {
		console.error('Admin players page load error:', error);

		if (error.message?.includes('get_admin_dashboard_stats')) {
			console.error(
				'RPC function not found. Run the migration: supabase/migrations/001_rpc_functions.sql'
			);
		}

		return {
			user: locals.user,
			standings: []
		};
	}
}

export const actions = {
	// Create a new player standing
	createStanding: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const season = formData.get('season')?.trim();
		const circuit = formData.get('circuit')?.trim();
		const playerName = formData.get('playerName')?.trim();
		const gemId = formData.get('gemId')?.trim() || null;
		const totalPoints = parseInt(formData.get('totalPoints')) || 0;
		const matchesPlayed = parseInt(formData.get('matchesPlayed')) || 0;
		const matchesWon = parseInt(formData.get('matchesWon')) || 0;

		if (!season || !circuit || !playerName) {
			return fail(400, { error: 'Season, circuit, and player name are required' });
		}

		// Calculate win percentage
		const winPercentage =
			matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100 * 100) / 100 : null;

		try {
			await db.insert(standing).values({
				season,
				circuit,
				playerName,
				gemId,
				totalPoints,
				matchesPlayed,
				matchesWon,
				winPercentage,
				qualifiedForChampionship: false
			});

			return { success: true, message: 'Standing created successfully' };
		} catch (err) {
			console.error('Error creating standing:', err);
			// Check for unique constraint violation
			if (err.code === '23505') {
				return fail(400, {
					error: 'A standing for this player in this season/circuit already exists'
				});
			}
			return fail(500, { error: 'Failed to create standing' });
		}
	},

	// Delete a standing
	deleteStanding: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const standingId = formData.get('standingId');

		if (!standingId) {
			return fail(400, { error: 'Standing ID is required' });
		}

		try {
			await db.delete(standing).where(eq(standing.id, standingId));

			return { success: true, message: 'Standing deleted successfully' };
		} catch (err) {
			console.error('Error deleting standing:', err);
			return fail(500, { error: 'Failed to delete standing' });
		}
	},

	// Update a single standing field
	updateStanding: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const standingId = formData.get('standingId');
		const field = formData.get('field');
		const value = formData.get('value');

		if (!standingId || !field) {
			return fail(400, { error: 'Standing ID and field are required' });
		}

		// Allowed fields that can be updated
		const allowedFields = [
			'playerName',
			'gemId',
			'totalPoints',
			'winPercentage',
			'qualifiedForChampionship',
			'matchesPlayed',
			'matchesWon',
			// Monthly points columns
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
			'decemberPoints',
			// Monthly matches won columns
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
			'decemberMatchesWon',
			// Monthly events columns
			'januaryEvents',
			'februaryEvents',
			'marchEvents',
			'aprilEvents',
			'mayEvents',
			'juneEvents',
			'julyEvents',
			'augustEvents',
			'septemberEvents',
			'octoberEvents',
			'novemberEvents',
			'decemberEvents'
		];

		if (!allowedFields.includes(field)) {
			return fail(400, { error: `Field "${field}" is not allowed to be updated` });
		}

		try {
			// Parse value based on field type
			let parsedValue = value;

			// Integer fields (including all monthly columns)
			const integerFields = [
				'totalPoints',
				'matchesPlayed',
				'matchesWon',
				// Monthly points
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
				'decemberPoints',
				// Monthly matches won
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
				'decemberMatchesWon',
				// Monthly events
				'januaryEvents',
				'februaryEvents',
				'marchEvents',
				'aprilEvents',
				'mayEvents',
				'juneEvents',
				'julyEvents',
				'augustEvents',
				'septemberEvents',
				'octoberEvents',
				'novemberEvents',
				'decemberEvents'
			];

			if (integerFields.includes(field)) {
				parsedValue = value ? parseInt(value) : null;
			} else if (field === 'winPercentage') {
				parsedValue = value ? parseFloat(value) : null;
			} else if (field === 'qualifiedForChampionship') {
				parsedValue = value === 'true';
			} else if (value === '') {
				parsedValue = null;
			}

			// Special handling for gemId - update ALL standings for this player
			if (field === 'gemId') {
				const [currentStanding] = await db
					.select({ oldGemId: standing.gemId })
					.from(standing)
					.where(eq(standing.id, standingId))
					.limit(1);

				const oldGemId = currentStanding?.oldGemId;
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

			// Standard field update
			await db
				.update(standing)
				.set({ [field]: parsedValue, updatedAt: new Date() })
				.where(eq(standing.id, standingId));

			return { success: true, message: `${field} updated successfully` };
		} catch (err) {
			return fail(500, { error: 'Failed to update standing' });
		}
	},

	// Update standing player info (name and GEM ID) in one request
	// Note: playerName only updates this standing, gemId updates all standings for this player
	updateStandingPlayerInfo: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const standingId = formData.get('standingId');
		const playerName = formData.get('playerName');
		const gemId = formData.get('gemId') || null;

		if (!standingId || !playerName) {
			return fail(400, { error: 'Standing ID and player name are required' });
		}

		try {
			// Get current standing data
			const [currentStanding] = await db
				.select({ oldGemId: standing.gemId })
				.from(standing)
				.where(eq(standing.id, standingId))
				.limit(1);

			const oldGemId = currentStanding?.oldGemId;

			// Update this standing's playerName
			await db
				.update(standing)
				.set({
					playerName,
					updatedAt: new Date()
				})
				.where(eq(standing.id, standingId));

			// If gemId changed, update ALL standings with the old gemId
			if (gemId !== oldGemId) {
				if (oldGemId) {
					// Update all standings that share the old GEM ID to the new GEM ID
					await db
						.update(standing)
						.set({ gemId, updatedAt: new Date() })
						.where(eq(standing.gemId, oldGemId));
				} else {
					// No old gemId, just update this standing's gemId
					await db
						.update(standing)
						.set({ gemId, updatedAt: new Date() })
						.where(eq(standing.id, standingId));
				}
			}

			return { success: true, message: 'Player info updated successfully' };
		} catch (err) {
			return fail(500, { error: 'Failed to update player info' });
		}
	},

	// Recalculate monthly standings from match data
	recalculateStandings: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const season = formData.get('season')?.trim();
		const circuit = formData.get('circuit')?.trim();

		if (!season || !circuit) {
			return fail(400, { error: 'Season and circuit are required' });
		}

		try {
			// AGE points table based on placement
			const pointsTable = {
				1: 30,
				2: 25,
				3: 20,
				4: 20,
				5: 15,
				6: 15,
				7: 15,
				8: 15,
				9: 12,
				10: 12,
				11: 12,
				12: 12,
				13: 8,
				14: 8,
				15: 8,
				16: 8
			};

			const monthNames = [
				'January',
				'February',
				'March',
				'April',
				'May',
				'June',
				'July',
				'August',
				'September',
				'October',
				'November',
				'December'
			];
			const monthKeys = [
				'january',
				'february',
				'march',
				'april',
				'may',
				'june',
				'july',
				'august',
				'september',
				'october',
				'november',
				'december'
			];

			// Get all matches for this season/circuit
			const allMatches = await db
				.select()
				.from(match)
				.where(and(eq(match.year, season), eq(match.circuit, circuit)));

			if (allMatches.length === 0) {
				return fail(400, { error: `No matches found for ${circuit} ${season}` });
			}

			// Group matches by month
			const matchesByMonth = new Map();
			for (const m of allMatches) {
				const monthName = m.month;
				if (!matchesByMonth.has(monthName)) {
					matchesByMonth.set(monthName, []);
				}
				matchesByMonth.get(monthName).push(m);
			}

			// For each month, calculate player stats
			const playerMonthlyStats = new Map(); // key: gemId or playerName, value: { monthStats }

			for (const [monthName, matches] of matchesByMonth) {
				const monthKey = monthName.toLowerCase();
				const monthIndex = monthKeys.indexOf(monthKey);
				if (monthIndex === -1) continue;

				// Calculate stats for each player in this month
				const monthPlayerStats = new Map();

				for (const m of matches) {
					// Player 1
					const p1Key = m.player1GemId || m.player1Name;
					if (!monthPlayerStats.has(p1Key)) {
						monthPlayerStats.set(p1Key, {
							gemId: m.player1GemId,
							name: m.player1Name,
							wins: 0,
							matches: 0
						});
					}
					const p1 = monthPlayerStats.get(p1Key);
					p1.matches++;
					if (m.winner === 'player1') p1.wins++;

					// Player 2
					const p2Key = m.player2GemId || m.player2Name;
					if (!monthPlayerStats.has(p2Key)) {
						monthPlayerStats.set(p2Key, {
							gemId: m.player2GemId,
							name: m.player2Name,
							wins: 0,
							matches: 0
						});
					}
					const p2 = monthPlayerStats.get(p2Key);
					p2.matches++;
					if (m.winner === 'player2') p2.wins++;
				}

				// Sort players by wins to determine placement and points
				const sortedPlayers = Array.from(monthPlayerStats.values()).sort((a, b) => b.wins - a.wins);

				sortedPlayers.forEach((player, idx) => {
					const placement = idx + 1;
					const points = pointsTable[placement] || 1;

					const playerKey = player.gemId || player.name;
					if (!playerMonthlyStats.has(playerKey)) {
						playerMonthlyStats.set(playerKey, {
							gemId: player.gemId,
							name: player.name,
							months: {}
						});
					}

					const playerData = playerMonthlyStats.get(playerKey);
					playerData.months[monthKey] = {
						points,
						wins: player.wins,
						matches: player.matches
					};
				});
			}

			// Get existing standings for this season/circuit
			const existingStandings = await db
				.select()
				.from(standing)
				.where(and(eq(standing.season, season), eq(standing.circuit, circuit)));

			// Build lookup maps
			const standingByGemId = new Map(
				existingStandings.filter((s) => s.gemId).map((s) => [s.gemId, s])
			);
			const standingByName = new Map(existingStandings.map((s) => [s.playerName, s]));

			let updated = 0;
			let created = 0;

			// Update each player's standing with calculated monthly stats
			for (const [playerKey, playerData] of playerMonthlyStats) {
				// Find existing standing
				let existingStanding = playerData.gemId ? standingByGemId.get(playerData.gemId) : null;
				if (!existingStanding) {
					existingStanding = standingByName.get(playerData.name);
				}

				// Calculate totals from monthly data
				let totalPoints = 0;
				let totalWins = 0;
				let totalMatches = 0;

				const monthlyUpdate = {};
				for (const monthKey of monthKeys) {
					const monthStats = playerData.months[monthKey];
					if (monthStats) {
						monthlyUpdate[`${monthKey}Points`] = monthStats.points;
						monthlyUpdate[`${monthKey}MatchesWon`] = monthStats.wins;
						monthlyUpdate[`${monthKey}Matches`] = monthStats.matches;
						totalPoints += monthStats.points;
						totalWins += monthStats.wins;
						totalMatches += monthStats.matches;
					} else {
						monthlyUpdate[`${monthKey}Points`] = 0;
						monthlyUpdate[`${monthKey}MatchesWon`] = 0;
						monthlyUpdate[`${monthKey}Matches`] = 0;
					}
				}

				const winPercentage =
					totalMatches > 0 ? Math.round((totalWins / totalMatches) * 10000) / 100 : null;

				if (existingStanding) {
					// Update existing standing
					await db
						.update(standing)
						.set({
							totalPoints,
							matchesWon: totalWins,
							matchesPlayed: totalMatches,
							winPercentage,
							gemId: playerData.gemId || existingStanding.gemId,
							...monthlyUpdate,
							updatedAt: new Date()
						})
						.where(eq(standing.id, existingStanding.id));
					updated++;
				} else {
					// Create new standing
					await db.insert(standing).values({
						season,
						circuit,
						playerName: playerData.name,
						gemId: playerData.gemId || null,
						totalPoints,
						matchesWon: totalWins,
						matchesPlayed: totalMatches,
						winPercentage,
						...monthlyUpdate
					});
					created++;
				}
			}

			return {
				success: true,
				message: `Recalculated standings for ${circuit} ${season}: ${updated} updated, ${created} created from ${allMatches.length} matches`
			};
		} catch (err) {
			console.error('Error recalculating standings:', err);
			return fail(500, { error: err.message || 'Failed to recalculate standings' });
		}
	},

	// Backfill GEM IDs to match records based on standings data
	backfillMatchGemIds: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}

		try {
			// Get all standings with GEM IDs
			const allStandings = await db
				.select()
				.from(standing)
				.where(sql`${standing.gemId} IS NOT NULL AND ${standing.gemId} != ''`);

			// Build a map of player name -> GEM ID
			// Use all names the player has used across all their standings
			const nameToGemId = new Map();
			for (const s of allStandings) {
				if (s.gemId && s.playerName) {
					// Only set if not already set (prefer existing mapping)
					if (!nameToGemId.has(s.playerName)) {
						nameToGemId.set(s.playerName, s.gemId);
					}
				}
			}

			console.log(`Found ${nameToGemId.size} unique player name -> GEM ID mappings`);

			// Get all matches that are missing GEM IDs
			const matchesNeedingUpdate = await db
				.select()
				.from(match)
				.where(
					sql`(${match.player1GemId} IS NULL OR ${match.player1GemId} = '')
				    OR (${match.player2GemId} IS NULL OR ${match.player2GemId} = '')`
				);

			console.log(`Found ${matchesNeedingUpdate.length} matches needing GEM ID updates`);

			let updated = 0;
			for (const m of matchesNeedingUpdate) {
				const p1GemId = m.player1GemId || nameToGemId.get(m.player1Name) || null;
				const p2GemId = m.player2GemId || nameToGemId.get(m.player2Name) || null;

				// Only update if we found at least one new GEM ID
				if ((p1GemId && p1GemId !== m.player1GemId) || (p2GemId && p2GemId !== m.player2GemId)) {
					await db
						.update(match)
						.set({
							player1GemId: p1GemId,
							player2GemId: p2GemId
						})
						.where(eq(match.id, m.id));
					updated++;
				}
			}

			return {
				success: true,
				message: `Backfilled GEM IDs: ${updated} matches updated out of ${matchesNeedingUpdate.length} checked. ${nameToGemId.size} player name mappings used.`
			};
		} catch (err) {
			console.error('Error backfilling GEM IDs:', err);
			return fail(500, { error: err.message || 'Failed to backfill GEM IDs' });
		}
	}
};
