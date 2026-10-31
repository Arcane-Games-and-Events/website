import { error } from '@sveltejs/kit';
import { isTeacher } from '$lib/server/auth/roles.js';
import { payDates, teacherEarnings } from '$lib/server/courses/earnings.js';

/** Classroom → Earnings: a teacher's sales, what's on hold, and their payouts. */
export const load = async ({ locals }) => {
	if (!isTeacher(locals.user)) throw error(403, 'Only teachers have earnings.');
	return {
		earnings: await teacherEarnings(locals.user.id),
		upcoming: payDates(new Date(), 4)
	};
};
