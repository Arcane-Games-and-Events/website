/**
 * A guide's version history for its page: when it was last updated, and
 * the changelog (newest first). Every buyer gets every update.
 */
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { courseChangelog, deskLesson } from '$lib/server/db/schema.js';
import { cached } from '$lib/server/cache/index.js';

export async function guideUpdates(course, { limit = 20 } = {}) {
	const changelog = await cached(
		`courses:changelog:${course.id}`,
		() =>
			db
				.select({
					id: courseChangelog.id,
					kind: courseChangelog.kind,
					note: courseChangelog.note,
					at: courseChangelog.createdAt,
					topic: deskLesson.title
				})
				.from(courseChangelog)
				.leftJoin(deskLesson, eq(courseChangelog.lessonId, deskLesson.id))
				.where(eq(courseChangelog.courseId, course.id))
				.orderBy(desc(courseChangelog.createdAt))
				.limit(limit),
		{ tags: ['courses'] }
	);
	const lastUpdated =
		course.contentUpdatedAt || changelog[0]?.at || course.firstPublishedAt || null;
	return { lastUpdated, changelog };
}
