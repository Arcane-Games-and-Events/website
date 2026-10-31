import { error } from '@sveltejs/kit';
import { courseForReader } from '$lib/server/courses/reader.js';
import { getThread } from '$lib/server/courses/discussion.js';
import { CourseError } from '$lib/server/courses/builder.js';

/** One discussion thread with its replies. */
export async function load({ params, locals, setHeaders, depends }) {
	depends('academy:thread');
	setHeaders({ 'cache-control': 'private, no-store' });
	const r = await courseForReader(params.slug, locals.user);
	if (!r) error(404, 'Course not found');
	try {
		const t = await getThread(r.course, locals.user, params.threadId);
		return {
			course: { id: r.course.id, slug: r.course.slug, title: r.course.title },
			...t
		};
	} catch (err) {
		if (err instanceof CourseError) error(err.status === 401 ? 403 : err.status, err.message);
		throw err;
	}
}
