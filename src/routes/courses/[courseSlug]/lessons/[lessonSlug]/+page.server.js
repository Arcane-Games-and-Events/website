import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	cmsCourse,
	cmsModule,
	cmsLesson,
	cmsLessonProgress,
	user as userTable
} from '$lib/server/db/schema.js';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { hasCourseAccess } from '$lib/server/cms/course-access.js';
import { resolveCardImages } from '$lib/server/cards/index.js';
import { extractCardNamesFromLexical } from '$lib/cms/render/lexical-utils.js';

export async function load({ params, locals, setHeaders }) {
	const [course] = await db
		.select()
		.from(cmsCourse)
		.where(eq(cmsCourse.slug, params.courseSlug))
		.limit(1);
	if (!course || course.status !== 'published') throw error(404, 'Course not found');

	const modules = await db
		.select()
		.from(cmsModule)
		.where(eq(cmsModule.courseId, course.id))
		.orderBy(asc(cmsModule.position));
	if (modules.length === 0) throw error(404, 'No lessons in this course yet');

	const moduleIds = modules.map((m) => m.id);
	const allLessons = await db
		.select()
		.from(cmsLesson)
		.where(inArray(cmsLesson.moduleId, moduleIds))
		.orderBy(asc(cmsLesson.position));

	const lesson = allLessons.find((l) => l.slug === params.lessonSlug);
	if (!lesson) throw error(404, 'Lesson not found');

	const access = await hasCourseAccess(locals.user, course);
	const canWatch = access || lesson.isPreview;
	if (!canWatch) {
		// Send unauthenticated/unbought users back to landing
		throw redirect(302, `/courses/${course.slug}`);
	}

	// Resolve card images for any `card:` links inside the lesson body
	const cardNames = lesson.body ? extractCardNamesFromLexical(lesson.body) : new Set();
	const cardImages = cardNames.size > 0 ? await resolveCardImages(cardNames) : {};

	// Build flat lesson list with module index for prev/next navigation
	const flat = [];
	for (let mi = 0; mi < modules.length; mi++) {
		const m = modules[mi];
		const ls = allLessons.filter((l) => l.moduleId === m.id);
		for (const l of ls) {
			flat.push({ moduleIndex: mi, moduleTitle: m.title, lesson: l });
		}
	}
	const flatIdx = flat.findIndex((x) => x.lesson.id === lesson.id);
	const prev = flat[flatIdx - 1] || null;
	const next = flat[flatIdx + 1] || null;

	// Resume position
	let progress = null;
	if (locals.user) {
		const [p] = await db
			.select()
			.from(cmsLessonProgress)
			.where(
				and(
					eq(cmsLessonProgress.userId, locals.user.id),
					eq(cmsLessonProgress.lessonId, lesson.id)
				)
			)
			.limit(1);
		progress = p || null;
	}

	const author = course.authorId
		? (await db
				.select({ firstName: userTable.firstName, lastName: userTable.lastName })
				.from(userTable)
				.where(eq(userTable.id, course.authorId))
				.limit(1))[0] || null
		: null;

	setHeaders({
		'cache-control': 'private, no-store',
		vary: 'Cookie'
	});

	return {
		course: { ...course, author: author ? { name: `${author.firstName} ${author.lastName || ''}`.trim() } : null },
		modules: modules.map((m) => ({
			...m,
			lessons: allLessons.filter((l) => l.moduleId === m.id)
		})),
		lesson,
		cardImages,
		prev,
		next,
		progress,
		hasAccess: access
	};
}
