/**
 * In-site notifications, in two kinds of place:
 *
 * - Learning (the student's My courses page, /my-courses): replies to your
 *   posts, teacher updates, new topics and removed posts.
 * - The Classroom (its home page, /classroom): what teachers, admins and
 *   editors need to know about the courses they run: a course sent for
 *   approval, approved or returned, unlisted or relisted by someone else,
 *   new students, new threads and flagged posts, payouts recorded.
 *
 * Each has its own unread count in the header menu.
 */
import { and, desc, eq, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	coursePost,
	deskCourse,
	deskLesson,
	notification,
	user as userTable
} from '$lib/server/db/schema.js';
import { bump, cached } from '$lib/server/cache/index.js';

/** Kinds that belong in the Classroom rather than My courses. */
export const CLASSROOM_KINDS = [
	'new_thread',
	'post_flagged',
	'course_submitted',
	'course_withdrawn',
	'course_approved',
	'course_returned',
	'course_unlisted',
	'course_listed',
	'new_student',
	'payout_paid'
];
const isClassroom = (kind) => CLASSROOM_KINDS.includes(kind);
const scopeWhere = (scope) =>
	scope === 'classroom'
		? inArray(notification.kind, CLASSROOM_KINDS)
		: scope === 'learning'
			? notInArray(notification.kind, CLASSROOM_KINDS)
			: undefined;

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

/**
 * The unread counts for the header (My courses and the Classroom), cached
 * until the user's notifications change.
 * @returns {Promise<{ learning: number, classroom: number }>}
 */
export async function cachedUnreadCount(userId) {
	if (!userId) return { learning: 0, classroom: 0 };
	try {
		return await cached(`layout:user:${userId}:unread2`, () => unreadCounts(userId), {
			tags: [notesTag(userId)]
		});
	} catch {
		return { learning: 0, classroom: 0 };
	}
}

/** Unread notifications, split between My courses and the Classroom. */
export async function unreadCounts(userId) {
	if (!userId) return { learning: 0, classroom: 0 };
	const [row] = await db
		.select({
			classroom: sql`count(*) filter (where ${inArray(notification.kind, CLASSROOM_KINDS)})::int`,
			all: sql`count(*)::int`
		})
		.from(notification)
		.where(and(eq(notification.userId, userId), isNull(notification.readAt)));
	const classroom = Number(row?.classroom) || 0;
	return { learning: (Number(row?.all) || 0) - classroom, classroom };
}

/** @param {string} userId @param {'learning' | 'classroom' | 'all'} [scope] */
export async function unreadCount(userId, scope = 'all') {
	const c = await unreadCounts(userId);
	return scope === 'all' ? c.learning + c.classroom : c[scope];
}

/**
 * Newest first, with what each one links to.
 * @param {string} userId
 * @param {{ limit?: number, scope?: 'learning' | 'classroom' | 'all' }} [opts]
 */
export async function listNotifications(userId, { limit = 40, scope = 'all' } = {}) {
	const rows = await db
		.select({
			id: notification.id,
			kind: notification.kind,
			createdAt: notification.createdAt,
			readAt: notification.readAt,
			data: notification.data,
			postId: notification.postId,
			lessonId: notification.lessonId,
			courseId: notification.courseId,
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
		.where(and(eq(notification.userId, userId), scopeWhere(scope)))
		.orderBy(desc(notification.createdAt))
		.limit(limit);
	return rows.map((r) => ({
		id: r.id,
		kind: r.kind,
		createdAt: r.createdAt,
		unread: !r.readAt,
		data: r.data || {},
		course: r.courseSlug ? { id: r.courseId, slug: r.courseSlug, title: r.courseTitle } : null,
		lesson: r.lessonSlug ? { slug: r.lessonSlug, title: r.lessonTitle } : null,
		lessonId: r.lessonId || null,
		threadId: r.threadId || null,
		threadTitle: r.threadTitle || null,
		actor: r.actorFirst ? `${r.actorFirst} ${r.actorLast || ''}`.trim() : null,
		href: hrefFor(r)
	}));
}

function hrefFor(r) {
	if (isClassroom(r.kind)) return classroomHref(r);
	if (!r.courseSlug) return '/my-courses';
	const base = `/academy/${r.courseSlug}`;
	if (r.kind === 'new_topic' && r.lessonSlug) return `${base}/${r.lessonSlug}`;
	if (r.threadId) return `${base}/discussion/${r.threadId}`;
	return base;
}

/** Where a Classroom notification takes its reader. */
function classroomHref(r) {
	if (r.kind === 'payout_paid') return '/classroom/earnings';
	if (!r.courseId) return '/classroom';
	const base = `/classroom/courses/${r.courseId}`;
	if (r.kind === 'course_submitted') return `${base}/review`;
	if (r.kind === 'new_thread' && r.threadId && r.courseSlug)
		return `/academy/${r.courseSlug}/discussion/${r.threadId}`;
	if (r.kind === 'post_flagged') return `${base}/discussion`;
	if (r.kind === 'new_student') return `${base}/students`;
	return base;
}

/**
 * Mark some (or, with no ids, all in a scope) of a user's notifications read.
 * @param {string} userId
 * @param {string[] | null} [ids]
 * @param {'learning' | 'classroom' | 'all'} [scope]
 */
export async function markRead(userId, ids = null, scope = 'all') {
	const where = [eq(notification.userId, userId), isNull(notification.readAt)];
	if (ids?.length) where.push(inArray(notification.id, ids));
	else if (scopeWhere(scope)) where.push(/** @type {any} */ (scopeWhere(scope)));
	await db
		.update(notification)
		.set({ readAt: new Date() })
		.where(and(...where));
	await bump(notesTag(userId));
}

/** Everyone who oversees courses: admins and editors. */
export async function overseerIds() {
	const rows = await db
		.select({ id: userTable.id })
		.from(userTable)
		.where(or(eq(userTable.role, 'admin'), sql`'editor' = any(${userTable.additionalRoles})`));
	return rows.map((r) => r.id);
}

/**
 * Tell the people who run a course about something that happened to it:
 * its teacher, and (with `overseers`) every admin and editor. The person
 * who did it is never told. Never throws: a notification going missing must
 * not undo the action that caused it.
 * @param {{ id: string, authorId?: string|null, title?: string }} course
 * @param {string} kind  one of CLASSROOM_KINDS
 * @param {{ actorId?: string|null, teacher?: boolean, overseers?: boolean, postId?: string|null, lessonId?: string|null, data?: any }} [opts]
 */
export async function notifyClassroom(
	course,
	kind,
	{
		actorId = null,
		teacher = true,
		overseers = false,
		postId = null,
		lessonId = null,
		data = null
	} = {}
) {
	try {
		const to = [];
		if (teacher && course.authorId) to.push(course.authorId);
		if (overseers) to.push(...(await overseerIds()));
		return await notify(to, {
			kind,
			courseId: course.id,
			postId,
			lessonId,
			actorId,
			data: { title: course.title, ...(data || {}) }
		});
	} catch (err) {
		console.warn('[courses] classroom notification not sent:', kind, err?.message || err);
		return 0;
	}
}
