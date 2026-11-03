import { error, json } from '@sveltejs/kit';
import { realtimeToken } from '$lib/server/realtime.js';

/**
 * GET: a short-lived Realtime token for the signed-in user's browser, so it
 * can join its live channels (see $lib/server/realtime.js). 404 when live
 * updates are off, and the page carries on without them.
 */
export function GET({ locals, setHeaders }) {
	if (!locals.user) error(401, 'Sign in first.');
	const out = realtimeToken(locals.user);
	if (!out) error(404, 'Live updates are off.');
	setHeaders({ 'cache-control': 'private, no-store' });
	return json(out);
}
