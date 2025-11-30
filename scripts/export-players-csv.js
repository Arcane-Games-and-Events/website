/**
 * Export all players with their GEM IDs to a CSV file
 *
 * Run with: node scripts/export-players-csv.js
 * Output: scripts/players-export.csv
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get DATABASE_URL from environment or .env file
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL environment variable is not set');
	process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function exportPlayers() {
	console.log('Exporting players to CSV...\n');

	try {
		// Fetch all players
		const players = await db.select().from(schema.player);
		console.log(`Found ${players.length} players\n`);

		if (players.length === 0) {
			console.log('No players found in the database.');
			await client.end();
			return;
		}

		// Create CSV content
		const csvLines = ['Display Name,GEM ID'];

		for (const player of players) {
			const displayName = player.displayName.replace(/,/g, ';').replace(/"/g, '""');
			const gemId = player.gemId || '';
			csvLines.push(`"${displayName}","${gemId}"`);
		}

		const csvContent = csvLines.join('\n');
		const outputPath = join(__dirname, 'players-export.csv');

		writeFileSync(outputPath, csvContent, 'utf8');

		console.log(`Successfully exported ${players.length} players to:`);
		console.log(`  ${outputPath}`);

	} catch (error) {
		console.error('Export failed:', error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

// Run export
exportPlayers();
