/**
 * Migration: Rename monthly Events columns to Matches columns
 *
 * Run with: node scripts/migrate-events-to-matches.js
 */

import postgres from 'postgres';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL environment variable is not set');
	process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function migrate() {
	console.log('Migrating: Renaming Events columns to Matches columns...\n');

	try {
		// Check if old columns exist
		const checkResult = await sql`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_name = 'season_standing'
			AND column_name = 'january_events'
		`;

		if (checkResult.length > 0) {
			console.log('Found old column names. Renaming...');

			// Rename all events columns to matches columns
			const months = [
				'january', 'february', 'march', 'april', 'may', 'june',
				'july', 'august', 'september', 'october', 'november', 'december'
			];

			for (const month of months) {
				await sql.unsafe(`
					ALTER TABLE season_standing
					RENAME COLUMN ${month}_events TO ${month}_matches
				`);
				console.log(`  ✓ Renamed ${month}_events to ${month}_matches`);
			}
		} else {
			// Check if new columns exist
			const newCheckResult = await sql`
				SELECT column_name
				FROM information_schema.columns
				WHERE table_name = 'season_standing'
				AND column_name = 'january_matches'
			`;

			if (newCheckResult.length > 0) {
				console.log('Columns already renamed to *_matches. No migration needed.');
			} else {
				console.log('Creating new *_matches columns...');

				const months = [
					'january', 'february', 'march', 'april', 'may', 'june',
					'july', 'august', 'september', 'october', 'november', 'december'
				];

				for (const month of months) {
					await sql.unsafe(`
						ALTER TABLE season_standing
						ADD COLUMN IF NOT EXISTS ${month}_matches INTEGER DEFAULT 0
					`);
					console.log(`  ✓ Created ${month}_matches column`);
				}
			}
		}

		console.log('\n✅ Migration complete!');

	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

migrate();
