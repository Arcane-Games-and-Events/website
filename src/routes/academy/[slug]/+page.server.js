import { error } from '@sveltejs/kit';
import { getPublishedCourseBySlug, listPublishedCourses } from '$lib/server/cms/courses.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';

export async function load({ params, locals, setHeaders }) {
	const course = await getPublishedCourseBySlug(params.slug);
	if (!course) error(404, 'Course not found');

	setHeaders({
		'cache-control': locals.user
			? 'private, no-store'
			: 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
		vary: 'Cookie'
	});

	const all = await listPublishedCourses({ limit: 12 }).catch(() => []);
	const related = all.filter((c) => c.slug !== course.slug).slice(0, 3);

	return { course, related, isPremiumMember: userHasPremiumAccess(locals.user) };
}
