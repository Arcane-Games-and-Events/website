/**
 * A course's history: who did what and when (created, sent for approval,
 * returned, approved, unlisted, topics published, changes put live, students
 * added, posts moderated, payouts recorded). Written by the API routes after
 * an action succeeds; read by the admin course pages.
 *
 * Recording never gets in the way of the action itself: if it fails (say
 * migration 033 isn't applied yet) the action still stands.
 */
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	courseActivity,
	coursePost,
	deskLesson,
	user as userTable
} from '$lib/server/db/schema.js';

/**
 * @param {string} courseId
 * @param {any} actor  the signed-in user, or null for the system
 * @param {string} kind
 * @param {{ lessonId?: string|null, note?: string|null, data?: any }} [extra]
 */
export async function logActivity(
	courseId,
	actor,
	kind,
	{ lessonId = null, note = null, data = null } = {}
) {
	try {
		await db.insert(courseActivity).values({
			courseId,
			actorId: actor?.id ?? null,
			kind,
			lessonId,
			note: note ? String(note).slice(0, 2000) : null,
			data
		});
	} catch (err) {
		console.warn('[courses] activity not recorded:', kind, err?.message || err);
	}
}

/**
 * The recorded history, newest first. `null` when it can't be read (the
 * table isn't there yet), so the page can say so rather than show nothing.
 */
export async function listActivity(courseId, { limit = 200 } = {}) {
	try {
		const rows = await db
			.select({
				id: courseActivity.id,
				kind: courseActivity.kind,
				note: courseActivity.note,
				data: courseActivity.data,
				createdAt: courseActivity.createdAt,
				actorId: courseActivity.actorId,
				actorFirst: userTable.firstName,
				actorLast: userTable.lastName,
				lessonTitle: deskLesson.title
			})
			.from(courseActivity)
			.leftJoin(userTable, eq(courseActivity.actorId, userTable.id))
			.leftJoin(deskLesson, eq(courseActivity.lessonId, deskLesson.id))
			.where(eq(courseActivity.courseId, courseId))
			.orderBy(desc(courseActivity.createdAt))
			.limit(limit);
		return rows.map((r) => ({
			...r,
			actor: r.actorFirst ? `${r.actorFirst} ${r.actorLast || ''}`.trim() : null
		}));
	} catch {
		return null;
	}
}

/** Record a moderation decision against the course the post belongs to. */
export async function logPostActivity(postId, actor, kind, { note = null, data = null } = {}) {
	try {
		const [post] = await db
			.select({
				courseId: coursePost.courseId,
				title: coursePost.title,
				parentId: coursePost.parentId
			})
			.from(coursePost)
			.where(eq(coursePost.id, postId))
			.limit(1);
		if (!post) return;
		await logActivity(post.courseId, actor, kind, {
			note,
			data: { postId, title: post.title, reply: !!post.parentId, ...(data || {}) }
		});
	} catch (err) {
		console.warn('[courses] activity not recorded:', kind, err?.message || err);
	}
}
