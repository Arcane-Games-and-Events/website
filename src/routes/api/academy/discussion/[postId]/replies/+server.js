import { reply } from '$lib/server/courses/discussion.js';
import { body, requireUser, respond } from '$lib/server/courses/http.js';

/** POST { body }: reply to a thread. */
export async function POST({ params, request, locals }) {
	const user = requireUser(locals);
	const b = await body(request);
	return respond(async () => {
		const post = await reply(params.postId, user, b);
		return { post: { id: post.id, status: post.status } };
	});
}
