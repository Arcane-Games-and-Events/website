import { setMuted } from '$lib/server/courses/discussion.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** POST { userId, muted }: mute or unmute a student in this course's discussion. */
export async function POST({ params, request, locals }) {
	const course = await requireCourse(locals, params.id);
	const { userId, muted } = await body(request);
	return respond(async () => {
		await setMuted(course, userId, locals.user, !!muted);
		await logActivity(course.id, locals.user, muted ? 'student_muted' : 'student_unmuted', {
			data: { userId }
		});
		return { ok: true };
	});
}
