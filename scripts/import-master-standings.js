/**
 * Import Master Standings CSV into the database
 *
 * CSV Columns:
 * Player_Name, GEM_ID, Year, Region, AGE_Points, Win_Pct, Events_Attended,
 * Top_8_Appearances, Total_Match_Wins, Total_Matches_Played,
 * Jan_Points, Jan_Wins, Jan_Matches, Feb_Points, Feb_Wins, Feb_Matches, ...
 *
 * Run with: node scripts/import-master-standings.js <csv-file-path>
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema.js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL environment variable is not set');
	process.exit(1);
}

const csvFilePath = process.argv[2];
if (!csvFilePath) {
	console.error('ERROR: Please provide CSV file path as argument');
	console.error('Usage: node scripts/import-master-standings.js <csv-file-path>');
	process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

// Parse CSV with proper handling of commas and quotes
function parseCSVLine(line) {
	const values = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			values.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	values.push(current.trim());
	return values;
}

// Parse integer, return 0 if empty or invalid
function parseIntOrZero(val) {
	if (!val || val === '') return 0;
	const parsed = parseInt(val, 10);
	return isNaN(parsed) ? 0 : parsed;
}

// Parse decimal, return null if empty or invalid
function parseDecimalOrNull(val) {
	if (!val || val === '') return null;
	const parsed = parseFloat(val);
	return isNaN(parsed) ? null : parsed;
}

async function importStandings() {
	console.log(`Importing standings from: ${csvFilePath}\n`);

	try {
		const csvContent = readFileSync(csvFilePath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length < 2) {
			console.error('CSV file appears to be empty or has no data rows');
			process.exit(1);
		}

		const headers = parseCSVLine(lines[0]);
		console.log('CSV Headers:', headers.join(', '));
		console.log(`\nFound ${lines.length - 1} data rows\n`);

		// Create header index map
		const headerIndex = {};
		headers.forEach((h, i) => {
			headerIndex[h] = i;
		});

		// Track players for the player table
		const playersMap = new Map(); // GEM_ID -> { displayName, gemId }
		const standingsToInsert = [];

		for (let i = 1; i < lines.length; i++) {
			const values = parseCSVLine(lines[i]);

			const playerName = values[headerIndex['Player_Name']] || '';
			const gemId = values[headerIndex['GEM_ID']] || null;
			const season = values[headerIndex['Year']] || '';
			const circuit = values[headerIndex['Region']] || '';

			if (!playerName || !season || !circuit) {
				console.log(`  Skipping row ${i}: missing required fields`);
				continue;
			}

			// Track unique players by GEM ID
			if (gemId && !playersMap.has(gemId)) {
				playersMap.set(gemId, { displayName: playerName, gemId });
			}

			const standing = {
				season: season,
				circuit: circuit,
				playerName: playerName,
				gemId: gemId || null,
				totalPoints: parseIntOrZero(values[headerIndex['AGE_Points']]),
				winPercentage: parseDecimalOrNull(values[headerIndex['Win_Pct']]),
				eventsPlayed: parseIntOrZero(values[headerIndex['Events_Attended']]),
				top8Finishes: parseIntOrZero(values[headerIndex['Top_8_Appearances']]),
				matchesWon: parseIntOrZero(values[headerIndex['Total_Match_Wins']]),
				matchesPlayed: parseIntOrZero(values[headerIndex['Total_Matches_Played']]),

				// Monthly points
				januaryPoints: parseIntOrZero(values[headerIndex['Jan_Points']]),
				februaryPoints: parseIntOrZero(values[headerIndex['Feb_Points']]),
				marchPoints: parseIntOrZero(values[headerIndex['Mar_Points']]),
				aprilPoints: parseIntOrZero(values[headerIndex['Apr_Points']]),
				mayPoints: parseIntOrZero(values[headerIndex['May_Points']]),
				junePoints: parseIntOrZero(values[headerIndex['Jun_Points']]),
				julyPoints: parseIntOrZero(values[headerIndex['Jul_Points']]),
				augustPoints: parseIntOrZero(values[headerIndex['Aug_Points']]),
				septemberPoints: parseIntOrZero(values[headerIndex['Sep_Points']]),
				octoberPoints: parseIntOrZero(values[headerIndex['Oct_Points']]),
				novemberPoints: parseIntOrZero(values[headerIndex['Nov_Points']]),
				decemberPoints: parseIntOrZero(values[headerIndex['Dec_Points']]),

				// Monthly wins
				januaryMatchesWon: parseIntOrZero(values[headerIndex['Jan_Wins']]),
				februaryMatchesWon: parseIntOrZero(values[headerIndex['Feb_Wins']]),
				marchMatchesWon: parseIntOrZero(values[headerIndex['Mar_Wins']]),
				aprilMatchesWon: parseIntOrZero(values[headerIndex['Apr_Wins']]),
				mayMatchesWon: parseIntOrZero(values[headerIndex['May_Wins']]),
				juneMatchesWon: parseIntOrZero(values[headerIndex['Jun_Wins']]),
				julyMatchesWon: parseIntOrZero(values[headerIndex['Jul_Wins']]),
				augustMatchesWon: parseIntOrZero(values[headerIndex['Aug_Wins']]),
				septemberMatchesWon: parseIntOrZero(values[headerIndex['Sep_Wins']]),
				octoberMatchesWon: parseIntOrZero(values[headerIndex['Oct_Wins']]),
				novemberMatchesWon: parseIntOrZero(values[headerIndex['Nov_Wins']]),
				decemberMatchesWon: parseIntOrZero(values[headerIndex['Dec_Wins']]),

				// Monthly matches played
				januaryMatches: parseIntOrZero(values[headerIndex['Jan_Matches']]),
				februaryMatches: parseIntOrZero(values[headerIndex['Feb_Matches']]),
				marchMatches: parseIntOrZero(values[headerIndex['Mar_Matches']]),
				aprilMatches: parseIntOrZero(values[headerIndex['Apr_Matches']]),
				mayMatches: parseIntOrZero(values[headerIndex['May_Matches']]),
				juneMatches: parseIntOrZero(values[headerIndex['Jun_Matches']]),
				julyMatches: parseIntOrZero(values[headerIndex['Jul_Matches']]),
				augustMatches: parseIntOrZero(values[headerIndex['Aug_Matches']]),
				septemberMatches: parseIntOrZero(values[headerIndex['Sep_Matches']]),
				octoberMatches: parseIntOrZero(values[headerIndex['Oct_Matches']]),
				novemberMatches: parseIntOrZero(values[headerIndex['Nov_Matches']]),
				decemberMatches: parseIntOrZero(values[headerIndex['Dec_Matches']]),
			};

			standingsToInsert.push(standing);
		}

		// Insert players first
		console.log(`Inserting ${playersMap.size} unique players...`);
		for (const [gemId, playerData] of playersMap) {
			try {
				await db.insert(schema.player).values(playerData).onConflictDoNothing();
			} catch (err) {
				// Ignore duplicate key errors
			}
		}
		console.log('✓ Players inserted\n');

		// Insert standings
		console.log(`Inserting ${standingsToInsert.length} standings records...`);
		let insertedCount = 0;
		let errorCount = 0;

		for (const standing of standingsToInsert) {
			try {
				await db.insert(schema.seasonStanding).values(standing).onConflictDoNothing();
				insertedCount++;
			} catch (err) {
				errorCount++;
				console.log(`  Error inserting ${standing.playerName} (${standing.season} ${standing.circuit}):`, err.message);
			}
		}

		console.log(`\n✅ Import complete!`);
		console.log(`   Inserted: ${insertedCount} standings records`);
		if (errorCount > 0) {
			console.log(`   Errors: ${errorCount} records`);
		}

	} catch (error) {
		console.error('Import failed:', error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

importStandings();
