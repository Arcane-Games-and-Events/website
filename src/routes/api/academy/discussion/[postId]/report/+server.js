import { reportPost } from '$lib/server/courses/discussion.js';
import { body, requireUser, respond } from '$lib/server/courses/http.js';

/** POST { reason? }: report a post to the course's moderators. */
export async function POST({ params, request, locals }) {
	const user = requireUser(locals);
	const { reason } = await body(request);
	return respond(() => reportPost(params.postId, user, { reason }));
}
