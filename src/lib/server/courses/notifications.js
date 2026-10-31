/**
 * In-site notifications: replies to your posts, new threads in your course,
 * teacher updates, new topics, and removed posts. Shown on the student
 * My courses page (/my-courses) with an unread count in the header menu.
 */
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	coursePost,
	deskCourse,
	deskLesson,
	notification,
	user as userTable
} from '$lib/server/db/schema.js';
import { bump, cached } from '$lib/server/cache/index.js';

/** The cache tag for one user's unread count (read by the root layout on every page). */
const notesTag = (userId) => `notes:${userId}`;

/**
 * Notify each user once. The actor never notifies themselves.
 * @param {string[]} userIds
 * @param {{ kind: string, courseId?: string|null, lessonId?: string|null, postId?: string|null, actorId?: string|null, data?: any }} n
 */
export async function notify(userIds, n, { tx = db } = {}) {
	const ids = [...new Set(userIds.filter(Boolean))].filter((id) => id !== n.actorId);
	if (!ids.length) return 0;
	await tx.insert(notification).values(
		ids.map((userId) => ({
			userId,
			kind: n.kind,
			courseId: n.courseId ?? null,
			lessonId: n.lessonId ?? null,
			postId: n.postId ?? null,
			actorId: n.actorId ?? null,
			data: n.data ?? null
		}))
	);
	await bump(...ids.map(notesTag));
	return ids.length;
}

/** The unread count for the header, cached until the user's notifications change. */
export async function cachedUnreadCount(userId) {
	if (!userId) return 0;
	try {
		return await cached(`layout:user:${userId}:unread`, () => unreadCount(userId), {
			tags: [notesTag(userId)]
		});
	} catch {
		return 0;
	}
}

export async function unreadCount(userId) {
	if (!userId) return 0;
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(notification)
		.where(and(eq(notification.userId, userId), isNull(notification.readAt)));
	return Number(n) || 0;
}

/** Newest first, with what each one links to. */
export async function listNotifications(userId, { limit = 40 } = {}) {
	const rows = await db
		.select({
			id: notification.id,
			kind: notification.kind,
			createdAt: notification.createdAt,
			readAt: notification.readAt,
			data: notification.data,
			postId: notification.postId,
			lessonId: notification.lessonId,
			courseSlug: deskCourse.slug,
			courseTitle: deskCourse.title,
			lessonSlug: deskLesson.slug,
			lessonTitle: deskLesson.title,
			threadId: sql`coalesce(${coursePost.parentId}, ${coursePost.id})`,
			threadTitle: sql`(select p.title from course_post p where p.id = coalesce(${coursePost.parentId}, ${coursePost.id}))`,
			actorFirst: userTable.firstName,
			actorLast: userTable.lastName
		})
		.from(notification)
		.leftJoin(deskCourse, eq(notification.courseId, deskCourse.id))
		.leftJoin(deskLesson, eq(notification.lessonId, deskLesson.id))
		.leftJoin(coursePost, eq(notification.postId, coursePost.id))
		.leftJoin(userTable, eq(notification.actorId, userTable.id))
		.where(eq(notification.userId, userId))
		.orderBy(desc(notification.createdAt))
		.limit(limit);
	return rows.map((r) => ({
		id: r.id,
		kind: r.kind,
		createdAt: r.createdAt,
		unread: !r.readAt,
		data: r.data || {},
		course: r.courseSlug ? { slug: r.courseSlug, title: r.courseTitle } : null,
		lesson: r.lessonSlug ? { slug: r.lessonSlug, title: r.lessonTitle } : null,
		lessonId: r.lessonId || null,
		threadId: r.threadId || null,
		threadTitle: r.threadTitle || null,
		actor: r.actorFirst ? `${r.actorFirst} ${r.actorLast || ''}`.trim() : null,
		href: hrefFor(r)
	}));
}

function hrefFor(r) {
	if (!r.courseSlug) return '/my-courses';
	const base = `/academy/${r.courseSlug}`;
	if (r.kind === 'new_topic' && r.lessonSlug) return `${base}/${r.lessonSlug}`;
	if (r.threadId) return `${base}/discussion/${r.threadId}`;
	return base;
}

/** Mark some (or, with no ids, all) of a user's notifications read. */
export async function markRead(userId, ids = null) {
	const where = [eq(notification.userId, userId), isNull(notification.readAt)];
	if (ids?.length) where.push(inArray(notification.id, ids));
	await db
		.update(notification)
		.set({ readAt: new Date() })
		.where(and(...where));
	await bump(notesTag(userId));
}
