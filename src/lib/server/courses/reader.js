/**
 * The public side of a course, for one person: which version of the course
 * they see (the teacher previews drafts), whether they're enrolled, and what
 * each topic is to them (open, Premium-locked, locked, or done).
 */
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskLesson } from '$lib/server/db/schema.js';
import { cached } from '$lib/server/cache/index.js';
import { canEditCourses } from '$lib/server/auth/roles.js';
import { getCourseWithDrafts, getPublishedCourseBySlug } from '$lib/server/desk/courses.js';
import { canManageCourse, enrollmentFor, lessonAccess } from './access.js';
import { completedIn } from './progress.js';

/**
 * @returns {Promise<null | { course: any, owner: boolean, enrollment: any, completed: Set<string>,
 *   syllabus: any[], topics: any[] }>}
 *   `topics` is the syllabus flattened in reading order, each with `access`
 *   ('open' | 'locked-premium' | 'locked') and `done`.
 */
export async function courseForReader(slug, user) {
	let course = await getPublishedCourseBySlug(slug);
	let owner = false;
	if (user && canEditCourses(user)) {
		const draft = await getCourseWithDrafts(slug);
		if (draft && canManageCourse(user, draft)) {
			course = draft;
			owner = true;
		}
	}
	if (!course) return null;
	const enrollment = owner ? null : await enrollmentFor(user?.id, course.id);
	// An unlisted course is only for the students who already have it.
	if (course.status === 'archived' && !owner && !enrollment) return null;
	const completed = await completedIn(user?.id, course.id);

	let n = 0;
	const syllabus = course.syllabus.map((m) => ({
		...m,
		lessons: m.lessons.map((l) => ({
			...l,
			no: String(++n).padStart(2, '0'),
			access: lessonAccess(user, course, l, enrollment),
			done: completed.has(l.id)
		}))
	}));
	const topics = syllabus.flatMap((m) => m.lessons.map((l) => ({ ...l, sectionTitle: m.title })));
	return { course, owner, enrollment, completed, syllabus, topics };
}

/**
 * A topic's body. Published bodies are cached; the teacher's preview isn't,
 * and shows their pending changes (title too) on top of the live version.
 */
export async function topicBody(lesson, { fresh = false } = {}) {
	const read = async () => {
		const [row] = await db
			.select({
				body: deskLesson.body,
				readTime: deskLesson.readTime,
				...(fresh
					? {
							draftTitle: deskLesson.draftTitle,
							draftBody: deskLesson.draftBody,
							draftUpdatedAt: deskLesson.draftUpdatedAt
						}
					: {})
			})
			.from(deskLesson)
			.where(and(eq(deskLesson.id, lesson.id)))
			.limit(1);
		if (!row) return null;
		if (!fresh || !row.draftUpdatedAt) return { body: row.body, readTime: row.readTime };
		return {
			body: row.draftBody,
			readTime: row.readTime,
			title: row.draftTitle,
			pendingChanges: true
		};
	};
	if (fresh) return read();
	return cached(`courses:lesson:${lesson.id}`, read, { tags: ['courses'] });
}
