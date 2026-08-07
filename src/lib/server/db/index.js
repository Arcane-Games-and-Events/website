import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Cache both the underlying postgres pool AND the Drizzle wrapper on
// globalThis. Vite HMR reloads this module every time a server file
// changes, but globalThis survives the reload — so we reuse the same
// pool across HMR cycles instead of orphaning old ones. Without this,
// each save leaked ~5 pooled connections to Supabase; over a coding
// session that hits the pool limit and every new query hangs waiting
// for a connection that will never come.
//
// This is dev-only in intent but harmless in prod (in prod each Vercel
// serverless function only initializes the module once anyway).
const g = /** @type {any} */ (globalThis);

function getClient() {
	if (!g.__ageDbClient) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		g.__ageDbClient = postgres(env.DATABASE_URL, {
			max: 5, // Reduced connections to avoid pool exhaustion
			idle_timeout: 10, // Close idle connections quickly
			connect_timeout: 5, // Fast fail on connection issues (was 30)
			max_lifetime: 60 * 2, // 2 minute max lifetime
			fetch_types: false, // Disable type fetching for faster connection
			prepare: false, // Required for PgBouncer transaction mode
			connection: {
				statement_timeout: 10000 // 10 second statement timeout (was 15)
			}
		});
	}
	return g.__ageDbClient;
}

export const db = new Proxy(
	{},
	{
		get(_, prop) {
			if (!g.__ageDbDrizzle) {
				g.__ageDbDrizzle = drizzle(getClient(), { schema });
			}
			return g.__ageDbDrizzle[prop];
		}
	}
);
