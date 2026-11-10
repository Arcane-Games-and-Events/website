import { setAgreement } from '$lib/server/courses/builder.js';
import { body, requireAdmin, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/**
 * PUT /api/desk/courses/[id]/agreement (admins):
 * { exclusive?, exclusivityStart?, exclusivityEnd?, autoRenew?, agreementStatus? }
 * The guide's Partner exclusivity agreement. Stored and shown; nothing enforces it.
 */
export async function PUT({ params, request, locals }) {
	requireAdmin(locals);
	const course = await requireCourse(locals, params.id);
	const b = await body(request);
	return respond(async () => {
		const updated = await setAgreement(course, b);
		await logActivity(course.id, locals.user, 'agreement_changed', {
			data: {
				exclusive: updated.exclusive,
				exclusivityStart: updated.exclusivityStart,
				exclusivityEnd: updated.exclusivityEnd,
				autoRenew: updated.autoRenew,
				agreementStatus: updated.agreementStatus
			}
		});
		return { course: updated };
	});
}
