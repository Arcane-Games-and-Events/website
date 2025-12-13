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

// Cache key prefixes for organization
export const CACHE_KEYS = {
	STANDINGS: 'standings',
	EVENTS: 'events',
	ARTICLES: 'articles',
	PLAYER: 'player'
};

// Default TTL values (in seconds)
export const CACHE_TTL = {
	SHORT: 60, // 1 minute - for frequently changing data
	MEDIUM: 300, // 5 minutes - for standings, events
	LONG: 900, // 15 minutes - for articles
	HOUR: 3600 // 1 hour - for rarely changing data
};

/**
 * Get cached data or fetch fresh data
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch fresh data if cache miss
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 * @returns {Promise<any>} - Cached or fresh data
 */
export async function getCachedOrFetch(key, fetchFn, ttl = CACHE_TTL.MEDIUM) {
	// If Redis is not configured, just fetch directly
	if (!redis) {
		return fetchFn();
	}

	try {
		// Try to get from cache
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
		// On Redis error, fall back to direct fetch
		return fetchFn();
	}
}

/**
 * Invalidate cache for a specific key or pattern
 * @param {string} key - Cache key to invalidate
 */
export async function invalidateCache(key) {
	if (!redis) return;

	try {
		await redis.del(key);
	} catch (error) {
		// Silent fail - cache invalidation errors shouldn't break the app
	}
}

/**
 * Invalidate all cache keys matching a prefix
 * @param {string} prefix - Key prefix to match
 */
export async function invalidateCacheByPrefix(_prefix) {
	if (!redis) return;

	// Upstash REST API doesn't support SCAN, so pattern-based invalidation
	// requires tracking keys manually. For now, use specific invalidateCache calls.
}

/**
 * Check if Redis is available
 * @returns {boolean}
 */
export function isRedisAvailable() {
	return redis !== null;
}

export { redis };
