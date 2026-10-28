import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

// Read-through cache on Upstash Redis with tag-based invalidation.
//
//   cached(key, fn, { tags, ttl, mem })  — return the cached value or run fn
//   bump(...tags)                         — make every value carrying a tag stale
//
// Every cached value records the version of each tag it depends on. A bump
// increments the tag's version counter (one INCR), so every value stamped
// with the old version misses on its next read. There are no key lists to
// maintain and no SCAN: a writer only says what changed ("entries",
// "events"), never which keys to delete. TTLs are only a safety net.
//
// Tags in use:
//   entries  courses  media  events  matches  standings  decklists  vods
//   tickets  lss  cards  orders  users
//   user:{id}  (one member's session, staff count, partner flag)

// APP_ENV isolates dev and prod key namespaces so a single Upstash
// instance can safely serve both. Anything other than the literal string
// `prod` is treated as `dev` so a forgotten or misspelled setting can't
// ever poison the prod keyspace.
const APP_ENV = env.APP_ENV === 'prod' ? 'prod' : 'dev';

// Seconds.
export const CACHE_TTL = {
	MINUTE: 60,
	FIVE_MINUTES: 300,
	HOUR: 3600,
	DAY: 86400
};

// Lazy client: never instantiate at import time, because the build's
// static-analysis pass imports server modules without runtime env vars.
// A missing config surfaces on first use and the primitives below fall
// back to the database. Cached on globalThis so Vite HMR reuses it.
const g = /** @type {any} */ (globalThis);
function getRedis() {
	if (g.__ageRedisClient) return g.__ageRedisClient;
	if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
		if (!g.__ageRedisWarned) {
			console.warn(
				'[cache] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing — ' +
					'caching is off and every read hits the database. See .env.example.'
			);
			g.__ageRedisWarned = true;
		}
		return null;
	}
	g.__ageRedisClient = new Redis({
		url: env.UPSTASH_REDIS_REST_URL,
		token: env.UPSTASH_REDIS_REST_TOKEN
	});
	return g.__ageRedisClient;
}

/** Prefix a bare key with the env namespace (`events:all` → `prod:events:all`). */
function k(key) {
	return `${APP_ENV}:${key}`;
}
const versionKey = (tag) => k(`v:${tag}`);

// In-process layer for the few values read on every navigation. Lives as
// long as a warm serverless instance; entries expire after `mem` seconds,
// and a bump on this instance drops them straight away. Other instances
// see a bump within `mem` seconds.
/** @type {Map<string, { exp: number, tags: string[], data: any }>} */
const memory = g.__ageCacheMemory ?? (g.__ageCacheMemory = new Map());

/**
 * Read `key` from the cache, or run `fn`, store its result and return it.
 *
 * `tags` is an array, or a function of the result for values whose tags
 * are only known after loading (a session's user id). Null and undefined
 * results are never stored. Redis failures fall through to `fn`; errors
 * thrown by `fn` propagate.
 *
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fn
 * @param {{ tags?: string[] | ((value: T) => string[]), ttl?: number, mem?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function cached(key, fn, { tags = [], ttl = CACHE_TTL.HOUR, mem = 0 } = {}) {
	if (mem) {
		const hit = memory.get(key);
		if (hit && hit.exp > Date.now()) return hit.data;
	}

	const client = getRedis();
	if (!client) return fn();

	const staticTags = Array.isArray(tags) ? tags : null;
	const fullKey = k(key);

	// Static tags: the value and the current tag versions in one MGET.
	// Dynamic tags: read the value first, then the versions it recorded.
	let versions = null;
	try {
		let entry;
		if (staticTags) {
			const [value, ...current] = await client.mget(fullKey, ...staticTags.map(versionKey));
			entry = value;
			versions = Object.fromEntries(staticTags.map((t, i) => [t, Number(current[i] ?? 0)]));
		} else {
			entry = await client.get(fullKey);
		}

		if (entry && typeof entry === 'object' && 'd' in entry) {
			const stamped = entry.v || {};
			const names = Object.keys(stamped);
			let fresh = true;
			if (staticTags) {
				fresh =
					names.length === staticTags.length && names.every((t) => stamped[t] === versions[t]);
			} else if (names.length) {
				const current = await client.mget(...names.map(versionKey));
				fresh = names.every((t, i) => stamped[t] === Number(current[i] ?? 0));
			}
			if (fresh) {
				remember(key, entry.d, names, mem);
				return entry.d;
			}
		}
	} catch (err) {
		console.warn(`[cache] read failed for ${fullKey}, using the database:`, err.message);
		return fn();
	}

	const data = await fn();
	if (data === null || data === undefined) return data;

	const tagList = staticTags ?? tags(data);
	remember(key, data, tagList, mem);

	// Store without holding up the response. Versions read before `fn` ran
	// are the right stamp: a bump during `fn` makes this value stale.
	(async () => {
		if (!versions) {
			const current = tagList.length ? await client.mget(...tagList.map(versionKey)) : [];
			versions = Object.fromEntries(tagList.map((t, i) => [t, Number(current[i] ?? 0)]));
		}
		await client.set(fullKey, { v: versions, d: data }, { ex: ttl });
	})().catch(() => {});

	return data;
}

function remember(key, data, tags, mem) {
	if (mem) memory.set(key, { exp: Date.now() + mem * 1000, tags, data });
}

/**
 * Make every cached value carrying any of `tags` stale. One round trip
 * whatever the number of affected keys. Awaited by callers: Vercel can
 * stop a function's background work once the response is sent. Never
 * throws — a failed bump leaves values to expire on their TTL.
 *
 * @param {...string} tags
 */
export async function bump(...tags) {
	const list = [...new Set(tags.filter(Boolean))];
	if (!list.length) return;

	for (const [key, entry] of memory) {
		if (entry.tags.some((t) => list.includes(t))) memory.delete(key);
	}

	const client = getRedis();
	if (!client) return;
	try {
		const pipe = client.pipeline();
		for (const t of list) pipe.incr(versionKey(t));
		await pipe.exec();
	} catch (err) {
		console.warn(`[cache] bump failed for ${list.join(', ')}:`, err.message);
	}
}

/**
 * Delete one key outright — for values that must disappear now rather
 * than go stale, like a session on logout. Never throws.
 *
 * @param {string} key
 */
export async function forget(key) {
	memory.delete(key);
	const client = getRedis();
	if (!client) return;
	try {
		await client.del(k(key));
	} catch {
		// Falls back to the TTL.
	}
}
