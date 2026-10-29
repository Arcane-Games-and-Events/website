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
			// Never pipeline. By default postgres-js writes the next waiting
			// query to a connection before the active one has finished (even
			// `max_pipeline: 1` allows one extra). The transaction-mode pooler
			// returns the server connection after each query, so the
			// pipelined bytes go astray: parallel loads hang and one query
			// can receive another query's rows. 0 means one query at a time
			// per connection, which is what transaction pooling supports.
			max_pipeline: 0,
			connection: {
				statement_timeout: 10000 // 10 second statement timeout (was 15)
			}
		});
	}
	return g.__ageDbClient;
}

/**
 * Run `fn(tx)` inside one database transaction and return its result.
 *
 * Drizzle's own `db.transaction` goes through postgres-js `sql.begin`, which
 * only marks its connection as reserved from the pipelining hook — and
 * pipelining is off here (`max_pipeline: 0` above), so `sql.begin` raises
 * UNSAFE_TRANSACTION every time. Instead a connection is reserved outright,
 * BEGIN/COMMIT run on it, and `fn` gets a Drizzle handle bound to that one
 * connection. The transaction-mode pooler keeps a single server connection
 * for the whole BEGIN…COMMIT, so the queries inside can't cross.
 */
export async function transaction(fn) {
	const client = getClient();
	const reserved = await client.reserve();
	// Drizzle reads type parsers off `client.options`; a reserved handle has
	// none of its own, so point it at the pool's.
	reserved.options = client.options;
	try {
		await reserved`begin`;
		const result = await fn(drizzle(reserved, { schema }));
		await reserved`commit`;
		return result;
	} catch (err) {
		await reserved`rollback`.catch(() => {});
		throw err;
	} finally {
		reserved.release();
	}
}

export const db = new Proxy(
	{},
	{
		get(_, prop) {
			// Keep the familiar `db.transaction(fn)` shape, see above.
			if (prop === 'transaction') return transaction;
			if (!g.__ageDbDrizzle) {
				g.__ageDbDrizzle = drizzle(getClient(), { schema });
			}
			return g.__ageDbDrizzle[prop];
		}
	}
);
