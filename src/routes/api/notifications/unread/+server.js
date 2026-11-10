import { error, json } from '@sveltejs/kit';
import { cachedUnreadCount } from '$lib/server/courses/notifications.js';
import { cachedMessageCounts } from '$lib/server/contact/inbox.js';

/**
 * GET: the signed-in user's unread counts, { learning, classroom,
 * messages, inbox }. The
 * header badge asks for them when a live update says they changed.
 */
export async function GET({ locals, setHeaders }) {
	if (!locals.user) error(401, 'Sign in first.');
	setHeaders({ 'cache-control': 'private, no-store' });
	const [notes, contact] = await Promise.all([
		cachedUnreadCount(locals.user.id),
		cachedMessageCounts(locals.user)
	]);
	return json({ ...notes, ...contact });
}
