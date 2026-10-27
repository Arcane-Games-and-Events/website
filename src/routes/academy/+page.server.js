import {
	listPublishedCourses,
	listPreviewLessons,
	loadCourseProgress
} from '$lib/server/cms/courses.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';

export async function load({ locals, setHeaders }) {
	const user = locals.user ?? null;
	// Signed-in visitors get their own progress, so their copy is private;
	// everyone else shares a short edge cache like the Library index.
	setHeaders({
		'cache-control': user
			? 'private, no-store'
			: 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
		vary: 'Cookie'
	});

	const [courses, previews, progress] = await Promise.all([
		listPublishedCourses({ limit: 100 }).catch((e) => {
			console.error('Academy: courses failed', e);
			return [];
		}),
		listPreviewLessons({ limit: 8 }).catch((e) => {
			console.error('Academy: previews failed', e);
			return [];
		}),
		loadCourseProgress(user?.id).catch((e) => {
			console.error('Academy: progress failed', e);
			return {};
		})
	]);

	return {
		courses,
		previews,
		progress,
		isPremiumMember: userHasPremiumAccess(user)
	};
}
