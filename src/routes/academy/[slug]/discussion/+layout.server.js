import { error } from '@sveltejs/kit';
import { courseForReader } from '$lib/server/courses/reader.js';
import { discussionRole, listThreads } from '$lib/server/courses/discussion.js';
import { unreadThreads } from '$lib/server/courses/notifications.js';

/**
 * A course's discussion: the list of conversations beside whichever one is
 * open. Its students, its teacher and admins can read it. `?topic=` narrows
 * the list to one topic.
 */
export async function load({ params, url, locals, setHeaders, depends }) {
	depends('academy:discussion');
	// Reading notifications (opening a conversation, "Mark all read") changes
	// which conversations show as unread.
	depends('app:notifications');
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
	const [threads, unread] = await Promise.all([
		listThreads(course, locals.user, { lessonId: topic?.id ?? null }),
		unreadThreads(locals.user?.id, course.id).catch(() => ({}))
	]);
	return {
		...base,
		topic: topic ? { id: topic.id, slug: topic.slug, title: topic.title } : null,
		// Conversations with notifications you haven't read: how many new things.
		threads: threads.map((t) => ({ ...t, unread: unread[t.id] ?? 0 }))
	};
}
