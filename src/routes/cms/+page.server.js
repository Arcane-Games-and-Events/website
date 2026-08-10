import { redirect } from '@sveltejs/kit';

/**
 * /cms lands on whichever section the caller can access.
 * Writers + creators both → entries is the more common starting point.
 * Neither → the layout guard already bounced them, so we never see this case.
 */
export const load = async ({ parent }) => {
	const { canEditEntries, canEditCourses } = await parent();
	if (canEditEntries) throw redirect(302, '/cms/entries');
	if (canEditCourses) throw redirect(302, '/cms/courses');
	throw redirect(302, '/');
};
