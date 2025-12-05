import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(env.DATABASE_URL, {
	max: 5, // Reduced max connections to avoid pool exhaustion
	idle_timeout: 30, // Close idle connections after 30 seconds
	connect_timeout: 30, // Increased connection timeout for cold starts
	max_lifetime: 60 * 5, // Max connection lifetime of 5 minutes
	fetch_types: false, // Disable type fetching for faster connection
	prepare: false // Disable prepared statements for connection poolers
});

export const db = drizzle(client, { schema });
