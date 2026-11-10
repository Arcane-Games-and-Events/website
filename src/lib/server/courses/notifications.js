/**
 * In-site notifications, in two kinds of place:
 *
 * - Learning (the student's My courses page, /my-courses): replies to your
 *   posts, teacher updates, new topics and removed posts.
 * - The Classroom (its home page, /classroom): what teachers, admins and
 *   editors need to know about the courses they run: a course sent for
 *   approval, approved or returned, unlisted or relisted by someone else,
 *   new students, new threads and flagged posts, payouts recorded,
 *   refund requests on their guides.
 *
 * Each has its own unread count in the header menu. Someone who runs a
 * course (its teacher, or an admin or editor) never hears about it in My
 * courses: a reply to them, or their post being removed, goes to the
 * Classroom instead, and course updates and new topics (news for students)
 * skip them.
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
import { publish, userTopic } from '$lib/server/realtime.js';
import { canManageCourse } from './access.js';

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
	'payout_paid',
	'refund_request',
	'course_reply',
	'course_post_removed'
];

/**
 * A student's notification about a course, as the people who run that
 * course get it: the Classroom's version, or null (not for them).
 */
/** Kinds where replies in one conversation share a notification until it's read. */
const GROUPED = new Set(['reply', 'course_reply']);

const FOR_RUNNERS = {
	reply: 'course_reply',
	post_removed: 'course_post_removed',
	course_update: null,
	new_topic: null
};
/**
 * Kinds no longer shown anywhere: each purchase used to notify the teacher
 * (new_student); the Classroom's updates are about running a course, so
 * sales live on Earnings instead. Old rows stay hidden in both places.
 */
const RETIRED_KINDS = ['new_student'];
const isClassroom = (kind) => CLASSROOM_KINDS.includes(kind);
const scopeWhere = (scope) =>
	scope === 'classroom'
		? inArray(
				notification.kind,
				CLASSROOM_KINDS.filter((k) => !RETIRED_KINDS.includes(k))
			)
		: scope === 'learning'
			? notInArray(notification.kind, CLASSROOM_KINDS)
			: undefined;

/**
 * Notifications about a post that's gone stop showing: the post was
 * deleted, its conversation was, or a moderator removed it (its author
 * still sees the removal notice).
 */
const KEEP_FOR_REMOVED = sql.raw(`('post_removed', 'course_post_removed')`);
const stillThere = sql`not exists (
	select 1 from course_post p
	left join course_post t on t.id = p.parent_id
	where p.id = ${notification.postId}
		and (
			p.deleted_at is not null
			or t.deleted_at is not null
			or ((p.status = 'removed' or t.status = 'removed')
				and ${notification.kind} not in ${KEEP_FOR_REMOVED})
		)
)`;

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
	// People who run the course get the Classroom's version (or nothing).
	const runners =
		n.courseId && n.kind in FOR_RUNNERS ? await courseRunners(n.courseId, ids, tx) : new Set();
	const rows = ids
		.map((userId) => ({
			userId,
			kind: runners.has(userId) ? FOR_RUNNERS[n.kind] : n.kind
		}))
		.filter((r) => r.kind);
	if (!rows.length) return 0;

	// Replies in one conversation share a notification until it's read: a new
	// one updates it (latest reply, who, how many) instead of adding another.
	const threadId = n.data?.threadId;
	/** @type {Map<string, any>} userId → their unread notification for this conversation */
	const open = new Map();
	if (threadId && rows.some((r) => GROUPED.has(r.kind))) {
		const existing = await tx
			.select({ id: notification.id, userId: notification.userId, data: notification.data })
			.from(notification)
			.where(
				and(
					inArray(
						notification.userId,
						rows.filter((r) => GROUPED.has(r.kind)).map((r) => r.userId)
					),
					inArray(notification.kind, [...GROUPED]),
					isNull(notification.readAt),
					sql`${notification.data} ->> 'threadId' = ${threadId}`
				)
			);
		for (const e of existing) if (!open.has(e.userId)) open.set(e.userId, e);
	}
	const now = new Date();
	for (const [userId, e] of open) {
		const actors = [...new Set([n.actorId, ...(e.data?.actorIds ?? [])].filter(Boolean))];
		await tx
			.update(notification)
			.set({
				postId: n.postId ?? null,
				actorId: n.actorId ?? null,
				createdAt: now,
				data: { ...e.data, threadId, count: (Number(e.data?.count) || 1) + 1, actorIds: actors }
			})
			.where(and(eq(notification.id, e.id), eq(notification.userId, userId)));
	}
	const fresh = rows.filter((r) => !open.has(r.userId));
	if (fresh.length)
		await tx.insert(notification).values(
			fresh.map(({ userId, kind }) => ({
				userId,
				kind,
				courseId: n.courseId ?? null,
				lessonId: n.lessonId ?? null,
				postId: n.postId ?? null,
				actorId: n.actorId ?? null,
				data: threadId
					? { ...n.data, count: 1, actorIds: n.actorId ? [n.actorId] : [] }
					: (n.data ?? null)
			}))
		);
	const told = rows.map((r) => r.userId);
	await bump(...told.map(notesTag));
	// Their header badge, live in any open tab.
	await publish(told.map(userTopic), 'notes', { kind: n.kind });
	return told.length;
}

