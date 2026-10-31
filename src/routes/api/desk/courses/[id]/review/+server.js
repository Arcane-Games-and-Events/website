import { error } from '@sveltejs/kit';
import { canOverseeCourses } from '$lib/server/auth/roles.js';
import {
	approveCourse,
	readinessOf,
	returnToDraft,
	submitForReview
} from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** GET: what's missing before the course can be submitted. */
export async function GET({ params, locals }) {
	const course = await requireCourse(locals, params.id);
	return respond(async () => ({ problems: await readinessOf(course) }));
}

/**
 * POST /api/desk/courses/[id]/review
 * { action: 'submit' | 'withdraw' }       the teacher
 * { action: 'approve' | 'return', note }  an admin or editor
 */
export async function POST({ params, request, locals }) {
	const course = await requireCourse(locals, params.id);
	const { action, note } = await body(request);
	const admin = canOverseeCourses(locals.user);
	if ((action === 'approve' || action === 'return') && !admin)
		throw error(403, 'Only an admin or editor can review courses.');
	return respond(async () => {
		let updated;
		if (action === 'submit') updated = await submitForReview(course);
		else if (action === 'withdraw') updated = await returnToDraft(course);
		else if (action === 'approve') updated = await approveCourse(course);
		else if (action === 'return') updated = await returnToDraft(course, { note });
		else throw error(400, 'Unknown action');
		const kind = {
			submit: 'submitted',
			withdraw: 'withdrawn',
			approve: 'approved',
			return: 'returned'
		};
		await logActivity(course.id, locals.user, kind[action], {
			note: action === 'return' ? note : null
		});
		return { course: updated };
	});
}
