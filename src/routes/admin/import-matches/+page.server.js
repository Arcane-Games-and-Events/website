import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { eventMatch, seasonStanding } from '$lib/server/db/schema.js';
import { eq, and, count } from 'drizzle-orm';
import { parsePairings } from '$lib/server/tournament-processor.js';

const MONTHS = [
	'january', 'february', 'march', 'april', 'may', 'june',
	'july', 'august', 'september', 'october', 'november', 'december'
];

const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

export async function load({ locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	// Get all standings to derive events from monthly points
	const allStandings = await db.select().from(seasonStanding);

	// Derive events from standings by checking which months have points
	// Group standings by season + circuit, tracking player counts per month
	const circuitSeasonData = new Map();
	for (const standing of allStandings) {
		const key = `${standing.season}|${standing.circuit}`;
		if (!circuitSeasonData.has(key)) {
			circuitSeasonData.set(key, {
				season: standing.season,
				circuit: standing.circuit,
				monthPlayerCounts: new Map(), // Track player count per month
				totalPlayers: 0
			});
		}
		const data = circuitSeasonData.get(key);
		data.totalPlayers++;

		// Check each month for points and count players per month
		for (let i = 0; i < MONTHS.length; i++) {
			const monthKey = `${MONTHS[i]}Points`;
			if (standing[monthKey] && standing[monthKey] > 0) {
				const monthName = MONTH_NAMES[i];
				data.monthPlayerCounts.set(monthName, (data.monthPlayerCounts.get(monthName) || 0) + 1);
			}
		}
	}

	// Get match counts grouped by year, circuit, month
	const matchCounts = await db
		.select({
			year: eventMatch.year,
			circuit: eventMatch.circuit,
			month: eventMatch.month,
			count: count()
		})
		.from(eventMatch)
		.groupBy(eventMatch.year, eventMatch.circuit, eventMatch.month);

	// Create a map for quick lookup: "year|circuit|month" -> count
	const matchCountMap = new Map(
		matchCounts.map(m => [`${m.year}|${m.circuit}|${m.month}`, m.count])
	);

	// Build a list of derived events from standings
	const derivedEvents = [];
	for (const [key, data] of circuitSeasonData) {
		for (const [month, playerCount] of data.monthPlayerCounts) {
			const matchKey = `${data.season}|${data.circuit}|${month}`;

			derivedEvents.push({
				title: `${data.circuit} ${month} Open`,
				matchCount: matchCountMap.get(matchKey) || 0,
				playerCount: playerCount, // Players who played in this specific month
				month: month,
				season: data.season,
				circuit: data.circuit
			});
		}
	}

	// Group events by circuit (show all events, no filtering)
	const circuitGroups = {};
	for (const e of derivedEvents) {
		const circuit = e.circuit;
		if (!circuitGroups[circuit]) {
			// Get total players for this circuit/season from the circuitSeasonData
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

	// Sort events within each circuit by season (desc) then month order
	for (const circuit of Object.values(circuitGroups)) {
		circuit.events.sort((a, b) => {
			// Sort by season descending first
			if (a.season !== b.season) {
				return b.season.localeCompare(a.season);
			}
			// Then by month order
			const monthOrderA = MONTH_NAMES.indexOf(a.month);
			const monthOrderB = MONTH_NAMES.indexOf(b.month);
			return monthOrderA - monthOrderB;
		});
	}

	// Calculate overall stats
	const eventsWithMatches = derivedEvents.filter(e => e.matchCount > 0).length;
	const eventsMissingMatches = derivedEvents.filter(e => e.matchCount === 0).length;

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

			// Clear existing matches for this event (by year, circuit, month)
			await db.delete(eventMatch).where(
				and(
					eq(eventMatch.year, eventYear),
					eq(eventMatch.circuit, eventCircuit),
					eq(eventMatch.month, eventMonth)
				)
			);

			// Format and insert new matches
			const matches = pairings.map(p => ({
				month: eventMonth,
				year: eventYear,
				circuit: eventCircuit,
				round: p.round,
				table: p.table || null,
				player1GemId: p.player1Id || null,
				player1Name: p.player1Name,
				player2GemId: p.player2Id || null,
				player2Name: p.player2Name,
				winner: p.result === '1WIN' || p.result.includes('Player 1') ? 'player1'
					: p.result === '2WIN' || p.result.includes('Player 2') ? 'player2'
					: null
			}));

			await db.insert(eventMatch).values(matches);

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
