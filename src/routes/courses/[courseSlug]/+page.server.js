import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsCourse, cmsModule, cmsLesson, user as userTable } from '$lib/server/db/schema.js';
import { eq, asc, inArray } from 'drizzle-orm';
import { hasCourseAccess } from '$lib/server/cms/course-access.js';

export async function load({ params, locals, setHeaders }) {
	const [row] = await db
		.select({
			id: cmsCourse.id,
			slug: cmsCourse.slug,
			title: cmsCourse.title,
			description: cmsCourse.description,
			price: cmsCourse.price,
			premiumDiscount: cmsCourse.premiumDiscount,
			trailerVideoId: cmsCourse.trailerVideoId,
			status: cmsCourse.status,
			publishedAt: cmsCourse.publishedAt,
			authorId: cmsCourse.authorId,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(cmsCourse)
		.leftJoin(userTable, eq(cmsCourse.authorId, userTable.id))
		.where(eq(cmsCourse.slug, params.courseSlug))
		.limit(1);

	if (!row || row.status !== 'published') throw error(404, 'Course not found');

	const modules = await db
		.select()
		.from(cmsModule)
		.where(eq(cmsModule.courseId, row.id))
		.orderBy(asc(cmsModule.position));

	const moduleIds = modules.map((m) => m.id);
	let lessons = [];
	if (moduleIds.length) {
		lessons = await db
			.select({
				id: cmsLesson.id,
				moduleId: cmsLesson.moduleId,
				slug: cmsLesson.slug,
				title: cmsLesson.title,
				videoDuration: cmsLesson.videoDuration,
				isPreview: cmsLesson.isPreview,
				readTime: cmsLesson.readTime,
				position: cmsLesson.position
			})
			.from(cmsLesson)
			.where(inArray(cmsLesson.moduleId, moduleIds))
			.orderBy(asc(cmsLesson.position));
	}

	const course = {
		...row,
		author: row.authorFirstName
			? { name: `${row.authorFirstName} ${row.authorLastName || ''}`.trim() }
			: null
	};
	const tree = modules.map((m) => ({
		...m,
		lessons: lessons.filter((l) => l.moduleId === m.id)
	}));

	const hasAccess = await hasCourseAccess(locals.user, course);

	setHeaders({
		'cache-control': 'private, no-store',
		vary: 'Cookie'
	});

	return { course, modules: tree, hasAccess };
}
