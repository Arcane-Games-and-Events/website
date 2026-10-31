import { listStudents } from '$lib/server/courses/roster.js';

/** The class roster. The course layout already checked access. */
export const load = async ({ params, parent, depends }) => {
	depends('desk:roster');
	await parent();
	return { students: await listStudents(params.id) };
};
