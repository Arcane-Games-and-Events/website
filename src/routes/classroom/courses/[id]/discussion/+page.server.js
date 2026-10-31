import { mutedStudents, recentThreads, reviewQueue } from '$lib/server/courses/discussion.js';

/** The teacher's view of the course discussion. The layout checked access. */
export const load = async ({ params, parent, depends }) => {
	depends('desk:discussion');
	await parent();
	const [queue, threads, muted] = await Promise.all([
		reviewQueue([params.id]),
		recentThreads(params.id),
		mutedStudents(params.id)
	]);
	return { queue, threads, muted };
};
