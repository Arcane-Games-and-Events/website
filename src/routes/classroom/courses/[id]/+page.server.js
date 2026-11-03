import { courseStatus } from '$lib/server/courses/oversight.js';

/**
 * A course's Overview, for its teacher and for admins and editors: where it
 * stands, the checklist, what's open, students (and money, for the teacher
 * and admins), every topic's state and the course's history.
 */
export const load = async ({ parent, depends }) => {
	depends('desk:course');
	const { course, money, ownsIt } = await parent();
	const status = await courseStatus(course);
	// Editors oversee courses but not their money.
	if (!money && !ownsIt) status.money = null;
	return { status };
};
