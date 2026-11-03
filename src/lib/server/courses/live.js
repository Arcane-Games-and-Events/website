/**
 * What lets an open discussion keep itself up to date without a reload.
 *
 * - Every change to a course's discussion (`touch`) is broadcast on the
 *   course's live channel (Supabase Realtime, $lib/server/realtime.js), so
 *   open pages fetch the discussion again straight away. Typing and who's
 *   here travel between browsers on the same channel.
 * - When live updates are off or a page can't connect, it falls back to
 *   polling: a counter per course that every change moves. Pages poll it
 *   (`liveState`) and fetch the discussion again only when it has moved, so
 *   a quiet poll costs one Redis round trip.
 * - Who's typing in which conversation (`setTyping`), forgotten a few
 *   seconds after their last keystroke.
 *
 * Kept in Redis when it's set up, so every server instance agrees; in this
 * process's memory otherwise (local dev and tests). Never throws: a failure
 * only delays what other people see.
 */
import { k, redis } from '$lib/server/cache/index.js';
import { courseTopic, publish } from '$lib/server/realtime.js';

/** How long someone counts as typing after their last keystroke, in ms. */
export const TYPING_MS = 6000;

const g = /** @type {any} */ (globalThis);
const mem = g.__ageDiscussionLive ?? (g.__ageDiscussionLive = { v: new Map(), typing: new Map() });

const vKey = (courseId) => k(`disc:v:${courseId}`);
const tKey = (courseId) => k(`disc:typing:${courseId}`);

/**
 * Something in a course's discussion changed.
 * @param {string} courseId
 * @param {{ kind?: string, postId?: string, threadId?: string, userId?: string }} [what]
 *   what changed, for the live channel (ids only)
 */
export async function touch(courseId, what = {}) {
	await publish(courseTopic(courseId), 'changed', what);
	const r = redis();
	if (!r) {
		mem.v.set(courseId, (mem.v.get(courseId) ?? 0) + 1);
		return;
	}
	try {
		const p = r.pipeline();
		p.incr(vKey(courseId));
		p.expire(vKey(courseId), 60 * 60 * 24 * 30);
		await p.exec();
	} catch (err) {
		console.warn('[discussion] live touch failed:', err.message);
	}
}

/**
 * `user` is typing in thread `threadId` (or has stopped: `on` false, as when
 * they send).
 * @param {string} courseId
 * @param {string} threadId
 * @param {{ id: string, firstName?: string, lastName?: string }} user
 */
export async function setTyping(courseId, threadId, user, on = true) {
	const value = { t: threadId, n: user.firstName || 'Someone', at: Date.now() };
	const r = redis();
	if (!r) {
		const m = mem.typing.get(courseId) ?? new Map();
		if (on) m.set(user.id, value);
		else m.delete(user.id);
		mem.typing.set(courseId, m);
		return;
	}
	try {
		if (!on) {
			await r.hdel(tKey(courseId), user.id);
			return;
		}
		const p = r.pipeline();
		p.hset(tKey(courseId), { [user.id]: JSON.stringify(value) });
		p.expire(tKey(courseId), 60);
		await p.exec();
	} catch (err) {
		console.warn('[discussion] typing failed:', err.message);
	}
}

/**
 * The course's discussion version and who's typing where, leaving out the
 * viewer.
 * @returns {Promise<{ v: number, typing: { thread: string, name: string }[] }>}
 */
export async function liveState(courseId, viewerId) {
	const now = Date.now();
	/** @param {[string, any][]} entries */
	const typers = (entries) =>
		entries
			.map(([id, raw]) => [id, typeof raw === 'string' ? JSON.parse(raw) : raw])
			.filter(([id, x]) => id !== viewerId && x && now - x.at < TYPING_MS)
			.map(([, x]) => ({ thread: x.t, name: x.n }));
	const r = redis();
	if (!r) {
		return {
			v: mem.v.get(courseId) ?? 0,
			typing: typers([...(mem.typing.get(courseId) ?? new Map()).entries()])
		};
	}
	try {
		const p = r.pipeline();
		p.get(vKey(courseId));
		p.hgetall(tKey(courseId));
		const [v, all] = await p.exec();
		return { v: Number(v ?? 0), typing: typers(Object.entries(all ?? {})) };
	} catch (err) {
		console.warn('[discussion] live read failed:', err.message);
		return { v: -1, typing: [] };
	}
}
