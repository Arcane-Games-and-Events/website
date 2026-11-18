import { POST_LIMITS, minutes, overLimit } from '$lib/server/ratelimit.js';
import { CourseError } from '$lib/server/courses/builder.js';
import { createThread } from '$lib/server/courses/discussion.js';
import { body, courseBySlug, requireUser, respond } from '$lib/server/courses/http.js';

/** POST { title, body, lessonId? }: start a thread in a course's discussion. */
export async function POST({ params, request, locals }) {
	const user = requireUser(locals);
	const course = await courseBySlug(params.slug);
	const b = await body(request);
	return respond(async () => {
		const wait = await overLimit(['thread:u', user.id, POST_LIMITS.threadPerUser]);
		if (wait)
			throw new CourseError(
				429,
				`That’s a lot of new questions at once. Try again in ${minutes(wait)}.`
			);
		const post = await createThread(course, user, b);
		return { post: { id: post.id, status: post.status } };
	});
}
