import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(env.DATABASE_URL, {
	max: 5, // Reduced connections to avoid pool exhaustion
	idle_timeout: 10, // Close idle connections quickly
	connect_timeout: 5, // Fast fail on connection issues (was 30)
	max_lifetime: 60 * 2, // 2 minute max lifetime
	fetch_types: false, // Disable type fetching for faster connection
	prepare: false, // Required for PgBouncer transaction mode
	connection: {
		statement_timeout: 10000, // 10 second statement timeout (was 15)
	}
});

export const db = drizzle(client, { schema });
