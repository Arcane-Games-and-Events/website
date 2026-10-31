/**
 * Course discussion: threads and replies for a course's students, its
 * teacher and admins, with heavy moderation.
 *
 * - Every post and every edit runs through the filter (moderation/check.js).
 *   A student's post that trips it is held: only its author (marked
 *   "Waiting for review") and the course's moderators see it, and nobody is
 *   notified until a moderator approves it.
 * - Students can report a visible post. One report puts it in the review
 *   queue; three (from different students) hide it until it's reviewed.
 * - Moderators (the course's teacher and admins) approve or remove held and
 *   reported posts, remove and mute a student, pin and lock threads.
 *   Their own posts are checked but never held.
 * - Teacher updates are pinned threads that notify every student.
 */
import { and, asc, desc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import {
	courseEnrollment,
	coursePost,
	coursePostReport,
	deskCourse,
	deskLesson,
	user as userTable
} from '$lib/server/db/schema.js';
import { CourseError, reviewWhere } from './builder.js';
import { canManageCourse, enrollmentFor } from './access.js';
import { notify } from './notifications.js';
import { checkText, spamReasons } from './moderation/check.js';

const TITLE_MAX = 160;
const BODY_MAX = 5000;
/** Reports from this many different students hide a post until it's reviewed. */
export const HIDE_AT_REPORTS = 3;

const siteHost = () => {
	try {
		return new URL(env.PUBLIC_BASE_URL || '').hostname;
	} catch {
		return '';
	}
};

// ---------------------------------------------------------------- who

/**
 * What this person can do in a course's discussion.
 * @returns {Promise<{ read: boolean, post: boolean, moderate: boolean, enrollment: any, muted: boolean }>}
 */
export async function discussionRole(user, course) {
	if (!user) return { read: false, post: false, moderate: false, enrollment: null, muted: false };
	if (canManageCourse(user, course))
		return { read: true, post: true, moderate: true, enrollment: null, muted: false };
	const enrollment = await enrollmentFor(user.id, course.id);
	const muted = !!enrollment?.mutedAt;
	return { read: !!enrollment, post: !!enrollment && !muted, moderate: false, enrollment, muted };
}

async function requireRole(user, course, need) {
	const role = await discussionRole(user, course);
	if (!role[need]) {
		if (need === 'post' && role.muted)
			throw new CourseError(403, 'You’ve been muted in this course’s discussion.');
		throw new CourseError(user ? 403 : 401, 'Only the course’s students can take part.');
	}
	return role;
}

// ---------------------------------------------------------------- checks

async function moderate(user, course, text, { moderator }) {
	const recent = await db
		.select({ body: coursePost.body, createdAt: coursePost.createdAt })
		.from(coursePost)
		.where(
			and(
				eq(coursePost.authorId, user.id),
				gt(coursePost.createdAt, new Date(Date.now() - 3600000))
			)
		);
	const reasons = [...checkText(text, { siteHost: siteHost() }), ...spamReasons(text, { recent })];
	return { hold: reasons.length > 0 && !moderator, reasons };
}

const clean = (s, max) =>
	String(s || '')
		.replace(/\r\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
		.slice(0, max);

// ---------------------------------------------------------------- reading

const author = {
	authorId: coursePost.authorId,
	authorFirst: userTable.firstName,
	authorLast: userTable.lastName
};
const nameOf = (r) =>
	r.authorFirst ? `${r.authorFirst} ${r.authorLast || ''}`.trim() : 'Former student';

/** Rows a viewer may see: visible ones, their own held ones, and (moderators) all held ones. */
function visibleTo(viewer, moderator) {
	if (moderator) return inArray(coursePost.status, ['visible', 'held']);
	return or(
		eq(coursePost.status, 'visible'),
		and(eq(coursePost.status, 'held'), eq(coursePost.authorId, viewer?.id ?? ''))
	);
}

/** Threads newest-active first, pinned on top. `lessonId` narrows to one topic. */
export async function listThreads(course, viewer, { lessonId = null } = {}) {
	const role = await requireRole(viewer, course, 'read');
	const where = [
		eq(coursePost.courseId, course.id),
		isNull(coursePost.parentId),
		isNull(coursePost.deletedAt),
		visibleTo(viewer, role.moderate)
	];
	if (lessonId) where.push(eq(coursePost.lessonId, lessonId));
	const rows = await db
		.select({
			id: coursePost.id,
			kind: coursePost.kind,
			title: coursePost.title,
			body: coursePost.body,
			pinned: coursePost.pinned,
			locked: coursePost.locked,
			status: coursePost.status,
			createdAt: coursePost.createdAt,
			lastReplyAt: coursePost.lastReplyAt,
			lessonSlug: deskLesson.slug,
			lessonTitle: deskLesson.title,
			replies: sql`(select count(*)::int from course_post r where r.parent_id = ${coursePost.id} and r.status = 'visible' and r.deleted_at is null)`,
			...author
		})
		.from(coursePost)
		.leftJoin(userTable, eq(coursePost.authorId, userTable.id))
		.leftJoin(deskLesson, eq(coursePost.lessonId, deskLesson.id))
		.where(and(...where))
		.orderBy(
			desc(coursePost.pinned),
			desc(sql`coalesce(${coursePost.lastReplyAt}, ${coursePost.createdAt})`)
		)
		.limit(200);
	return rows.map((r) => ({
		...r,
		excerpt: r.body.slice(0, 220),
		body: undefined,
		author: nameOf(r),
		isTeacher: r.authorId === course.authorId,
		lesson: r.lessonSlug ? { slug: r.lessonSlug, title: r.lessonTitle } : null,
		mine: r.authorId === viewer.id
	}));
}

/** One thread and its replies, oldest reply first. */
export async function getThread(course, viewer, threadId) {
	const role = await requireRole(viewer, course, 'read');
	const rows = await db
		.select({
			id: coursePost.id,
			parentId: coursePost.parentId,
			kind: coursePost.kind,
			title: coursePost.title,
			body: coursePost.body,
			pinned: coursePost.pinned,
			locked: coursePost.locked,
			status: coursePost.status,
			flagReasons: coursePost.flagReasons,
			createdAt: coursePost.createdAt,
			editedAt: coursePost.editedAt,
			lessonSlug: deskLesson.slug,
			lessonTitle: deskLesson.title,
			...author
		})
		.from(coursePost)
		.leftJoin(userTable, eq(coursePost.authorId, userTable.id))
		.leftJoin(deskLesson, eq(coursePost.lessonId, deskLesson.id))
		.where(
			and(
				eq(coursePost.courseId, course.id),
				or(eq(coursePost.id, threadId), eq(coursePost.parentId, threadId)),
				isNull(coursePost.deletedAt),
				visibleTo(viewer, role.moderate)
			)
		)
		.orderBy(asc(coursePost.createdAt));
	const thread = rows.find((r) => r.id === threadId && !r.parentId);
	if (!thread) throw new CourseError(404, 'Thread not found.');
	const shape = (r) => ({
		id: r.id,
		kind: r.kind,
		title: r.title,
		body: r.body,
		status: r.status,
		flagReasons: role.moderate ? r.flagReasons : [],
		createdAt: r.createdAt,
		editedAt: r.editedAt,
		author: nameOf(r),
		authorId: role.moderate ? r.authorId : undefined,
		isTeacher: r.authorId === course.authorId,
		mine: r.authorId === viewer.id
	});
	return {
		thread: {
			...shape(thread),
			pinned: thread.pinned,
			locked: thread.locked,
			lesson: thread.lessonSlug ? { slug: thread.lessonSlug, title: thread.lessonTitle } : null
		},
		replies: rows.filter((r) => r.parentId).map(shape),
		role: { post: role.post && !thread.locked, moderate: role.moderate, muted: role.muted }
	};
}

// ---------------------------------------------------------------- writing

async function loadPost(postId) {
	const [post] = await db.select().from(coursePost).where(eq(coursePost.id, postId)).limit(1);
	if (!post || post.deletedAt) throw new CourseError(404, 'Post not found.');
	const [course] = await db
		.select()
		.from(deskCourse)
		.where(eq(deskCourse.id, post.courseId))
		.limit(1);
	return { post, course };
}

/** A new thread, optionally about one topic. */
export async function createThread(course, user, { title, body, lessonId = null }) {
	const role = await requireRole(user, course, 'post');
	const t = clean(title, TITLE_MAX);
	const b = clean(body, BODY_MAX);
	if (!t) throw new CourseError(400, 'Give your post a title.');
	if (!b) throw new CourseError(400, 'Write something first.');
	let lesson = null;
	if (lessonId) {
		[lesson] = await db
			.select({ id: deskLesson.id })
			.from(deskLesson)
			.where(and(eq(deskLesson.id, lessonId), eq(deskLesson.courseId, course.id)))
			.limit(1);
		if (!lesson) throw new CourseError(400, 'That topic isn’t in this course.');
	}
	const check = await moderate(user, course, `${t}\n${b}`, { moderator: role.moderate });
	const now = new Date();
	const [post] = await db
		.insert(coursePost)
		.values({
			courseId: course.id,
			lessonId: lesson?.id ?? null,
			authorId: user.id,
			title: t,
			body: b,
			status: check.hold ? 'held' : 'visible',
			flagReasons: check.reasons,
			lastReplyAt: now,
			createdAt: now
		})
		.returning();
	if (!check.hold) await announceThread(course, post);
	return post;
}

/** A reply to a thread. */
export async function reply(threadId, user, { body }) {
	const { post: thread, course } = await loadPost(threadId);
	if (thread.parentId) throw new CourseError(400, 'Reply to the thread, not to a reply.');
	const role = await requireRole(user, course, 'post');
	if (thread.status !== 'visible' && !role.moderate)
		throw new CourseError(409, 'This thread is waiting for review.');
	if (thread.locked && !role.moderate) throw new CourseError(409, 'This thread is locked.');
	const b = clean(body, BODY_MAX);
	if (!b) throw new CourseError(400, 'Write something first.');
	const check = await moderate(user, course, b, { moderator: role.moderate });
	const [post] = await db
		.insert(coursePost)
		.values({
			courseId: course.id,
			lessonId: thread.lessonId,
			parentId: thread.id,
			authorId: user.id,
			body: b,
			status: check.hold ? 'held' : 'visible',
			flagReasons: check.reasons
		})
		.returning();
	if (!check.hold) await announceReply(course, thread, post);
	return post;
}

/** The author edits their post. Edits are checked again. */
export async function editPost(postId, user, { title, body }) {
	const { post, course } = await loadPost(postId);
	if (post.authorId !== user.id) throw new CourseError(403, 'You can only edit your own posts.');
	if (post.status === 'removed') throw new CourseError(409, 'This post was removed.');
	const role = await discussionRole(user, course);
	if (!role.post) throw new CourseError(403, 'You can’t post in this course.');
	const b = clean(body, BODY_MAX);
	const t = post.parentId ? null : clean(title ?? post.title, TITLE_MAX);
	if (!b || (!post.parentId && !t)) throw new CourseError(400, 'Write something first.');
	const check = await moderate(user, course, t ? `${t}\n${b}` : b, { moderator: role.moderate });
	const [row] = await db
		.update(coursePost)
		.set({
			body: b,
			...(t ? { title: t } : {}),
			editedAt: new Date(),
			...(check.hold
				? {
						status: 'held',
						// Already announced when first posted: approving shouldn't announce again.
						flagReasons: [...check.reasons, ...(post.status === 'visible' ? ['edited'] : [])],
						reviewedAt: null
					}
				: { flagReasons: check.reasons })
		})
		.where(eq(coursePost.id, post.id))
		.returning();
	return row;
}

/** Delete a post: its author, or a moderator. */
export async function deletePost(postId, user) {
	const { post, course } = await loadPost(postId);
	const role = await discussionRole(user, course);
	if (post.authorId !== user?.id && !role.moderate)
		throw new CourseError(403, 'You can only delete your own posts.');
	await db.update(coursePost).set({ deletedAt: new Date() }).where(eq(coursePost.id, post.id));
}

/** A student reports a post. Enough reports hide it until it's reviewed. */
export async function reportPost(postId, user, { reason = null } = {}) {
	const { post, course } = await loadPost(postId);
	await requireRole(user, course, 'read');
	if (post.authorId === user.id) throw new CourseError(400, 'You can’t report your own post.');
	if (post.status !== 'visible') return { ok: true };
	await db
		.insert(coursePostReport)
		.values({ postId: post.id, reporterId: user.id, reason: clean(reason, 500) || null })
		.onConflictDoNothing();
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(coursePostReport)
		.where(and(eq(coursePostReport.postId, post.id), isNull(coursePostReport.resolvedAt)));
	if (Number(n) >= HIDE_AT_REPORTS) {
		await db
			.update(coursePost)
			.set({
				status: 'held',
				flagReasons: [...new Set([...(post.flagReasons || []), 'reported'])]
			})
			.where(and(eq(coursePost.id, post.id), eq(coursePost.status, 'visible')));
	}
	return { ok: true };
}

/** The teacher posts an update: a pinned thread every student hears about. */
export async function postUpdate(course, user, { title, body }) {
	if (!canManageCourse(user, course))
		throw new CourseError(403, 'Only the teacher can post updates.');
	const t = clean(title, TITLE_MAX);
	const b = clean(body, BODY_MAX);
	if (!t || !b) throw new CourseError(400, 'An update needs a title and some words.');
	const now = new Date();
	const [post] = await db
		.insert(coursePost)
		.values({
			courseId: course.id,
			authorId: user.id,
			kind: 'update',
			title: t,
			body: b,
			pinned: true,
			flagReasons: checkText(`${t}\n${b}`, { siteHost: siteHost() }),
			lastReplyAt: now,
			createdAt: now
		})
		.returning();
	const students = await db
		.select({ userId: courseEnrollment.userId })
		.from(courseEnrollment)
		.where(and(eq(courseEnrollment.courseId, course.id), isNull(courseEnrollment.revokedAt)));
	await notify(
		students.map((s) => s.userId),
		{ kind: 'course_update', courseId: course.id, postId: post.id, actorId: user.id }
	);
	return post;
}

// ---------------------------------------------------------------- notifications

async function announceThread(course, post) {
	if (course.authorId && course.authorId !== post.authorId)
		await notify([course.authorId], {
			kind: 'new_thread',
			courseId: course.id,
			lessonId: post.lessonId,
			postId: post.id,
			actorId: post.authorId
		});
}

/** Tell the thread's author and everyone who replied before, except the replier. */
async function announceReply(course, thread, post) {
	const earlier = await db
		.selectDistinct({ authorId: coursePost.authorId })
		.from(coursePost)
		.where(
			and(
				eq(coursePost.parentId, thread.id),
				eq(coursePost.status, 'visible'),
				isNull(coursePost.deletedAt)
			)
		);
	await db
		.update(coursePost)
		.set({ lastReplyAt: post.createdAt })
		.where(eq(coursePost.id, thread.id));
	await notify([thread.authorId, ...earlier.map((e) => e.authorId)], {
		kind: 'reply',
		courseId: course.id,
		lessonId: thread.lessonId,
		postId: post.id,
		actorId: post.authorId
	});
}

// ---------------------------------------------------------------- moderation

/** Held or reported posts across some courses, oldest first. */
export async function reviewQueue(courseIds) {
	if (!courseIds.length) return [];
	const thread = sql`(select json_build_object('id', t.id, 'title', t.title) from course_post t where t.id = coalesce(${coursePost.parentId}, ${coursePost.id}))`;
	const rows = await db
		.select({
			id: coursePost.id,
			courseId: coursePost.courseId,
			courseTitle: deskCourse.title,
			courseSlug: deskCourse.slug,
			parentId: coursePost.parentId,
			title: coursePost.title,
			body: coursePost.body,
			status: coursePost.status,
			flagReasons: coursePost.flagReasons,
			createdAt: coursePost.createdAt,
			thread,
			reports: sql`(select coalesce(json_agg(json_build_object('reason', r.reason, 'at', r.created_at)), '[]'::json) from course_post_report r where r.post_id = ${coursePost.id} and r.resolved_at is null)`,
			muted: sql`(select e.muted_at is not null from course_enrollment e where e.course_id = ${coursePost.courseId} and e.user_id = ${coursePost.authorId} and e.revoked_at is null limit 1)`,
			...author,
			authorEmail: userTable.email
		})
		.from(coursePost)
		.innerJoin(deskCourse, eq(coursePost.courseId, deskCourse.id))
		.leftJoin(userTable, eq(coursePost.authorId, userTable.id))
		.where(and(inArray(coursePost.courseId, courseIds), reviewWhere()))
		.orderBy(asc(coursePost.createdAt));
	const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
	return rows.map((r) => ({
		...r,
		thread: parse(r.thread),
		reports: parse(r.reports) || [],
		author: nameOf(r),
		muted: !!r.muted
	}));
}

async function requireModerator(postId, actor) {
	const { post, course } = await loadPost(postId);
	if (!canManageCourse(actor, course))
		throw new CourseError(403, 'Only the course’s teacher or an admin can moderate.');
	return { post, course };
}

const reviewed = (actor, extra = {}) => ({
	reviewedBy: actor.id,
	reviewedAt: new Date(),
	...extra
});

async function resolveReports(postId) {
	await db
		.update(coursePostReport)
		.set({ resolvedAt: new Date() })
		.where(and(eq(coursePostReport.postId, postId), isNull(coursePostReport.resolvedAt)));
}

/** Let a held or reported post stand. A first-time held post is announced now. */
export async function approvePost(postId, actor) {
	const { post, course } = await requireModerator(postId, actor);
	const firstTime =
		post.status === 'held' &&
		!(post.flagReasons || []).some((r) => r === 'reported' || r === 'edited');
	await db
		.update(coursePost)
		.set(reviewed(actor, { status: 'visible' }))
		.where(eq(coursePost.id, post.id));
	await resolveReports(post.id);
	if (firstTime) {
		if (post.parentId) {
			const [thread] = await db
				.select()
				.from(coursePost)
				.where(eq(coursePost.id, post.parentId))
				.limit(1);
			if (thread) await announceReply(course, thread, post);
		} else {
			await db
				.update(coursePost)
				.set({ lastReplyAt: new Date() })
				.where(eq(coursePost.id, post.id));
			await announceThread(course, post);
		}
	}
}

/** Take a post down. The author is told, with the moderator's note. */
export async function removePost(postId, actor, { note = null, mute = false } = {}) {
	const { post, course } = await requireModerator(postId, actor);
	const n = clean(note, 1000) || null;
	await db
		.update(coursePost)
		.set(reviewed(actor, { status: 'removed', reviewNote: n }))
		.where(eq(coursePost.id, post.id));
	await resolveReports(post.id);
	if (post.authorId && post.authorId !== actor.id)
		await notify([post.authorId], {
			kind: 'post_removed',
			courseId: course.id,
			postId: post.id,
			actorId: actor.id,
			data: { note: n, title: post.title || null }
		});
	if (mute && post.authorId) await setMuted(course, post.authorId, actor, true);
}

/** Mute (or unmute) a student: they can still read, but not post. */
export async function setMuted(course, userId, actor, muted) {
	if (!canManageCourse(actor, course))
		throw new CourseError(403, 'Only the course’s teacher or an admin can moderate.');
	const rows = await db
		.update(courseEnrollment)
		.set(muted ? { mutedAt: new Date(), mutedBy: actor.id } : { mutedAt: null, mutedBy: null })
		.where(
			and(
				eq(courseEnrollment.courseId, course.id),
				eq(courseEnrollment.userId, userId),
				isNull(courseEnrollment.revokedAt)
			)
		)
		.returning({ id: courseEnrollment.id });
	if (!rows.length) throw new CourseError(404, 'That student isn’t in this course.');
}

/** Pin or lock a thread. */
export async function setThreadFlag(postId, actor, flag, value) {
	const { post } = await requireModerator(postId, actor);
	if (post.parentId) throw new CourseError(400, 'Only threads can be pinned or locked.');
	if (flag !== 'pinned' && flag !== 'locked') throw new CourseError(400, 'Unknown change.');
	await db
		.update(coursePost)
		.set({ [flag]: !!value })
		.where(eq(coursePost.id, post.id));
}

/** Recent threads for the teacher's Desk tab: unanswered first. */
export async function recentThreads(courseId, { limit = 30 } = {}) {
	const rows = await db
		.select({
			id: coursePost.id,
			kind: coursePost.kind,
			title: coursePost.title,
			pinned: coursePost.pinned,
			locked: coursePost.locked,
			createdAt: coursePost.createdAt,
			lastReplyAt: coursePost.lastReplyAt,
			replies: sql`(select count(*)::int from course_post r where r.parent_id = ${coursePost.id} and r.status = 'visible' and r.deleted_at is null)`,
			teacherReplied: sql`exists (select 1 from course_post r join cms_course c on c.id = r.course_id where r.parent_id = ${coursePost.id} and r.author_id = c.author_id and r.deleted_at is null)`,
			...author
		})
		.from(coursePost)
		.leftJoin(userTable, eq(coursePost.authorId, userTable.id))
		.where(
			and(
				eq(coursePost.courseId, courseId),
				isNull(coursePost.parentId),
				isNull(coursePost.deletedAt),
				eq(coursePost.status, 'visible')
			)
		)
		.orderBy(desc(sql`coalesce(${coursePost.lastReplyAt}, ${coursePost.createdAt})`))
		.limit(limit);
	return rows.map((r) => ({ ...r, author: nameOf(r) }));
}

/** Students muted in a course. */
export async function mutedStudents(courseId) {
	const rows = await db
		.select({
			userId: courseEnrollment.userId,
			mutedAt: courseEnrollment.mutedAt,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			email: userTable.email
		})
		.from(courseEnrollment)
		.innerJoin(userTable, eq(courseEnrollment.userId, userTable.id))
		.where(
			and(
				eq(courseEnrollment.courseId, courseId),
				isNull(courseEnrollment.revokedAt),
				sql`${courseEnrollment.mutedAt} is not null`
			)
		);
	return rows.map((r) => ({
		...r,
		name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email
	}));
}
