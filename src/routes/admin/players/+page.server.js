import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { standing, match } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { rebuildStandings } from '$lib/server/standings/rebuild.js';
import { bump } from '$lib/server/cache/index.js';
import { listStandings } from '$lib/server/admin/dashboard.js';
import { MONTH_NAMES } from '$lib/data/months.js';

const MONTHS = MONTH_NAMES.map((m) => m.toLowerCase());

export async function load({ locals }) {
	try {
		const rows = await listStandings();

		// Add the monthly breakdown the table expands into.
		const standings = rows.map((row) => {
			const matchesPlayed = row.matchesPlayed || 0;
			const matchesWon = row.matchesWon || 0;
			let winPercentage = row.winPercentage;
			if (winPercentage === null && matchesPlayed > 0) {
				winPercentage = parseFloat(((matchesWon / matchesPlayed) * 100).toFixed(2));
			}

			const monthlyBreakdown = {};
			for (const m of MONTHS) {
				monthlyBreakdown[m] = {
					points: row[`${m}Points`] || 0,
					matchesWon: row[`${m}MatchesWon`] || 0,
					events: row[`${m}Events`] || 0
				};
			}

			return {
				...row,
				totalPoints: row.totalPoints || 0,
				matchesWon,
				matchesPlayed,
				winPercentage,
				monthlyBreakdown
			};
		});

		return { user: locals.user, standings };
	} catch (error) {
		console.error('Admin players page load error:', error);
		return { user: locals.user, standings: [] };
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
			const summary = await db.transaction((tx) => rebuildStandings({ season, circuit }, tx));
			await bump('standings');
			if (summary.events === 0) {
				return fail(400, { error: `No results or matches found for ${circuit} ${season}` });
			}
			const cap = (k) => k[0].toUpperCase() + k.slice(1);
			const skipped = summary.skipped.length
				? ` Left alone: ${summary.skipped.map(cap).join(', ')} — those months only have imported matches without Swiss ranks, so rebuilding them would replace the stored figures with an estimate.`
				: '';
			if (summary.months.length === 0) {
				return { success: true, message: `Nothing rebuilt for ${circuit} ${season}.${skipped}` };
			}
			return {
				success: true,
				message: `Rebuilt ${summary.months.map(cap).join(', ')} ${season} for ${circuit}: ${summary.updated} updated, ${summary.created} created.${skipped}`
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

			// Build a map of player name -> GEM ID. If the same name maps to MORE
			// than one GEM ID (two different players share the name) we drop that
			// name from the map — better to leave the match un-backfilled than to
			// attribute it to the wrong player.
			const nameGemIds = new Map(); // name -> Set<gemId>
			for (const s of allStandings) {
				if (s.gemId && s.playerName) {
					if (!nameGemIds.has(s.playerName)) {
						nameGemIds.set(s.playerName, new Set());
					}
					nameGemIds.get(s.playerName).add(s.gemId);
				}
			}
			const nameToGemId = new Map();
			let ambiguousNames = 0;
			for (const [name, gemIds] of nameGemIds) {
				if (gemIds.size === 1) {
					nameToGemId.set(name, gemIds.values().next().value);
				} else {
					ambiguousNames++;
				}
			}

			console.log(
				`Found ${nameToGemId.size} unique player name -> GEM ID mappings (${ambiguousNames} ambiguous names skipped)`
			);

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
