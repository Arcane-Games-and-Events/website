/**
 * Fixed-window rate limits on the cache's Redis.
 *
 * Card attempts and checkouts are the targets of card-testing bots, so the
 * payment endpoints cap how often one account or one address can try.
 * Sign-in, sign-up, password resets and discussion posts have their own
 * caps (ACCOUNT_LIMITS, POST_LIMITS) against password guessing and floods.
 * Without Redis (local dev with no Upstash) everything is allowed.
 */
import { redis, k } from '$lib/server/cache/index.js';

/**
 * Count one hit against `name:id` and say whether it is within `max` per
 * `windowSeconds`.
 *
 * @returns {Promise<{ ok: boolean, remaining: number, retryAfter: number }>}
 */
export async function hit(name, id, max, windowSeconds) {
	const client = redis();
	if (!client || !id) return { ok: true, remaining: max, retryAfter: 0 };
	const window = Math.floor(Date.now() / 1000 / windowSeconds);
	const key = k(`rl:${name}:${id}:${window}`);
	try {
		const count = await client.incr(key);
		if (count === 1) await client.expire(key, windowSeconds + 1);
		const ok = count <= max;
		return {
			ok,
			remaining: Math.max(0, max - count),
			retryAfter: ok ? 0 : windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds)
		};
	} catch (err) {
		console.error('[ratelimit] failed, allowing:', err?.message || err);
		return { ok: true, remaining: max, retryAfter: 0 };
	}
}

/** The limits the payment endpoints share. */
export const LIMITS = {
	// card attempts: new tokens stored or charged
	cardPerUser: { max: 6, window: 3600 },
	cardPerIp: { max: 20, window: 3600 },
	// any checkout / subscribe call, including saved-card charges
	payPerUser: { max: 12, window: 3600 },
	payPerIp: { max: 40, window: 3600 }
};

/**
 * Apply a pair of limits (per user and per IP). Returns null when allowed,
 * or a `{ status: 429, error, retryAfter }` to send back.
 */
export async function guardPayment({ userId, ip, card = false }) {
	const checks = [
		hit('pay:u', userId, LIMITS.payPerUser.max, LIMITS.payPerUser.window),
		hit('pay:ip', ip, LIMITS.payPerIp.max, LIMITS.payPerIp.window)
	];
	if (card) {
		checks.push(
			hit('card:u', userId, LIMITS.cardPerUser.max, LIMITS.cardPerUser.window),
			hit('card:ip', ip, LIMITS.cardPerIp.max, LIMITS.cardPerIp.window)
		);
	}
	const results = await Promise.all(checks);
	const blocked = results.find((r) => !r.ok);
	if (!blocked) return null;
	return {
		status: 429,
		retryAfter: blocked.retryAfter,
		error: 'Too many payment attempts. Please wait a while before trying again.'
	};
}

/**
 * Sign-in, sign-up and password resets. Generous for people (a typo or
 * three), tight for scripts: per address, and per email so guessing one
 * account's password from many addresses still stops.
 */
export const ACCOUNT_LIMITS = {
	loginPerIp: { max: 30, window: 900 },
	loginPerEmail: { max: 10, window: 900 },
	signupPerIp: { max: 5, window: 3600 },
	resetPerIp: { max: 10, window: 3600 },
	resetPerEmail: { max: 3, window: 3600 }
};

/** Course discussions, per account: new threads and replies. */
export const POST_LIMITS = {
	threadPerUser: { max: 6, window: 600 },
	replyPerUser: { max: 20, window: 600 }
};

/**
 * Count one hit against each `[name, id, { max, window }]` and return the
 * wait in seconds if any is over its limit, or 0 when all are fine. A
 * missing id (no address, signed out) skips that check.
 */
export async function overLimit(...checks) {
	const results = await Promise.all(
		checks.map(([name, id, { max, window }]) => hit(name, id, max, window))
	);
	return results.reduce((wait, r) => (r.ok ? wait : Math.max(wait, r.retryAfter)), 0);
}

/** Minutes, rounded up, for "try again in N minutes". */
export function minutes(seconds) {
	const n = Math.max(1, Math.ceil(seconds / 60));
	return n === 1 ? 'a minute' : `${n} minutes`;
}

/** The caller's address, or null when the platform doesn't say. */
export function clientIp(getClientAddress) {
	try {
		return getClientAddress();
	} catch {
		return null;
	}
}
