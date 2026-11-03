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
import { notifyClassroom } from '$lib/server/courses/notifications.js';

/** GET: what's missing before the course can be submitted. */
export async function GET({ params, locals }) {
	const course = await requireCourse(locals, params.id);
	return respond(async () => ({ problems: await readinessOf(course) }));
}

/**
 * POST /api/desk/courses/[id]/review
 * { action: 'submit', note? }             the teacher (note: for the reviewer)
 * { action: 'withdraw' }                  the teacher
 * { action: 'approve' | 'return', note }  an admin or editor
 *
 * Sending and withdrawing tell every admin and editor; approving and
 * returning tell the teacher.
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
		const text = note ? String(note).trim().slice(0, 2000) : null;
		await logActivity(course.id, locals.user, kind[action], {
			note: action === 'return' || action === 'submit' ? text : null
		});
		await notifyClassroom(updated, `course_${kind[action]}`, {
			actorId: locals.user.id,
			teacher: action === 'approve' || action === 'return',
			overseers: action === 'submit' || action === 'withdraw',
			data: text && action !== 'withdraw' ? { note: text } : null
		});
		return { course: updated };
	});
}
