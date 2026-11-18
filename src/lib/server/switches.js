/**
 * Kill switches for launch traffic, set as environment variables (Vercel →
 * Settings → Environment Variables, then redeploy) — no code change needed.
 *
 * READ_ONLY=1
 *   Every change is turned away with a friendly 503 and a banner says so:
 *   forms, API writes, posts, checkouts. Still allowed: signing in and out,
 *   payment webhooks, scheduled jobs, and admins (so they can post a status
 *   update or fix things). For database trouble or a risky migration.
 *
 * DISCUSSION_POLLING=normal | slow | off
 *   How often open course discussions ask for news when live updates
 *   (Realtime) aren't connected. `slow` asks a quarter as often; `off` stops
 *   asking — people see new posts when they reload.
 */
import { env } from '$env/dynamic/private';

export function readOnly() {
	return env.READ_ONLY === '1' || env.READ_ONLY === 'true';
}

/** @returns {'normal' | 'slow' | 'off'} */
export function discussionPolling() {
	const v = (env.DISCUSSION_POLLING || '').toLowerCase();
	return v === 'slow' || v === 'off' ? v : 'normal';
}

/** Writes that still go through in read-only mode. */
const READ_ONLY_OPEN = ['/login', '/logout', '/api/webhooks/', '/api/cron/'];

/** True when this write should be turned away in read-only mode. */
export function blockedWrite(method, pathname, user) {
	if (!readOnly() || method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
	if (user?.role === 'admin') return false;
	return !READ_ONLY_OPEN.some((p) => pathname === p || pathname.startsWith(p));
}

export const READ_ONLY_MESSAGE =
	'AGE is read-only for a little while. You can browse and read, but changes are paused — please try again shortly.';
