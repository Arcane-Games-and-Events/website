import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

// APP_ENV isolates dev and prod key namespaces so a single Upstash
// instance can safely serve both — dev writes land under `dev:`, prod
// writes under `prod:`. Anything other than the literal string `prod`
// is treated as `dev` so a forgotten or misspelled setting can't ever
// accidentally poison the prod keyspace.
const APP_ENV = env.APP_ENV === 'prod' ? 'prod' : 'dev';

// Cache key prefixes for organization. Every cache key in the app is
// built by concatenating one of these with a suffix, e.g.
// `${CACHE_KEYS.ARTICLES}:latest:12`. Adding a new cached surface? Add
// its prefix here first — no magic strings anywhere else.
export const CACHE_KEYS = {
	STANDINGS: 'standings',
	EVENTS: 'events',
	ARTICLES: 'articles',
	PLAYER: 'player',
	DECKLISTS: 'decklists',
	PODCASTS: 'podcasts',
	VODS: 'vods',
	LSS: 'lss',
	HEROES: 'heroes'
};

// Default TTL values (in seconds).
export const CACHE_TTL = {
	SHORT: 60, // 1 minute — frequently-changing data
	MEDIUM: 300, // 5 minutes — standings, events
	LONG: 900, // 15 minutes — articles
	HOUR: 3600, // 1 hour — rarely-changing data
	DAY: 86400 // 24 hours — near-static data (card lookups etc.)
};

// Lazy Redis client. We deliberately do NOT instantiate at module load
// time — SvelteKit + adapter-vercel both import server modules during
// the build's static-analysis pass, and that pass doesn't always have
// the runtime env vars available. Throwing at import time turns any
// deploy without perfectly-scoped env vars into a hard build failure.
// Instantiating on first use means the module always imports cleanly;
// a genuinely missing config surfaces on the first cache call, and the
// primitives' try/catch below converts that into a graceful DB fallback
// (with a loud console warning) rather than a site-wide outage.
let _client = null;
let _warned = false;
function getRedis() {
	if (_client) return _client;
	if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
		if (!_warned) {
			console.warn(
				'[redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing — ' +
					'cache primitives will bypass Redis and hit the DB directly. See .env.example.'
			);
			_warned = true;
		}
		return null;
	}
	_client = new Redis({
		url: env.UPSTASH_REDIS_REST_URL,
		token: env.UPSTASH_REDIS_REST_TOKEN
	});
	return _client;
}

/**
 * Prefix a bare cache key with the current env namespace. Call sites
 * pass unprefixed keys (`events:upcoming:3`); this returns the full
 * key that actually lives in Redis (`prod:events:upcoming:3` or
 * `dev:events:upcoming:3`). The `getCachedOrFetch`, `invalidateCache`,
 * and `invalidateByPrefix` primitives already apply this internally —
 * export it for the rare case where you need to construct a key by
 * hand (e.g. debug tooling, admin cache page).
 */
export function k(key) {
	return `${APP_ENV}:${key}`;
}

/**
 * Read `key` from Redis. On a miss, run `fetchFn`, cache the result for
 * `ttl` seconds, and return it. If Redis is unconfigured or errors, we
 * fall through to `fetchFn` so cache outages never break the site.
 *
 * @param {string} key   Unprefixed cache key.
 * @param {() => Promise<any>} fetchFn  Producer for cache misses.
 * @param {number} ttl   Seconds to keep the result. Defaults to MEDIUM (5 min).
 */
export async function getCachedOrFetch(key, fetchFn, ttl = CACHE_TTL.MEDIUM) {
	const client = getRedis();
	if (!client) return fetchFn();
	const prefixed = k(key);
	try {
		const cached = await client.get(prefixed);
		if (cached !== null) return cached;

		const freshData = await fetchFn();

		// Fire-and-forget cache write. A slow write shouldn't hold up
		// the request; a failed one shouldn't crash it.
		client.set(prefixed, freshData, { ex: ttl }).catch(() => {});

		return freshData;
	} catch (err) {
		console.warn(`Redis error on ${prefixed}, bypassing cache:`, err.message);
		return fetchFn();
	}
}

/**
 * Delete a single cache key. Silent on error — invalidation failures
 * mustn't break the write action that triggered them.
 */
export async function invalidateCache(key) {
	const client = getRedis();
	if (!client) return;
	try {
		await client.del(k(key));
	} catch {
		// Silent — cache invalidation errors shouldn't break the app
	}
}

/**
 * Delete every cache key whose (unprefixed) name starts with `prefix`.
 * Uses SCAN + batched DEL so large keyspaces don't block Redis. Scoped
 * to the current APP_ENV automatically — `invalidateByPrefix('user:abc:')`
 * on dev cannot touch prod entries.
 *
 * Silent on error — same rationale as `invalidateCache`.
 */
export async function invalidateByPrefix(prefix) {
	const client = getRedis();
	if (!client) return;
	const pattern = `${k(prefix)}*`;
	try {
		let cursor = 0;
		do {
			const [nextCursor, keys] = await client.scan(cursor, {
				match: pattern,
				count: 100
			});
			cursor = typeof nextCursor === 'string' ? parseInt(nextCursor, 10) : Number(nextCursor);
			if (keys.length > 0) {
				await client.del(...keys);
			}
		} while (cursor !== 0);
	} catch (err) {
		console.warn(`Redis SCAN/DEL failed for pattern ${pattern}:`, err.message);
	}
}

// Raw client accessor — reserved for internal tooling that legitimately
// needs low-level access (e.g. a future admin cache-inspector page).
// If you use this directly, remember: keys you pass are NOT env-prefixed
// automatically. Use `k(key)` to build them. Returns null when Redis
// is not configured.
export { getRedis };
