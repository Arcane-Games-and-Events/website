import { POST_LIMITS, minutes, overLimit } from '$lib/server/ratelimit.js';
import { CourseError } from '$lib/server/courses/builder.js';
import { reply } from '$lib/server/courses/discussion.js';
import { body, requireUser, respond } from '$lib/server/courses/http.js';

/** POST { body }: reply to a thread. */
export async function POST({ params, request, locals }) {
	const user = requireUser(locals);
	const b = await body(request);
	return respond(async () => {
		const wait = await overLimit(['reply:u', user.id, POST_LIMITS.replyPerUser]);
		if (wait)
			throw new CourseError(429, `That’s a lot of replies at once. Try again in ${minutes(wait)}.`);
		const post = await reply(params.postId, user, b);
		return { post: { id: post.id, status: post.status } };
	});
}
