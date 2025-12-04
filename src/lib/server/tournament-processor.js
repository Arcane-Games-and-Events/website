/**
 * Tournament Processor Module
 *
 * Processes tournament software CSV exports (Swiss Standings + Pairings)
 * to calculate final standings and distribute AGE Points.
 */

// AGE Open Points Structure
export const AGE_POINTS = {
	1: { points: 30, prize: 400 },   // Winner
	2: { points: 25, prize: 200 },   // 2nd Place
	3: { points: 20, prize: 100 },   // 3rd-4th (tied)
	4: { points: 20, prize: 100 },
	5: { points: 15, prize: 50 },    // 5th-8th (tied)
	6: { points: 15, prize: 50 },
	7: { points: 15, prize: 50 },
	8: { points: 15, prize: 50 },
	9: { points: 12, prize: 0 },     // 9th-12th (Top 12)
	10: { points: 12, prize: 0 },
	11: { points: 12, prize: 0 },
	12: { points: 12, prize: 0 },
	13: { points: 8, prize: 0 },     // 13th-16th (Top 16)
	14: { points: 8, prize: 0 },
	15: { points: 8, prize: 0 },
	16: { points: 8, prize: 0 },
};

export const PARTICIPATION_POINTS = 1;

/**
 * Parse CSV string into array of objects
 */
export function parseCSV(csvString) {
	const lines = csvString.trim().split('\n');
	if (lines.length < 2) return [];

	// Parse header row
	const headers = parseCSVLine(lines[0]);

	// Parse data rows
	const data = [];
	for (let i = 1; i < lines.length; i++) {
		const values = parseCSVLine(lines[i]);
		if (values.length === 0) continue;

		const row = {};
		headers.forEach((header, index) => {
			row[header.trim()] = values[index]?.trim() || '';
		});
		data.push(row);
	}

	return data;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line) {
	const result = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			result.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	result.push(current);

	return result;
}

/**
 * Parse Swiss Standings CSV
 * Expected columns: Rank, Name, Player ID, Wins
 */
export function parseSwissStandings(csvString) {
	const data = parseCSV(csvString);

	return data.map(row => ({
		rank: parseInt(row['Rank'] || row['rank'] || '0', 10),
		name: row['Name'] || row['name'] || row['Player Name'] || '',
		playerId: row['Player ID'] || row['player_id'] || row['GEM ID'] || '',
		wins: parseInt(row['Wins'] || row['wins'] || '0', 10),
		dropped: row['Dropped'] === 'true' || row['dropped'] === 'true'
	})).filter(p => p.name && !p.dropped);
}

/**
 * Parse Pairings CSV
 * Expected columns: Round, Table, Player 1 Name, Player 1 ID, Player 2 Name, Player 2 ID, Result
 */
export function parsePairings(csvString) {
	const data = parseCSV(csvString);

	return data.map(row => ({
		round: parseInt(row['Round'] || row['round'] || '0', 10),
		table: parseInt(row['Table'] || row['table'] || '0', 10),
		player1Name: row['Player 1 Name'] || row['player1_name'] || '',
		player1Id: row['Player 1 ID'] || row['player1_id'] || '',
		player2Name: row['Player 2 Name'] || row['player2_name'] || '',
		player2Id: row['Player 2 ID'] || row['player2_id'] || '',
		result: row['Result'] || row['result'] || ''
	})).filter(p => p.round > 0);
}

/**
 * Determine the round structure from pairings data
 */
export function determineRoundStructure(pairings) {
	const roundCounts = {};

	for (const pairing of pairings) {
		roundCounts[pairing.round] = (roundCounts[pairing.round] || 0) + 1;
	}

	const rounds = Object.keys(roundCounts).map(Number).sort((a, b) => a - b);
	const maxRound = Math.max(...rounds);

	// Find where Swiss ends and Top 8 begins
	// Top 8 bracket: QF = 4 matches, SF = 2 matches, Finals = 1 match
	let top8StartRound = null;

	// Look for the transition point where match count drops significantly
	for (let i = rounds.length - 1; i >= 0; i--) {
		const round = rounds[i];
		const count = roundCounts[round];

		// Finals round should have 1 match
		if (count === 1 && i >= 2) {
			const semisRound = rounds[i - 1];
			const quartersRound = rounds[i - 2];

			if (roundCounts[semisRound] === 2 && roundCounts[quartersRound] === 4) {
				top8StartRound = quartersRound;
				break;
			}
		}
	}

	// If we couldn't detect bracket, assume last 3 rounds are Top 8
	if (!top8StartRound && maxRound >= 3) {
		top8StartRound = maxRound - 2;
	}

	return {
		totalRounds: maxRound,
		swissRounds: top8StartRound ? top8StartRound - 1 : maxRound,
		top8StartRound,
		hasTop8: !!top8StartRound,
		roundCounts
	};
}

