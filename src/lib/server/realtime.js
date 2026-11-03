/**
 * Live updates through Supabase Realtime (migration 040).
 *
 * The server tells open pages that something changed by broadcasting on a
 * private channel; the pages then fetch what they need through the site's
 * own checks. Messages carry ids and counts, never content.
 *
 *   user:<userId>      their notifications changed (the header badge)
 *   course:<courseId>  the course's discussion changed
 *   staff:<eventId>    a ticket was marked in GEM at the event
 *
 * Browsers join with a short-lived token signed here (`realtimeToken`,
 * served by /api/realtime/token). Who may join which channel is decided by
 * the policies in migration 040.
 *
 * Off unless REALTIME_ENABLED is "true" and the Supabase URL, service key,
 * JWT secret and public key are all set; pages then keep polling as before.
 * `publish` never throws: a missed live update only means a page catches
 * up a little later.
 */
import { createHmac } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

/** How long a browser's token lasts. The page asks for a new one before then. */
export const TOKEN_TTL_S = 60 * 60;
const SEND_TIMEOUT_MS = 1500;

const clean = (v) =>
	String(v ?? '')
		.trim()
		.replace(/^['"]|['"]$/g, '');

function config() {
	if (clean(env.REALTIME_ENABLED) !== 'true') return null;
	const url = clean(env.SUPABASE_URL).replace(/\/+$/, '');
	const serviceKey = clean(env.SUPABASE_SERVICE_ROLE_KEY);
	const jwtSecret = clean(env.SUPABASE_JWT_SECRET);
	const publicKey = clean(publicEnv.PUBLIC_SUPABASE_ANON_KEY);
	if (!url || !serviceKey || !jwtSecret || !publicKey) return null;
	return { url, serviceKey, jwtSecret, publicKey };
}

/** What the browser needs to connect, or null when live updates are off. */
export function realtimeClientConfig() {
	const c = config();
	return c ? { url: c.url, key: c.publicKey } : null;
}

const b64url = (v) =>
	Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

/**
 * A token for this user's browser: signed with the project's JWT secret,
 * as Supabase's own sign-in would, so Realtime knows who they are.
 * @param {{ id: string }} user
 * @returns {{ token: string, expiresAt: number } | null}
 */
export function realtimeToken(user, now = Date.now()) {
	const c = config();
	if (!c || !user?.id) return null;
	const iat = Math.floor(now / 1000);
	const exp = iat + TOKEN_TTL_S;
	const head = b64url({ alg: 'HS256', typ: 'JWT' });
	const body = b64url({ sub: user.id, role: 'authenticated', aud: 'authenticated', iat, exp });
	const sig = createHmac('sha256', c.jwtSecret).update(`${head}.${body}`).digest('base64url');
	return { token: `${head}.${body}.${sig}`, expiresAt: exp * 1000 };
}

/**
 * Where messages go: Realtime's broadcast endpoint, or (in tests) a fake.
 * @type {(messages: { topic: string, event: string, payload: any }[]) => Promise<void>}
 */
let sender = async (messages) => {
	const c = config();
	if (!c) return;
	const res = await fetch(`${c.url}/realtime/v1/api/broadcast`, {
		method: 'POST',
		headers: {
			apikey: c.serviceKey,
			authorization: `Bearer ${c.serviceKey}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({ messages: messages.map((m) => ({ ...m, private: true })) }),
		signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
	});
	if (!res.ok) throw new Error(`broadcast ${res.status}`);
};

/** Tests: send messages somewhere else (pass nothing to restore). */
export function setRealtimeSender(fn) {
	sender = fn ?? sender;
}

/**
 * Tell open pages something changed. Never throws.
 * @param {string | string[]} topics one topic, or the same event to several
 * @param {string} event
 * @param {Record<string, any>} [payload]
 */
export async function publish(topics, event, payload = {}) {
	const list = [...new Set([topics].flat().filter(Boolean))];
	if (!list.length) return;
	try {
		// One request for up to 100 topics at a time.
		for (let i = 0; i < list.length; i += 100)
			await sender(list.slice(i, i + 100).map((topic) => ({ topic, event, payload })));
	} catch (err) {
		console.warn('[realtime] publish failed:', /** @type {any} */ (err)?.message || err);
	}
}

export const userTopic = (userId) => `user:${userId}`;
export const courseTopic = (courseId) => `course:${courseId}`;
export const staffTopic = (eventId) => `staff:${eventId}`;
