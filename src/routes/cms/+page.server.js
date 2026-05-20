import { redirect } from '@sveltejs/kit';

export const load = async ({ parent }) => {
	const { canEditArticles, canEditCourses } = await parent();
	// Send users to whichever section they can access. If they can do both,
	// articles is the more common starting point.
	if (canEditArticles) throw redirect(302, '/cms/articles');
	if (canEditCourses) throw redirect(302, '/cms/courses');
	throw redirect(302, '/');
};
