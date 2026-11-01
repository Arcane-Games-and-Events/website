/**
 * Who may watch a course's discussion live. Open pages ask every few
 * seconds, so the answer is kept on this server instance for a minute
 * (someone removed from a course stops seeing activity within that).
 */
import { courseBySlug } from './http.js';
import { discussionRole } from './discussion.js';

const TTL = 60_000;
const g = /** @type {any} */ (globalThis);
/** @type {Map<string, { exp: number, value: { courseId: string, read: boolean, post: boolean } }>} */
const seen = g.__ageLiveAccess ?? (g.__ageLiveAccess = new Map());

/** @returns {Promise<{ courseId: string, read: boolean, post: boolean }>} */
export async function liveAccess(user, slug) {
	const key = `${user.id}:${slug}`;
	const hit = seen.get(key);
	if (hit && hit.exp > Date.now()) return hit.value;
	const course = await courseBySlug(slug);
	const role = await discussionRole(user, course);
	const value = { courseId: course.id, read: role.read, post: role.post };
	if (seen.size > 5000) seen.clear();
	seen.set(key, { exp: Date.now() + TTL, value });
	return value;
}
