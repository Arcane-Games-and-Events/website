import { mutedStudents, recentThreads, reviewQueue } from '$lib/server/courses/discussion.js';
import { unreadThreads } from '$lib/server/courses/notifications.js';

/** The teacher's view of the course discussion. The layout checked access. */
export const load = async ({ params, parent, depends, locals }) => {
	depends('desk:discussion');
	// Reading notifications changes which threads show as unread.
	depends('app:notifications');
	await parent();
	const [queue, threads, muted, unread] = await Promise.all([
		reviewQueue([params.id]),
		recentThreads(params.id, { limit: 500 }),
		mutedStudents(params.id),
		unreadThreads(locals.user?.id, params.id).catch(() => ({}))
	]);
	// Threads with notifications you haven't read: how many new things.
	return { queue, threads: threads.map((t) => ({ ...t, unread: unread[t.id] ?? 0 })), muted };
};