/** Which of these users run the course: its teacher, admins and editors (as canManageCourse). */
async function courseRunners(courseId, userIds, tx = db) {
	const [course] = await tx
		.select({ authorId: deskCourse.authorId })
		.from(deskCourse)
		.where(eq(deskCourse.id, courseId))
		.limit(1);
	const users = await tx
		.select({ id: userTable.id, role: userTable.role, additionalRoles: userTable.additionalRoles })
		.from(userTable)
		.where(inArray(userTable.id, userIds));
	return new Set(
		users.filter((u) => canManageCourse(u, { authorId: course?.authorId })).map((u) => u.id)
	);
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
		.where(and(eq(notification.userId, userId), isNull(notification.readAt), stillThere));
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
 * @param {{ limit?: number, scope?: 'learning' | 'classroom' | 'all', unreadOnly?: boolean }} [opts]
 */
export async function listNotifications(
	userId,
	{ limit = 40, scope = 'all', unreadOnly = false } = {}
) {
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
		.where(
			and(
				eq(notification.userId, userId),
				scopeWhere(scope),
				stillThere,
				unreadOnly ? isNull(notification.readAt) : undefined
			)
		)
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
	if (r.kind === 'refund_request') return '/classroom/refunds';
	if (!r.courseId) return '/classroom';
	const base = `/classroom/courses/${r.courseId}`;
	if (r.kind === 'course_submitted') return `${base}/review`;
	if ((r.kind === 'new_thread' || r.kind === 'course_reply') && r.threadId && r.courseSlug)
		return `/academy/${r.courseSlug}/discussion/${r.threadId}`;
	if (r.kind === 'post_flagged' || r.kind === 'course_post_removed') return `${base}/discussion`;
	if (r.kind === 'new_student') return `${base}/students`;
	return base;
}

/**
 * Mark some (or, with no ids, all in a scope, or all about one course) of a
 * user's notifications read.
 * @param {string} userId
 * @param {string[] | null} [ids]
 * @param {'learning' | 'classroom' | 'all'} [scope]
 */
export async function markRead(userId, ids = null, scope = 'all', { courseId = null } = {}) {
	const where = [eq(notification.userId, userId), isNull(notification.readAt)];
	if (ids?.length) where.push(inArray(notification.id, ids));
	else if (courseId) where.push(eq(notification.courseId, courseId));
	else if (scopeWhere(scope)) where.push(/** @type {any} */ (scopeWhere(scope)));
	await db
		.update(notification)
		.set({ readAt: new Date() })
		.where(and(...where));
	await bump(notesTag(userId));
	// Clears the badge in their other tabs too.
	await publish(userTopic(userId), 'notes', { read: true });
}

/**
 * Posts were deleted or removed: the people notified about them (or about
 * replies in them) get their badge counts again. The notifications
 * themselves stop showing on their own (see `stillThere`).
 * @param {string[]} postIds
 */
export async function postsGone(postIds) {
	if (!postIds.length) return;
	const rows = await db
		.selectDistinct({ userId: notification.userId })
		.from(notification)
		.leftJoin(coursePost, eq(notification.postId, coursePost.id))
		.where(or(inArray(notification.postId, postIds), inArray(coursePost.parentId, postIds)));
	const ids = rows.map((r) => r.userId);
	if (!ids.length) return;
	await bump(...ids.map(notesTag));
	await publish(ids.map(userTopic), 'notes', { gone: true });
}

/**
 * The conversations in a course this user has unread notifications about
 * (replies, new conversations, teacher updates), with how many new things
 * each holds. The discussion list marks them; reading the notifications
 * (opening the conversation, "Mark all read") clears them.
 * @returns {Promise<Record<string, number>>} threadId → count
 */
export async function unreadThreads(userId, courseId) {
	if (!userId || !courseId) return {};
	const rows = await db
		.select({
			threadId: sql`coalesce(${coursePost.parentId}, ${coursePost.id})`,
			n: sql`sum(coalesce((${notification.data} ->> 'count')::int, 1))::int`
		})
		.from(notification)
		.innerJoin(coursePost, eq(notification.postId, coursePost.id))
		.where(
			and(
				eq(notification.userId, userId),
				eq(notification.courseId, courseId),
				isNull(notification.readAt),
				stillThere
			)
		)
		.groupBy(sql`coalesce(${coursePost.parentId}, ${coursePost.id})`);
	return Object.fromEntries(rows.map((r) => [String(r.threadId), Number(r.n) || 1]));
}

/** "/a/b/" and "/a/b" are the same page. */
const samePath = (a, b) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

/**
 * The user opened `path`: whatever they hadn't read that links there (a
 * reply's conversation, a new topic, their course's review page…) is read
 * now, however they got there.
 * @returns {Promise<{ marked: number, counts: { learning: number, classroom: number } }>}
 */
export async function markSeen(userId, path) {
	// Nothing unread (the usual case): just the counts, from the cache.
	const before = await cachedUnreadCount(userId);
	if (!before.learning && !before.classroom) return { marked: 0, counts: before };
	const unread = await listNotifications(userId, { limit: 100, unreadOnly: true });
	const ids = unread.filter((n) => samePath(n.href, path)).map((n) => n.id);
	if (ids.length) await markRead(userId, ids);
	return { marked: ids.length, counts: await unreadCounts(userId) };
}

/** Everyone who oversees courses: admins and editors. */
/** Every admin (refunds and money are theirs, not editors'). */
export async function adminIds() {
	const rows = await db
		.select({ id: userTable.id })
		.from(userTable)
		.where(eq(userTable.role, 'admin'));
	return rows.map((r) => r.id);
}

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
