/**
 * Clear all standings-related data from the database
 * This removes data from: season_standing, player_alias, player tables
 *
 * Run with: node scripts/clear-standings-data.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
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

async function clearStandingsData() {
	console.log('Clearing all standings data...\n');

	try {
		// Delete in order due to foreign key constraints

		// 1. Delete all season standings
		const standingsResult = await db.delete(schema.seasonStanding);
		console.log('✓ Deleted all season_standing records');

		// 2. Delete all player aliases
		const aliasResult = await db.delete(schema.playerAlias);
		console.log('✓ Deleted all player_alias records');

		// 3. Delete all players
		const playerResult = await db.delete(schema.player);
		console.log('✓ Deleted all player records');

		console.log('\n✅ All standings data has been cleared!');
		console.log('Tables are now empty and ready for fresh data import.');

	} catch (error) {
		console.error('Clear failed:', error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

// Run clear
clearStandingsData();