/**
 * Get winner of a match based on result
 */
function getMatchWinner(match) {
	if (match.result === '1WIN' || match.result.includes('Player 1')) {
		return { name: match.player1Name, id: match.player1Id };
	} else if (match.result === '2WIN' || match.result.includes('Player 2')) {
		return { name: match.player2Name, id: match.player2Id };
	}
	return null; // Draw
}

/**
 * Get loser of a match based on result
 */
function getMatchLoser(match) {
	if (match.result === '1WIN' || match.result.includes('Player 1')) {
		return { name: match.player2Name, id: match.player2Id };
	} else if (match.result === '2WIN' || match.result.includes('Player 2')) {
		return { name: match.player1Name, id: match.player1Id };
	}
	return null; // Draw
}

/**
 * Trace through the Top 8 bracket to determine final placements
 */
export function traceBracket(pairings, top8StartRound) {
	if (!top8StartRound) return null;

	const quarters = pairings.filter(p => p.round === top8StartRound);
	const semis = pairings.filter(p => p.round === top8StartRound + 1);
	const finals = pairings.filter(p => p.round === top8StartRound + 2);

	if (finals.length !== 1) {
		console.warn('Invalid bracket structure: expected 1 finals match');
		return null;
	}

	const finalsMatch = finals[0];
	const winner = getMatchWinner(finalsMatch);
	const second = getMatchLoser(finalsMatch);

	// Semi losers are 3rd-4th
	const thirdFourth = semis.map(match => getMatchLoser(match)).filter(Boolean);

	// Quarter losers are 5th-8th
	const fifthEighth = quarters.map(match => getMatchLoser(match)).filter(Boolean);

	return {
		winner,
		second,
		thirdFourth,
		fifthEighth,
		bracket: {
			quarters,
			semis,
			finals: finalsMatch
		}
	};
}

/**
 * Calculate tiebreakers for Swiss standings
 * Uses FAB-style tiebreakers: Match Win %, Opponent Match Win %
 */
export function calculateTiebreakers(standings, pairings, swissRounds) {
	const playerStats = {};

	// Build player stats from pairings
	for (const player of standings) {
		const matches = pairings.filter(p =>
			p.round <= swissRounds &&
			(p.player1Id === player.playerId || p.player2Id === player.playerId ||
				p.player1Name === player.name || p.player2Name === player.name)
		);

		const wins = matches.filter(m => {
			const winner = getMatchWinner(m);
			return winner && (winner.id === player.playerId || winner.name === player.name);
		}).length;

		const opponents = matches.map(m => {
			if (m.player1Id === player.playerId || m.player1Name === player.name) {
				return { id: m.player2Id, name: m.player2Name };
			}
			return { id: m.player1Id, name: m.player1Name };
		});

		playerStats[player.playerId || player.name] = {
			...player,
			matchesPlayed: matches.length,
			matchesWon: wins,
			matchWinPct: matches.length > 0 ? wins / matches.length : 0,
			opponents
		};
	}

	// Calculate opponent match win %
	for (const [playerId, stats] of Object.entries(playerStats)) {
		const oppWinPcts = stats.opponents.map(opp => {
			const oppStats = playerStats[opp.id] || playerStats[opp.name];
			// Floor at 33% per MTG/FAB rules
			return Math.max(0.33, oppStats?.matchWinPct || 0.33);
		});

		stats.oppMatchWinPct = oppWinPcts.length > 0
			? oppWinPcts.reduce((a, b) => a + b, 0) / oppWinPcts.length
			: 0.33;
	}

	return playerStats;
}

/**
 * Calculate final standings with points distribution
 */
