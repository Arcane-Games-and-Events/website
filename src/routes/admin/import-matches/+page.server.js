import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { match, standing, event } from '$lib/server/db/schema.js';
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

			return {
				circuitGroups: Object.values(circuitGroups).sort((a, b) => a.name.localeCompare(b.name)),
				eventsWithMatches,
				eventsMissingMatches,
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

	const matchCountMap = new Map(matchCounts.map((m) => [`${m.year}|${m.circuit}|${m.month}`, m.count]));

	const derivedEvents = [];
	for (const [key, data] of circuitSeasonData) {
		for (const [month, playerCount] of data.monthPlayerCounts) {
			const matchKey = `${data.season}|${data.circuit}|${month}`;
			derivedEvents.push({
				title: `${data.circuit} ${month} Open`,
				matchCount: matchCountMap.get(matchKey) || 0,
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
	}

	for (const circuit of Object.values(circuitGroups)) {
		circuit.events.sort((a, b) => {
			if (a.season !== b.season) return b.season.localeCompare(a.season);
			return MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month);
		});
	}

	const eventsWithMatches = derivedEvents.filter((e) => e.matchCount > 0).length;
	const eventsMissingMatches = derivedEvents.filter((e) => e.matchCount === 0).length;

	return {
		circuitGroups: Object.values(circuitGroups).sort((a, b) => a.name.localeCompare(b.name)),
		eventsWithMatches,
		eventsMissingMatches,
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
					await invalidateCache(`${CACHE_KEYS.EVENTS}:results:all`);

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
			await invalidateCache(`${CACHE_KEYS.EVENTS}:results:all`);

			return {
				success: true,
				message: `Imported ${matches.length} matches for ${eventCircuit} ${eventMonth} ${eventYear}`
			};
		} catch (err) {
			console.error('Error importing matches:', err);
			return fail(500, { error: `Failed to import: ${err.message}` });
		}
	}
};
