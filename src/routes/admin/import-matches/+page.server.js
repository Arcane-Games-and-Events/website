import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { match, standing, event, eventPlayerHero } from '$lib/server/db/schema.js';
import { eq, and, count, sql } from 'drizzle-orm';
import { parsePairings } from '$lib/server/tournament-processor.js';
import { invalidateCache, CACHE_KEYS } from '$lib/server/redis/index.js';

const MONTHS = [
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

const MONTH_NAMES = [
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

/**
 * Import matches page - uses RPC for load, standard queries for action
 *
 * The load function uses get_import_matches_data() RPC if available,
 * falls back to direct queries otherwise.
 */
export async function load({ locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	// Get hero counts first (no RPC needed, simple query)
	const heroCounts = await db
		.select({
			season: eventPlayerHero.season,
			circuit: eventPlayerHero.circuit,
			month: eventPlayerHero.month,
			count: count()
		})
		.from(eventPlayerHero)
		.groupBy(eventPlayerHero.season, eventPlayerHero.circuit, eventPlayerHero.month);

	const heroCountMap = new Map(
		heroCounts.map((h) => [`${h.season}|${h.circuit}|${h.month}`, h.count])
	);

	try {
		// Try RPC first
		const result = await db.execute(sql`SELECT get_import_matches_data() as data`);
		const data = result.rows?.[0]?.data || result[0]?.data;

		if (data) {
			// Parse RPC result
			const allStandings = data.standings || [];
			const matchCounts = data.matchCounts || [];

			// Create a map for quick lookup: "year|circuit|month" -> count
			const matchCountMap = new Map(
				matchCounts.map((m) => [`${m.year}|${m.circuit}|${m.month}`, parseInt(m.count)])
			);

			// Derive events from standings by checking which months have points
			const circuitSeasonData = new Map();
			for (const standing of allStandings) {
				const key = `${standing.season}|${standing.circuit}`;
				if (!circuitSeasonData.has(key)) {
					circuitSeasonData.set(key, {
						season: standing.season,
						circuit: standing.circuit,
						monthPlayerCounts: new Map(),
						totalPlayers: 0
					});
				}
				const dataEntry = circuitSeasonData.get(key);
				dataEntry.totalPlayers++;

				// Check each month for points
				for (let i = 0; i < MONTHS.length; i++) {
					const monthKey = `${MONTHS[i]}_points`;
					const camelKey = `${MONTHS[i]}Points`;
					const points = standing[monthKey] || standing[camelKey];
					if (points && points > 0) {
						const monthName = MONTH_NAMES[i];
						dataEntry.monthPlayerCounts.set(
							monthName,
							(dataEntry.monthPlayerCounts.get(monthName) || 0) + 1
						);
					}
				}
			}

			// Build derived events
			const derivedEvents = [];
			for (const [key, dataEntry] of circuitSeasonData) {
				for (const [month, playerCount] of dataEntry.monthPlayerCounts) {
					const matchKey = `${dataEntry.season}|${dataEntry.circuit}|${month}`;
					derivedEvents.push({
						title: `${dataEntry.circuit} ${month} Open`,
						matchCount: matchCountMap.get(matchKey) || 0,
						heroCount: heroCountMap.get(matchKey) || 0,
						playerCount,
						month,
						season: dataEntry.season,
						circuit: dataEntry.circuit
					});
				}
			}

			// Group by circuit
			const circuitGroups = {};
			for (const e of derivedEvents) {
				const circuit = e.circuit;
				if (!circuitGroups[circuit]) {
					const circuitKey = `${e.season}|${e.circuit}`;
					const circuitData = circuitSeasonData.get(circuitKey);
					circuitGroups[circuit] = {
						name: circuit,
						events: [],
						totalMatches: 0,
						eventsWithMatches: 0,
						eventsMissing: 0,
						eventsWithHeroes: 0,
						eventsMissingHeroes: 0,
						totalPlayers: circuitData?.totalPlayers || 0
					};
				}
				circuitGroups[circuit].events.push(e);
				circuitGroups[circuit].totalMatches += e.matchCount;
				if (e.matchCount > 0) {
					circuitGroups[circuit].eventsWithMatches++;
				} else {
					circuitGroups[circuit].eventsMissing++;
				}
				if (e.heroCount > 0) {
					circuitGroups[circuit].eventsWithHeroes++;
				} else {
					circuitGroups[circuit].eventsMissingHeroes++;
				}
			}

			// Sort events within each circuit
			for (const circuit of Object.values(circuitGroups)) {
				circuit.events.sort((a, b) => {
					if (a.season !== b.season) return b.season.localeCompare(a.season);
					return MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month);
				});
			}

			const eventsWithMatches = derivedEvents.filter((e) => e.matchCount > 0).length;
			const eventsMissingMatches = derivedEvents.filter((e) => e.matchCount === 0).length;
			const eventsWithHeroes = derivedEvents.filter((e) => e.heroCount > 0).length;
			const eventsMissingHeroes = derivedEvents.filter((e) => e.heroCount === 0).length;

			return {
				circuitGroups: Object.values(circuitGroups).sort((a, b) => a.name.localeCompare(b.name)),
				eventsWithMatches,
				eventsMissingMatches,
				eventsWithHeroes,
				eventsMissingHeroes,
				totalEvents: derivedEvents.length
			};
		}
	} catch (rpcError) {
		// RPC not available, fall back to direct queries
		console.log('RPC not available, using direct queries:', rpcError.message);
	}

	// Fallback: Direct queries
	const allStandings = await db.select().from(standing);

	const circuitSeasonData = new Map();
	for (const standing of allStandings) {
		const key = `${standing.season}|${standing.circuit}`;
		if (!circuitSeasonData.has(key)) {
			circuitSeasonData.set(key, {
				season: standing.season,
				circuit: standing.circuit,
				monthPlayerCounts: new Map(),
				totalPlayers: 0
			});
		}
		const data = circuitSeasonData.get(key);
		data.totalPlayers++;

		for (let i = 0; i < MONTHS.length; i++) {
			const monthKey = `${MONTHS[i]}Points`;
			if (standing[monthKey] && standing[monthKey] > 0) {
				const monthName = MONTH_NAMES[i];
				data.monthPlayerCounts.set(monthName, (data.monthPlayerCounts.get(monthName) || 0) + 1);
			}
		}
	}

	const matchCounts = await db
		.select({
			year: match.year,
			circuit: match.circuit,
			month: match.month,
			count: count()
		})
		.from(match)
		.groupBy(match.year, match.circuit, match.month);

	const matchCountMap = new Map(
		matchCounts.map((m) => [`${m.year}|${m.circuit}|${m.month}`, m.count])
	);

	const derivedEvents = [];
	for (const [key, data] of circuitSeasonData) {
		for (const [month, playerCount] of data.monthPlayerCounts) {
			const matchKey = `${data.season}|${data.circuit}|${month}`;
			derivedEvents.push({
				title: `${data.circuit} ${month} Open`,
				matchCount: matchCountMap.get(matchKey) || 0,
				heroCount: heroCountMap.get(matchKey) || 0,
				playerCount,
				month,
				season: data.season,
				circuit: data.circuit
			});
		}
	}

	const circuitGroups = {};
	for (const e of derivedEvents) {
		const circuit = e.circuit;
		if (!circuitGroups[circuit]) {
			const circuitKey = `${e.season}|${e.circuit}`;
			const circuitData = circuitSeasonData.get(circuitKey);
			circuitGroups[circuit] = {
				name: circuit,
				events: [],
				totalMatches: 0,
				eventsWithMatches: 0,
				eventsMissing: 0,
				eventsWithHeroes: 0,
				eventsMissingHeroes: 0,
				totalPlayers: circuitData?.totalPlayers || 0
			};
		}
		circuitGroups[circuit].events.push(e);
		circuitGroups[circuit].totalMatches += e.matchCount;
		if (e.matchCount > 0) {
			circuitGroups[circuit].eventsWithMatches++;
		} else {
			circuitGroups[circuit].eventsMissing++;
		}
		if (e.heroCount > 0) {
			circuitGroups[circuit].eventsWithHeroes++;
		} else {
			circuitGroups[circuit].eventsMissingHeroes++;
		}
	}

	for (const circuit of Object.values(circuitGroups)) {
		circuit.events.sort((a, b) => {
			if (a.season !== b.season) return b.season.localeCompare(a.season);
			return MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month);
		});
	}

	const eventsWithMatches = derivedEvents.filter((e) => e.matchCount > 0).length;
	const eventsMissingMatches = derivedEvents.filter((e) => e.matchCount === 0).length;
	const eventsWithHeroes = derivedEvents.filter((e) => e.heroCount > 0).length;
	const eventsMissingHeroes = derivedEvents.filter((e) => e.heroCount === 0).length;

	return {
		circuitGroups: Object.values(circuitGroups).sort((a, b) => a.name.localeCompare(b.name)),
		eventsWithMatches,
		eventsMissingMatches,
		eventsWithHeroes,
		eventsMissingHeroes,
		totalEvents: derivedEvents.length
	};
}

export const actions = {
	importMatches: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const pairingsFile = formData.get('pairings');
		const eventCircuit = formData.get('eventCircuit');
		const eventMonth = formData.get('eventMonth');
		const eventYear = formData.get('eventSeason');

		if (!pairingsFile || !eventCircuit || !eventMonth || !eventYear) {
			return fail(400, { error: 'Pairings file and event details are required' });
		}

		try {
			const csvContent = await pairingsFile.text();
			const pairings = parsePairings(csvContent);

			if (pairings.length === 0) {
				return fail(400, { error: 'No valid pairings found in CSV' });
			}

			// Format matches for RPC or direct insert
			const matches = pairings.map((p) => ({
				round: p.round,
				table: p.table || null,
				player1GemId: p.player1Id || null,
				player1Name: p.player1Name,
				player2GemId: p.player2Id || null,
				player2Name: p.player2Name,
				winner:
					p.result === '1WIN' || p.result.includes('Player 1')
						? 'player1'
						: p.result === '2WIN' || p.result.includes('Player 2')
							? 'player2'
							: null
			}));

			// Try RPC first for atomic operation
			try {
				const matchesJson = JSON.stringify(matches);
				const result = await db.execute(
					sql`SELECT import_event_matches(${eventYear}, ${eventCircuit}, ${eventMonth}, ${matchesJson}::jsonb) as result`
				);
				const rpcResult = result.rows?.[0]?.result || result[0]?.result;

				if (rpcResult?.success) {
					await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);
					await invalidateCache(`${CACHE_KEYS.EVENTS}:matches:all`);
					await invalidateCache(`${CACHE_KEYS.STANDINGS}:all`);

					return {
						success: true,
						message: `Imported ${rpcResult.imported} matches for ${eventCircuit} ${eventMonth} ${eventYear}`
					};
				}
			} catch (rpcError) {
				console.log('RPC import failed, using direct queries:', rpcError.message);
			}

			// Fallback: Direct queries with transaction
			await db.transaction(async (tx) => {
				// Generate a deterministic placeholder event ID for historical imports
				const placeholderEventId = `historical-${eventYear}-${eventCircuit.toLowerCase().replace(/\s+/g, '-')}-${eventMonth.toLowerCase()}`;

				// Check if placeholder event exists, create if not
				const [existingEvent] = await tx
					.select({ id: event.id })
					.from(event)
					.where(eq(event.id, placeholderEventId))
					.limit(1);

				if (!existingEvent) {
					await tx.insert(event).values({
						id: placeholderEventId,
						title: `Historical - ${eventCircuit} ${eventMonth} ${eventYear}`,
						price: '0',
						circuit: eventCircuit,
						month: eventMonth,
						status: 'completed',
						description: 'Placeholder event for historical match data import'
					});
				}

				// Clear existing matches for this event context
				await tx
					.delete(match)
					.where(
						and(
							eq(match.year, eventYear),
							eq(match.circuit, eventCircuit),
							eq(match.month, eventMonth)
						)
					);

				// Insert new matches with the eventId
				const formattedMatches = matches.map((m) => ({
					eventId: placeholderEventId,
					month: eventMonth,
					year: eventYear,
					circuit: eventCircuit,
					round: m.round,
					table: m.table,
					player1GemId: m.player1GemId,
					player1Name: m.player1Name,
					player2GemId: m.player2GemId,
					player2Name: m.player2Name,
					winner: m.winner
				}));

				if (formattedMatches.length > 0) {
					await tx.insert(match).values(formattedMatches);
				}
			});

			await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);
			await invalidateCache(`${CACHE_KEYS.EVENTS}:matches:all`);
			await invalidateCache(`${CACHE_KEYS.STANDINGS}:all`);

			return {
				success: true,
				message: `Imported ${matches.length} matches for ${eventCircuit} ${eventMonth} ${eventYear}`
			};
		} catch (err) {
			console.error('Error importing matches:', err);
			return fail(500, { error: `Failed to import: ${err.message}` });
		}
	},

	importHeroes: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const heroesFile = formData.get('heroes');
		const eventCircuit = formData.get('eventCircuit');
		const eventMonth = formData.get('eventMonth');
		const eventSeason = formData.get('eventSeason');

		if (!heroesFile || !eventCircuit || !eventMonth || !eventSeason) {
			return fail(400, { error: 'Heroes file and event details are required' });
		}

		try {
			const csvContent = await heroesFile.text();
			const lines = csvContent.split('\n').filter((line) => line.trim());

			if (lines.length < 2) {
				return fail(400, { error: 'CSV must have a header row and at least one data row' });
			}

			// Parse header to find column indices
			const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
			const nameIdx = header.findIndex(
				(h) => h === 'name' || h === 'player name' || h === 'player'
			);
			const heroIdx = header.findIndex((h) => h === 'hero' || h === 'hero name');
			const gemIdIdx = header.findIndex(
				(h) =>
					h === 'gem id' ||
					h === 'gemid' ||
					h === 'gem_id' ||
					h === 'player id' ||
					h === 'playerid' ||
					h === 'player_id'
			);
			const countryIdx = header.findIndex(
				(h) => h === 'country/region' || h === 'country' || h === 'region'
			);

			if (nameIdx === -1 || heroIdx === -1) {
				return fail(400, { error: 'CSV must have "Name" and "Hero" columns' });
			}

			// Parse hero entries
			const heroEntries = [];
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i].trim();
				if (!line) continue;

				// Handle CSV with potential quoted fields
				const parts = [];
				let current = '';
				let inQuotes = false;
				for (const char of line) {
					if (char === '"') {
						inQuotes = !inQuotes;
					} else if (char === ',' && !inQuotes) {
						parts.push(current.trim());
						current = '';
					} else {
						current += char;
					}
				}
				parts.push(current.trim());

				const playerName = parts[nameIdx]?.replace(/^"|"$/g, '').trim();
				// Sanitize hero name: remove "(LL)" suffix and trim
				const rawHero = parts[heroIdx]?.replace(/^"|"$/g, '').trim();
				const hero = rawHero?.replace(/\s*\(LL\)\s*$/i, '').trim();
				const gemId =
					gemIdIdx !== -1 ? parts[gemIdIdx]?.replace(/^"|"$/g, '').trim() || null : null;
				const countryRegion =
					countryIdx !== -1 ? parts[countryIdx]?.replace(/^"|"$/g, '').trim() || null : null;

				if (playerName && hero) {
					heroEntries.push({
						season: eventSeason,
						circuit: eventCircuit,
						month: eventMonth,
						playerName,
						hero,
						gemId,
						countryRegion
					});
				}
			}

			if (heroEntries.length === 0) {
				return fail(400, { error: 'No valid hero entries found in CSV' });
			}

			// Import with transaction
			await db.transaction(async (tx) => {
				// Clear existing heroes for this event context
				await tx
					.delete(eventPlayerHero)
					.where(
						and(
							eq(eventPlayerHero.season, eventSeason),
							eq(eventPlayerHero.circuit, eventCircuit),
							eq(eventPlayerHero.month, eventMonth)
						)
					);

				// Insert new hero entries
				await tx.insert(eventPlayerHero).values(heroEntries);
			});

			// Invalidate relevant caches. Hero data is filtered by
			// season/circuit/month so we don't have a bulk key to bust —
			// the per-filter keys expire naturally after 5 min.
			await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);

			return {
				success: true,
				message: `Imported ${heroEntries.length} hero entries for ${eventCircuit} ${eventMonth} ${eventSeason}`
			};
		} catch (err) {
			console.error('Error importing heroes:', err);
			return fail(500, { error: `Failed to import heroes: ${err.message}` });
		}
	}
};
