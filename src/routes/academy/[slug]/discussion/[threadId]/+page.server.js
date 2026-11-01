import { error } from '@sveltejs/kit';
import { courseForReader } from '$lib/server/courses/reader.js';
import { getThread } from '$lib/server/courses/discussion.js';
import { CourseError } from '$lib/server/courses/builder.js';

/** One conversation with its replies, open beside the list. */
export async function load({ params, locals, depends }) {
	depends('academy:thread');
	const r = await courseForReader(params.slug, locals.user);
	if (!r) error(404, 'Course not found');
	try {
		return { open: await getThread(r.course, locals.user, params.threadId) };
	} catch (err) {
		if (err instanceof CourseError) error(err.status === 401 ? 403 : err.status, err.message);
		throw err;
	}
}
