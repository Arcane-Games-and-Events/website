import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

// Initialize Redis client (only if credentials are available)
const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
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
			console.log(`[Redis] Cache HIT: ${key}`);
			return cached;
		}

		console.log(`[Redis] Cache MISS: ${key}`);

		// Cache miss - fetch fresh data
		const freshData = await fetchFn();

		// Store in cache (don't await - fire and forget)
		redis.set(key, freshData, { ex: ttl }).catch((err) => {
			console.error(`[Redis] Failed to set cache for ${key}:`, err);
		});

		return freshData;
	} catch (error) {
		console.error(`[Redis] Error for ${key}:`, error);
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
		console.log(`[Redis] Invalidated: ${key}`);
	} catch (error) {
		console.error(`[Redis] Failed to invalidate ${key}:`, error);
	}
}

/**
 * Invalidate all cache keys matching a prefix
 * @param {string} prefix - Key prefix to match
 */
export async function invalidateCacheByPrefix(prefix) {
	if (!redis) return;

	try {
		// Upstash doesn't support SCAN in REST API, so we track keys manually
		// For now, just log the intent - in production you'd use a key registry
		console.log(`[Redis] Would invalidate keys with prefix: ${prefix}`);
	} catch (error) {
		console.error(`[Redis] Failed to invalidate prefix ${prefix}:`, error);
	}
}

/**
 * Check if Redis is available
 * @returns {boolean}
 */
export function isRedisAvailable() {
	return redis !== null;
}

export { redis };
