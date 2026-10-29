/**
 * Fresh database for the browser tests, with the few rows the public pages
 * need to render something real.
 */
import postgres from 'postgres';
import { createTestDatabase } from '../setup/database.js';
import { assertSafeDatabaseUrl } from '../setup/environment.js';

export const SEED = {
	eventId: 'e2e-open-la',
	member: { email: 'member@e2e.test', password: 'e2e-password-1' }
};

export default async function globalSetup() {
	const url = process.env.TEST_DATABASE_URL;
	assertSafeDatabaseUrl(url);
	await createTestDatabase(url);
	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		const inMonth = new Date(Date.now() + 30 * 86400000);
		await sql`
			insert into events (id, title, price, circuit, month, event_date, premium_discount, gem_id_required, status, location, format)
			values (${SEED.eventId}, 'AGE Open Los Angeles', '40.00', 'Los Angeles',
				${inMonth.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })}, ${inMonth}, true, true, 'upcoming',
				'Test Deck Keep', 'Classic Constructed')`;
	} finally {
		await sql.end();
	}
}
