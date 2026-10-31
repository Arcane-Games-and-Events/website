import { error } from '@sveltejs/kit';
import { courseForReader } from '$lib/server/courses/reader.js';
import { discussionRole, listThreads } from '$lib/server/courses/discussion.js';

/** A course's discussion board: its students, its teacher and admins. */
export async function load({ params, url, locals, setHeaders, depends }) {
	depends('academy:discussion');
	setHeaders({ 'cache-control': 'private, no-store' });
	const r = await courseForReader(params.slug, locals.user);
	if (!r) error(404, 'Course not found');
	const { course, topics } = r;
	const role = await discussionRole(locals.user, course);
	const base = {
		course: { id: course.id, slug: course.slug, title: course.title, price: course.price },
		topics: topics.map((t) => ({ id: t.id, slug: t.slug, title: t.title })),
		role: { read: role.read, post: role.post, moderate: role.moderate, muted: role.muted },
		signedIn: !!locals.user
	};
	if (!role.read) return { ...base, threads: [], topic: null };
	const topic = topics.find((t) => t.slug === url.searchParams.get('topic')) || null;
	return {
		...base,
		topic: topic ? { id: topic.id, slug: topic.slug, title: topic.title } : null,
		threads: await listThreads(course, locals.user, { lessonId: topic?.id ?? null })
	};
}
