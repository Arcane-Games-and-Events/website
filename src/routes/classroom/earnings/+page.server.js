import { error } from '@sveltejs/kit';
import { isTeacher } from '$lib/server/auth/roles.js';
import {
	expectedPayouts,
	ledgerDetail,
	teacherStatements
} from '$lib/server/partner/statements.js';
import { ensureTeacherCode, teacherReferrals } from '$lib/server/partner/referrals.js';

/**
 * Classroom → Earnings: a teacher's level, monthly statements and referral
 * link, under the AGE Partner terms. Refunds are on Classroom → Refunds.
 */
export const load = async ({ locals, url }) => {
	if (!isTeacher(locals.user)) throw error(403, 'Only teachers have earnings.');
	const teacherId = locals.user.id;
	const [statements, code, referrals, expected, detail] = await Promise.all([
		teacherStatements(teacherId),
		ensureTeacherCode(locals.user),
		teacherReferrals(teacherId),
		expectedPayouts({ teacherId }),
		ledgerDetail({ teacherId })
	]);
	return {
		partner: {
			...statements,
			code: code?.code || null,
			link: code ? `${url.origin}/premium?ref=${code.code}` : null,
			referrals,
			expected,
			detail
		}
	};
};
