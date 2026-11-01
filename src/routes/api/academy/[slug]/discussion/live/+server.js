import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/courses/http.js';
import { liveAccess } from '$lib/server/courses/liveAccess.js';
import { liveState } from '$lib/server/courses/live.js';

/**
 * GET: the discussion's version (it moves whenever anything in it changes)
 * and who's typing where. Open discussion pages poll this and fetch the
 * discussion again only when the version moves.
 */
export async function GET({ params, locals, setHeaders }) {
	const user = requireUser(locals);
	const access = await liveAccess(user, params.slug);
	if (!access.read) error(403, 'The discussion is for the course’s students.');
	setHeaders({ 'cache-control': 'private, no-store' });
	return json(await liveState(access.courseId, user.id));
}
