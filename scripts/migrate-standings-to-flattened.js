/**
 * Migration script: Flatten JSONB columns in season_standing table
 *
 * This script migrates data from the monthlyData and metadata JSONB columns
 * to the new flattened monthly columns (e.g., januaryPoints, januaryMatchesWon, etc.)
 *
 * Run with: node scripts/migrate-standings-to-flattened.js
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

// Month name mappings
const MONTHS = [
	'january', 'february', 'march', 'april', 'may', 'june',
	'july', 'august', 'september', 'october', 'november', 'december'
];

// Variations of month names that might appear in data
const MONTH_ALIASES = {
	'jan': 'january', 'january': 'january',
	'feb': 'february', 'february': 'february',
	'mar': 'march', 'march': 'march',
	'apr': 'april', 'april': 'april',
	'may': 'may',
	'jun': 'june', 'june': 'june',
	'jul': 'july', 'july': 'july',
	'aug': 'august', 'august': 'august',
	'sep': 'september', 'sept': 'september', 'september': 'september',
	'oct': 'october', 'october': 'october',
	'nov': 'november', 'november': 'november',
	'dec': 'december', 'december': 'december'
};

function normalizeMonthName(monthKey) {
	const lower = monthKey.toLowerCase().trim();
	return MONTH_ALIASES[lower] || null;
}

function parseNumber(val) {
	if (val === null || val === undefined || val === '') return 0;
	const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
	return isNaN(num) ? 0 : Math.round(num);
}

async function migrateStandings() {
	console.log('Starting migration of season_standing data to flattened columns...\n');

	try {
		// Fetch all standings with JSONB data
		const standings = await db.select().from(schema.seasonStanding);
		console.log(`Found ${standings.length} standing records to process\n`);

		let migratedCount = 0;
		let skippedCount = 0;

		for (const standing of standings) {
			const monthlyData = standing.monthlyData || {};
			const metadata = standing.metadata || {};

			// Build update object with flattened monthly data
			const updates = {};

			// Process monthlyData JSONB
			for (const [monthKey, data] of Object.entries(monthlyData)) {
				const normalizedMonth = normalizeMonthName(monthKey);
				if (!normalizedMonth || typeof data !== 'object') continue;

				// Map points
				const points = parseNumber(data.points);
				if (points > 0) {
					updates[`${normalizedMonth}Points`] = points;
				}

				// Map matches won
				const matchesWon = parseNumber(data.matchesWon);
				if (matchesWon > 0) {
					updates[`${normalizedMonth}MatchesWon`] = matchesWon;
				}

				// Map events/games played
				const events = parseNumber(data.gamesPlayed || data.eventsPlayed || data.events);
				if (events > 0) {
					updates[`${normalizedMonth}Events`] = events;
				}
			}

			// Process metadata JSONB - check for Notion-style column names
			for (const [key, value] of Object.entries(metadata)) {
				// Check for month-based keys like "January (2025)" or just month names
				for (const month of MONTHS) {
					const capitalMonth = month.charAt(0).toUpperCase() + month.slice(1);

					// Match patterns like "January", "January (2025)", "January Points"
					if (key.toLowerCase().startsWith(month)) {
						const numValue = parseNumber(value);
						if (numValue > 0) {
							// Determine if it's points, matches, or events based on key name
							if (key.toLowerCase().includes('match') || key.toLowerCase().includes('win')) {
								updates[`${month}MatchesWon`] = numValue;
							} else if (key.toLowerCase().includes('event') || key.toLowerCase().includes('game')) {
								updates[`${month}Events`] = numValue;
							} else {
								// Default to points
								updates[`${month}Points`] = numValue;
							}
						}
					}
				}

				// Also extract aggregate stats from metadata
				const lowerKey = key.toLowerCase();
				if (lowerKey.includes('total match win') || lowerKey === 'total_match_wins') {
					const val = parseNumber(value);
					if (val > 0 && !standing.matchesWon) {
						updates.matchesWon = val;
					}
				}
				if (lowerKey.includes('age points') || lowerKey === 'age_points') {
					const val = parseNumber(value);
					if (val > 0 && !standing.totalPoints) {
						updates.totalPoints = val;
					}
				}
				if (lowerKey.includes('events') || lowerKey.includes('attended')) {
					const val = parseNumber(value);
					if (val > 0 && !standing.eventsPlayed) {
						updates.eventsPlayed = val;
					}
				}
				if (lowerKey.includes('top 8') || lowerKey.includes('top8')) {
					const val = parseNumber(value);
					if (val > 0 && !standing.top8Finishes) {
						updates.top8Finishes = val;
					}
				}
			}

			// Only update if we have changes
			if (Object.keys(updates).length > 0) {
				updates.updatedAt = new Date();

				await db.update(schema.seasonStanding)
					.set(updates)
					.where(eq(schema.seasonStanding.id, standing.id));

				migratedCount++;
				console.log(`  Migrated: ${standing.playerName} (${standing.circuit} ${standing.season})`);
				console.log(`    Updates: ${JSON.stringify(updates)}`);
			} else {
				skippedCount++;
			}
		}

		console.log(`\n✅ Migration complete!`);
		console.log(`   Migrated: ${migratedCount} records`);
		console.log(`   Skipped: ${skippedCount} records (no JSONB data to migrate)`);

	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

// Run migration
migrateStandings();
