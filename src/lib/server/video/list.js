/**
 * The Desk's Videos areas. Videos stay with what they were uploaded for, so
 * each area lists only its own: gameplay, articles (one video per entry),
 * and courses (a course's trailer and lesson videos, course by course).
 */
import { and, asc, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	vod,
	event,
	deskEntry,
	deskCourse,
	deskModule,
	deskLesson,
	user as userTable
} from '$lib/server/db/schema.js';
import { getMuxThumbnailToken } from '$lib/server/mux.js';
import {
	canEditAllEntries,
	canOverseeCourses,
	canUseClassroom,
	canUseStudio
} from '$lib/server/auth/roles.js';
import { videoOf } from './mux.js';
import { withCovers } from '$lib/server/studio/media.js';

const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || null;

export async function withThumb(video) {
	if (!video.playbackId) return { ...video, thumbToken: null };
	try {
		return { ...video, thumbToken: await getMuxThumbnailToken(video.playbackId) };
	} catch {
		return { ...video, thumbToken: null };
	}
}

/** Which areas a user can open. */
export function areasFor(user) {
	const all = canEditAllEntries(user);
	return {
		// Studio media (gameplay, episodes, interviews) is managed in the Studio.
		gameplay: canUseStudio(user),
		articles: all,
		// Course videos live in the Classroom: teachers see their own courses,
		// admins and editors every course.
		courses: canUseClassroom(user),
		allCourses: canOverseeCourses(user)
	};
}

/** Bonus gameplay, newest first. */
export async function listGameplay() {
	const rows = await db
		.select({ v: vod, eventTitle: event.title, circuit: event.circuit, month: event.month })
		.from(vod)
		.leftJoin(event, eq(vod.eventId, event.id))
		.orderBy(desc(vod.createdAt));
	const covered = await withCovers(rows.map((r) => r.v));
	const out = [];
	for (const [i, r] of rows.entries()) {
		out.push({
			...covered[i],
			event: r.v.eventId ? { title: r.eventTitle, circuit: r.circuit, month: r.month } : null,
			video: await withThumb(videoOf('vod', r.v))
		});
	}
	return out;
}

/** One entry per row: the entries that have an uploaded (Mux) video. */
export async function listArticleVideos() {
	const rows = await db
		.select({
			id: deskEntry.id,
			title: deskEntry.title,
			slug: deskEntry.slug,
			status: deskEntry.status,
			publishedAt: deskEntry.publishedAt,
			updatedAt: deskEntry.updatedAt,
			accessMode: deskEntry.accessMode,
			videoProvider: deskEntry.videoProvider,
			muxUploadId: deskEntry.muxUploadId,
			muxAssetId: deskEntry.muxAssetId,
			muxPlaybackId: deskEntry.muxPlaybackId,
			videoStatus: deskEntry.videoStatus,
			videoDuration: deskEntry.videoDuration,
			videoAspectRatio: deskEntry.videoAspectRatio,
			draftMeta: deskEntry.draftMeta,
			authorFirst: userTable.firstName,
			authorLast: userTable.lastName
		})
		.from(deskEntry)
		.leftJoin(userTable, eq(deskEntry.authorId, userTable.id))
		.where(eq(deskEntry.videoProvider, 'mux'))
		.orderBy(desc(deskEntry.updatedAt));
	const out = [];
	for (const r of rows) {
		out.push({
			id: r.id,
			title: r.title,
			slug: r.slug,
			status: r.status,
			publishedAt: r.publishedAt,
			updatedAt: r.updatedAt,
			premium: r.accessMode === 'premium',
			author: fullName({ firstName: r.authorFirst, lastName: r.authorLast }),
			// a writer's video change waiting for an editor or admin
			videoPending: !!r.draftMeta?.video,
			video: await withThumb(videoOf('entry', r))
		});
	}
	return out;
}

/** Courses the user may see, each with a count of its videos. */
export async function listCourses(user) {
	const { allCourses } = areasFor(user);
	const courses = await db
		.select()
		.from(deskCourse)
		.where(allCourses ? undefined : eq(deskCourse.authorId, user.id))
		.orderBy(desc(deskCourse.updatedAt));
	if (!courses.length) return [];
	const lessons = await db
		.select({
			courseId: deskLesson.courseId,
			videoProvider: deskLesson.videoProvider,
			videoStatus: deskLesson.videoStatus,
			videoDuration: deskLesson.videoDuration
		})
		.from(deskLesson)
		.where(
			and(
				inArray(
					deskLesson.courseId,
					courses.map((c) => c.id)
				),
				isNotNull(deskLesson.videoProvider)
			)
		);
	return courses.map((c) => {
		const ls = lessons.filter((l) => l.courseId === c.id && l.videoProvider === 'mux');
		const trailer = videoOf('trailer', c);
		const all = [
			...ls.map((l) => ({ status: l.videoStatus, duration: l.videoDuration })),
			...(trailer.provider === 'mux' ? [trailer] : [])
		];
		return {
			id: c.id,
			title: c.title,
			slug: c.slug,
			status: c.status,
			videos: all.length,
			seconds: all.reduce((s, v) => s + Number(v.duration || 0), 0),
			processing: all.filter((v) => v.status === 'waiting' || v.status === 'preparing').length,
			failed: all.filter((v) => v.status === 'errored').length
		};
	});
}

/** One course: its trailer and every lesson in module order, with videos. */
export async function courseVideos(courseId) {
	const [course] = await db.select().from(deskCourse).where(eq(deskCourse.id, courseId)).limit(1);
	if (!course) return null;
	const modules = await db
		.select()
		.from(deskModule)
		.where(eq(deskModule.courseId, courseId))
		.orderBy(asc(deskModule.position));
	const lessons = await db
		.select()
		.from(deskLesson)
		.where(eq(deskLesson.courseId, courseId))
		.orderBy(asc(deskLesson.position));
	const lessonRows = [];
	for (const l of lessons) {
		lessonRows.push({
			id: l.id,
			moduleId: l.moduleId,
			title: l.title,
			isPreview: l.isPreview,
			youtube: l.videoProvider === 'youtube' ? l.youtubeTitle || l.youtubeUrl : null,
			video: await withThumb(videoOf('lesson', l))
		});
	}
	return {
		course: {
			id: course.id,
			title: course.title,
			slug: course.slug,
			status: course.status,
			authorId: course.authorId
		},
		trailer: await withThumb(videoOf('trailer', course)),
		modules: modules.map((m) => ({
			id: m.id,
			title: m.title,
			lessons: lessonRows.filter((l) => l.moduleId === m.id)
		}))
	};
}
