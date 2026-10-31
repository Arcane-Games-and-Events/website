import { addStudent, listStudents, rosterCsv } from '$lib/server/courses/roster.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** GET ?format=csv: the roster as a spreadsheet. */
export async function GET({ params, url, locals }) {
	const course = await requireCourse(locals, params.id);
	const students = await listStudents(course.id);
	if (url.searchParams.get('format') === 'csv') {
		return new Response(rosterCsv(students), {
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="${course.slug}-students.csv"`
			}
		});
	}
	return respond(async () => ({ students }));
}

/** POST { email }: add someone free. */
export async function POST({ params, request, locals }) {
	const course = await requireCourse(locals, params.id);
	const { email } = await body(request);
	return respond(async () => {
		const enrollment = await addStudent(course, email, locals.user);
		await logActivity(course.id, locals.user, 'student_added', {
			data: {
				userId: enrollment.userId,
				email: String(email || '')
					.trim()
					.toLowerCase()
			}
		});
		return { enrollment };
	});
}
