import { error, json } from '@sveltejs/kit';
import { cachedUnreadCount } from '$lib/server/courses/notifications.js';

/**
 * GET: the signed-in user's unread counts, { learning, classroom }. The
 * header badge asks for them when a live update says they changed.
 */
export async function GET({ locals, setHeaders }) {
	if (!locals.user) error(401, 'Sign in first.');
	setHeaders({ 'cache-control': 'private, no-store' });
	return json(await cachedUnreadCount(locals.user.id));
}