export function calculateFinalStandings(swissStandings, pairings) {
	const roundStructure = determineRoundStructure(pairings);
	const bracketResults = traceBracket(pairings, roundStructure.top8StartRound);
	const tiebreakers = calculateTiebreakers(swissStandings, pairings, roundStructure.swissRounds);

	const results = [];

	// Process Top 8 placements if we have a bracket
	if (bracketResults) {
		// 1st place
		if (bracketResults.winner) {
			results.push({
				placement: 1,
				...findPlayerData(bracketResults.winner, swissStandings, tiebreakers),
				...AGE_POINTS[1]
			});
		}

		// 2nd place
		if (bracketResults.second) {
			results.push({
				placement: 2,
				...findPlayerData(bracketResults.second, swissStandings, tiebreakers),
				...AGE_POINTS[2]
			});
		}

		// 3rd-4th
		bracketResults.thirdFourth.forEach((player, index) => {
			results.push({
				placement: 3 + index,
				...findPlayerData(player, swissStandings, tiebreakers),
				...AGE_POINTS[3]
			});
		});

		// 5th-8th
		bracketResults.fifthEighth.forEach((player, index) => {
			results.push({
				placement: 5 + index,
				...findPlayerData(player, swissStandings, tiebreakers),
				...AGE_POINTS[5]
			});
		});
	}

	// Get players already placed
	const placedNames = new Set(results.map(r => r.name));
	const placedIds = new Set(results.map(r => r.playerId).filter(Boolean));

	// Process remaining players from Swiss standings (9th and below)
	const remainingPlayers = Object.values(tiebreakers)
		.filter(p => !placedNames.has(p.name) && !placedIds.has(p.playerId))
		.sort((a, b) => {
			// Sort by wins descending
			if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
			// Then by match win %
			if (b.matchWinPct !== a.matchWinPct) return b.matchWinPct - a.matchWinPct;
			// Then by opponent match win %
			return b.oppMatchWinPct - a.oppMatchWinPct;
		});

	let placement = results.length + 1;
	for (const player of remainingPlayers) {
		const pointsInfo = AGE_POINTS[placement] || { points: PARTICIPATION_POINTS, prize: 0 };

		results.push({
			placement,
			name: player.name,
			playerId: player.playerId,
			matchesWon: player.matchesWon,
			matchesPlayed: player.matchesPlayed,
			matchWinPct: player.matchWinPct,
			oppMatchWinPct: player.oppMatchWinPct,
			...pointsInfo
		});

		placement++;
	}

	return {
		results,
		roundStructure,
		bracketResults,
		totalPlayers: results.length
	};
}

/**
 * Find player data from various sources
 */
function findPlayerData(player, swissStandings, tiebreakers) {
	const fromTiebreakers = tiebreakers[player.id] || tiebreakers[player.name];
	const fromSwiss = swissStandings.find(s =>
		s.playerId === player.id || s.name === player.name
	);

	return {
		name: player.name,
		playerId: player.id || fromSwiss?.playerId,
		matchesWon: fromTiebreakers?.matchesWon || fromSwiss?.wins || 0,
		matchesPlayed: fromTiebreakers?.matchesPlayed || 0,
		matchWinPct: fromTiebreakers?.matchWinPct || 0,
		oppMatchWinPct: fromTiebreakers?.oppMatchWinPct || 0
	};
}

/**
 * Process tournament results from CSV files
 * Main entry point for tournament processing
 */
export async function processTournamentResults(swissStandingsCsv, pairingsCsv, eventInfo) {
	const swissStandings = parseSwissStandings(swissStandingsCsv);
	const pairings = parsePairings(pairingsCsv);

	if (swissStandings.length === 0) {
		throw new Error('No valid players found in Swiss Standings CSV');
	}

	if (pairings.length === 0) {
		throw new Error('No valid pairings found in Pairings CSV');
	}

	const standings = calculateFinalStandings(swissStandings, pairings);

	// Format matches for database insertion
	const matches = pairings.map(p => ({
		eventId: eventInfo.eventId,
		round: p.round,
		table: p.table || null,
		player1GemId: p.player1Id || null,
		player1Name: p.player1Name,
		player2GemId: p.player2Id || null,
		player2Name: p.player2Name,
		winner: p.result === '1WIN' || p.result.includes('Player 1') ? 'player1'
			: p.result === '2WIN' || p.result.includes('Player 2') ? 'player2'
			: null // draw
	}));

	return {
		...standings,
		matches, // Include matches for persistence
		eventInfo,
		summary: {
			totalPlayers: standings.totalPlayers,
			top8Players: standings.bracketResults ? 8 : 0,
			swissRounds: standings.roundStructure.swissRounds,
			hasTop8: standings.roundStructure.hasTop8,
			winner: standings.results.find(r => r.placement === 1),
			totalPointsDistributed: standings.results.reduce((sum, r) => sum + r.points, 0),
			totalPrizeDistributed: standings.results.reduce((sum, r) => sum + r.prize, 0)
		}
	};
}
