import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskCourse } from '$lib/server/db/schema.js';
import { canOverseeCourses } from '$lib/server/auth/roles.js';
import { courseStatus, nextInQueue } from '$lib/server/courses/oversight.js';
import { mediaImagesById } from '$lib/server/media/library.js';

/**
 * Reviewing a course sent for approval (admins and editors): what students
 * would see first, the checklist and the nice-to-haves, the outline with
 * every topic, the teacher's note, and earlier returns.
 */
export const load = async ({ parent, locals, depends }) => {
	depends('desk:course');
	const { course } = await parent();
	if (!canOverseeCourses(locals.user)) throw error(403, 'Only admins and editors review courses.');
	const [status, images, next, waiting] = await Promise.all([
		courseStatus(course),
		mediaImagesById([course.coverImageId, course.thumbnailImageId]),
		nextInQueue(course.id),
		db
			.select({ id: deskCourse.id })
			.from(deskCourse)
			.where(eq(deskCourse.status, 'in_review'))
			.then((r) => r.length)
	]);
	const sent = status.events.find((e) => e.kind === 'submitted');
	return {
		cover: (course.coverImageId && images[course.coverImageId]) || null,
		thumbnail: (course.thumbnailImageId && images[course.thumbnailImageId]) || null,
		hasTrailer: !!(course.trailerMuxPlaybackId || course.trailerYoutubeVideoId),
		topics: status.topics,
		author: status.author,
		authorEmail: status.authorEmail,
		// What the teacher wrote when they sent it, and earlier rounds.
		sentNote: sent?.note || null,
		sentAt: course.submittedAt,
		returns: status.events.filter((e) => e.kind === 'returned' && e.note),
		next,
		waiting
	};
};
