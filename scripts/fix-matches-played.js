/**
 * Fix script: Populate matchesPlayed field in season_standing table
 *
 * This calculates matchesPlayed from:
 * 1. If we have winPercentage and matchesWon, calculate: matchesPlayed = matchesWon / (winPercentage / 100)
 * 2. Otherwise, set matchesPlayed = matchesWon (minimum estimate)
 *
 * Run with: node scripts/fix-matches-played.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema.js';

// Get DATABASE_URL from environment or .env file
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL environment variable is not set');
	process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

async function fixMatchesPlayed() {
	console.log('Starting fix for matchesPlayed field...\n');

	try {
		// Fetch all standings
		const standings = await db.select().from(schema.seasonStanding);
		console.log(`Found ${standings.length} standing records to process\n`);

		let fixedCount = 0;
		let skippedCount = 0;

		for (const standing of standings) {
			const matchesWon = standing.matchesWon || 0;
			const currentMatchesPlayed = standing.matchesPlayed || 0;
			const winPercentage = standing.winPercentage;

			// Skip if matchesPlayed is already set and looks reasonable
			if (currentMatchesPlayed > 0 && currentMatchesPlayed >= matchesWon) {
				skippedCount++;
				continue;
			}

			let newMatchesPlayed = matchesWon; // Default: at minimum, played = won

			// If we have win percentage, calculate matches played
			if (winPercentage && winPercentage > 0 && matchesWon > 0) {
				// matchesPlayed = matchesWon / (winPercentage / 100)
				newMatchesPlayed = Math.round(matchesWon / (winPercentage / 100));

				// Sanity check: matchesPlayed should be at least matchesWon
				if (newMatchesPlayed < matchesWon) {
					newMatchesPlayed = matchesWon;
				}
			}

			// Only update if we have a value to set
			if (newMatchesPlayed > 0) {
				await db.update(schema.seasonStanding)
					.set({
						matchesPlayed: newMatchesPlayed,
						updatedAt: new Date()
					})
					.where(eq(schema.seasonStanding.id, standing.id));

				fixedCount++;
				console.log(`  Fixed: ${standing.playerName} (${standing.circuit} ${standing.season})`);
				console.log(`    matchesWon: ${matchesWon}, winPercentage: ${winPercentage || 'N/A'}, calculated matchesPlayed: ${newMatchesPlayed}`);
			} else {
				skippedCount++;
			}
		}

		console.log(`\n✅ Fix complete!`);
		console.log(`   Fixed: ${fixedCount} records`);
		console.log(`   Skipped: ${skippedCount} records (already had valid matchesPlayed)`);

	} catch (error) {
		console.error('Fix failed:', error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

// Run fix
fixMatchesPlayed();
