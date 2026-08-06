import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

// Initialize Redis client (only if credentials are available)
const redis =
	env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
		? new Redis({
				url: env.UPSTASH_REDIS_REST_URL,
				token: env.UPSTASH_REDIS_REST_TOKEN
			})
		: null;

// In-memory cache fallback for local development (when Redis is not available)
// This prevents database connection pool exhaustion during rapid page loads
const memoryCache = new Map();
const memoryCacheExpiry = new Map();

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

// Default TTL values (in seconds)
export const CACHE_TTL = {
	SHORT: 60, // 1 minute - for frequently changing data
	MEDIUM: 300, // 5 minutes - for standings, events
	LONG: 900, // 15 minutes - for articles
	HOUR: 3600 // 1 hour - for rarely changing data
};

/**
 * Get from memory cache if valid
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if expired/missing
 */
function getFromMemoryCache(key) {
	const expiry = memoryCacheExpiry.get(key);
	if (expiry && Date.now() < expiry) {
		return memoryCache.get(key);
	}
	// Expired or missing - clean up
	memoryCache.delete(key);
	memoryCacheExpiry.delete(key);
	return null;
}

/**
 * Set in memory cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
function setInMemoryCache(key, value, ttl) {
	memoryCache.set(key, value);
	memoryCacheExpiry.set(key, Date.now() + ttl * 1000);
}

/**
 * Get cached data or fetch fresh data
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch fresh data if cache miss
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 * @returns {Promise<any>} - Cached or fresh data
 */
export async function getCachedOrFetch(key, fetchFn, ttl = CACHE_TTL.MEDIUM) {
	// Try Redis first if available
	if (redis) {
		try {
			const cached = await redis.get(key);
			if (cached !== null) {
				return cached;
			}

			// Cache miss - fetch fresh data
			const freshData = await fetchFn();

			// Store in cache (don't await - fire and forget)
			redis.set(key, freshData, { ex: ttl }).catch(() => {
				// Silent fail - Redis errors shouldn't break the app
			});

			return freshData;
		} catch (error) {
			// On Redis error, fall through to memory cache or direct fetch
			console.warn('Redis error, falling back to memory cache:', error.message);
		}
	}

	// Fallback: Use in-memory cache (for local development without Redis)
	const memoryCached = getFromMemoryCache(key);
	if (memoryCached !== null) {
		return memoryCached;
	}

	// Cache miss - fetch fresh data
	const freshData = await fetchFn();

	// Store in memory cache
	setInMemoryCache(key, freshData, ttl);

	return freshData;
}

/**
 * Invalidate cache for a specific key or pattern
 * @param {string} key - Cache key to invalidate
 */
export async function invalidateCache(key) {
	// Invalidate memory cache
	memoryCache.delete(key);
	memoryCacheExpiry.delete(key);

	// Invalidate Redis cache if available
	if (!redis) return;

	try {
		await redis.del(key);
	} catch (error) {
		// Silent fail - cache invalidation errors shouldn't break the app
	}
}

export { redis };
