import { error, json } from '@sveltejs/kit';
import { markSeen } from '$lib/server/courses/notifications.js';

/**
 * POST { path }: the signed-in user opened this page. Marks read whatever
 * they hadn't read that links to it, and returns their unread counts for
 * the header badge.
 */
export async function POST({ request, locals }) {
	if (!locals.user) error(401, 'Sign in first.');
	const { path } = await request.json().catch(() => ({}));
	if (typeof path !== 'string' || !path.startsWith('/') || path.length > 300)
		error(400, 'Which page?');
	return json(await markSeen(locals.user.id, path));
}
