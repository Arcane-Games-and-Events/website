/**
 * The Desk course builder: courses, their sections (cms_module) and topics
 * (cms_lesson), the outline order, and review before the first publish.
 *
 * Permission checks live in the API routes (`managedCourse` in access.js);
 * these functions assume the caller may manage the course.
 *
 * Publishing:
 * - A teacher submits a draft course for review; an admin approves it (it
 *   goes live) or returns it with a note. After that first approval the
 *   teacher can unlist (archive) and relist it themselves.
 * - Topics are drafts until published. A topic's first_published_at is set
 *   the first time it is live in a live course and never changes: a topic
 *   first published after a student enrolled is Premium-only for them.
 */
import { and, asc, eq, gte, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	courseEnrollment,
	courseSale,
	coursePost,
	deskCourse,
	deskLesson,
	deskModule,
	deskRevision,
	user as userTable
} from '$lib/server/db/schema.js';
import { bump } from '$lib/server/cache/index.js';
import { titleToSlug, withSuffix } from '$lib/desk/slug.js';
import { calculateReadTime, lexicalToText } from '$lib/desk/render/lexical-utils.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { notify } from './notifications.js';

export class CourseError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

const PRICE_MAX = 10000;

// ---------------------------------------------------------------- slugs

async function freeCourseSlug(desired, excludeId = null) {
	const base = titleToSlug(desired) || 'course';
	for (let n = 1; ; n++) {
		const candidate = n === 1 ? base : withSuffix(base, n);
		const [hit] = await db
			.select({ id: deskCourse.id })
			.from(deskCourse)
			.where(
				excludeId
					? and(eq(deskCourse.slug, candidate), ne(deskCourse.id, excludeId))
					: eq(deskCourse.slug, candidate)
			)
			.limit(1);
		if (!hit) return candidate;
	}
}

// Taken by /academy/[slug]/discussion.
const RESERVED_TOPIC_SLUGS = new Set(['discussion']);

async function freeTopicSlug(courseId, desired, excludeId = null, tx = db) {
	let base = titleToSlug(desired) || 'topic';
	if (RESERVED_TOPIC_SLUGS.has(base)) base = `${base}-topic`;
	for (let n = 1; ; n++) {
		const candidate = n === 1 ? base : withSuffix(base, n);
		const where = [eq(deskLesson.courseId, courseId), eq(deskLesson.slug, candidate)];
		if (excludeId) where.push(ne(deskLesson.id, excludeId));
		const [hit] = await tx
			.select({ id: deskLesson.id })
			.from(deskLesson)
			.where(and(...where))
			.limit(1);
		if (!hit) return candidate;
	}
}

// ---------------------------------------------------------------- courses

export async function createCourse(user, { title } = {}) {
	const name =
		String(title || '')
			.trim()
			.slice(0, 200) || 'Untitled course';
	const [course] = await db
		.insert(deskCourse)
		.values({
			title: name,
			slug: await freeCourseSlug(name),
			authorId: user.id,
			status: 'draft'
		})
		.returning();
	// Every course starts with one section to put topics in.
	await db.insert(deskModule).values({ courseId: course.id, title: 'Section 1', position: 0 });
	return course;
}

/**
 * Edit a course's details. Changes go live at once on a live course (only
 * the first publish needs approval).
 * @param {any} course
 * @param {{ title?: string, slug?: string, description?: string|null, price?: number|string, coverImageId?: string|null, thumbnailImageId?: string|null }} fields
 */
export async function updateCourse(course, fields) {
	const set = { updatedAt: new Date() };
	if (fields.title !== undefined) {
		const t = String(fields.title).trim().slice(0, 200);
		if (!t) throw new CourseError(400, 'A course needs a title.');
		set.title = t;
	}
	if (fields.slug !== undefined) {
		const s = titleToSlug(String(fields.slug));
		if (!s) throw new CourseError(400, 'The web address can’t be empty.');
		set.slug = await freeCourseSlug(s, course.id);
	}
	if (fields.description !== undefined)
		set.description = fields.description ? String(fields.description).slice(0, 4000) : null;
	if (fields.price !== undefined) {
		const p = Number(fields.price);
		if (!Number.isFinite(p) || p < 0 || p > PRICE_MAX)
			throw new CourseError(400, `Price must be between $0 and $${PRICE_MAX}.`);
		set.price = p.toFixed(2);
	}
	if (fields.coverImageId !== undefined) set.coverImageId = fields.coverImageId || null;
	if (fields.thumbnailImageId !== undefined) set.thumbnailImageId = fields.thumbnailImageId || null;
	const [row] = await db
		.update(deskCourse)
		.set(set)
		.where(eq(deskCourse.id, course.id))
		.returning();
	await bump('courses');
	return row;
}

/** What's missing before a course can be sent for review. */
export async function readinessOf(course) {
	const problems = [];
	if (!course.title?.trim()) problems.push('Add a title.');
	if (!course.description?.trim()) problems.push('Add a description.');
	if (!course.coverImageId) problems.push('Add a cover image.');
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(deskLesson)
		.where(and(eq(deskLesson.courseId, course.id), isNotNull(deskLesson.publishedAt)));
	if (!n) problems.push('Publish at least one topic.');
	return problems;
}

export async function submitForReview(course) {
	if (course.status !== 'draft') throw new CourseError(409, 'This course isn’t a draft.');
	const problems = await readinessOf(course);
	if (problems.length) throw new CourseError(400, problems.join(' '));
	const [row] = await db
		.update(deskCourse)
		.set({ status: 'in_review', submittedAt: new Date(), reviewNote: null, updatedAt: new Date() })
		.where(eq(deskCourse.id, course.id))
		.returning();
	return row;
}

/** Withdraw a submission (the teacher) or return it with a note (an admin). */
export async function returnToDraft(course, { note = null } = {}) {
	if (course.status !== 'in_review') throw new CourseError(409, 'This course isn’t in review.');
	const [row] = await db
		.update(deskCourse)
		.set({
			status: 'draft',
			reviewNote: note ? String(note).slice(0, 2000) : null,
			updatedAt: new Date()
		})
		.where(eq(deskCourse.id, course.id))
		.returning();
	return row;
}

/** Admin: approve the first publish. Every published topic goes live with it. */
export async function approveCourse(course) {
	if (course.status !== 'in_review') throw new CourseError(409, 'This course isn’t in review.');
	const now = new Date();
	const row = await db.transaction(async (tx) => {
		const [c] = await tx
			.update(deskCourse)
			.set({
				status: 'published',
				publishedAt: course.publishedAt || now,
				firstPublishedAt: course.firstPublishedAt || now,
				reviewNote: null,
				updatedAt: now
			})
			.where(eq(deskCourse.id, course.id))
			.returning();
		await tx
			.update(deskLesson)
			.set({ firstPublishedAt: now })
			.where(
				and(
					eq(deskLesson.courseId, course.id),
					isNotNull(deskLesson.publishedAt),
					isNull(deskLesson.firstPublishedAt)
				)
			);
		return c;
	});
	await bump('courses');
	return row;
}

/** After its first approval, the teacher can unlist or relist a course. */
export async function setListed(course, listed) {
	if (!course.firstPublishedAt)
		throw new CourseError(409, 'An admin has to approve this course first.');
	const [row] = await db
		.update(deskCourse)
		.set({
			status: listed ? 'published' : 'archived',
			publishedAt: listed ? course.publishedAt || new Date() : course.publishedAt,
			updatedAt: new Date()
		})
		.where(eq(deskCourse.id, course.id))
		.returning();
	await bump('courses');
	return row;
}

/** Only a course nobody has bought or joined can be deleted. */
export async function deleteCourse(course) {
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(courseEnrollment)
		.where(eq(courseEnrollment.courseId, course.id));
	const [{ s }] = await db
		.select({ s: sql`count(*)::int` })
		.from(courseSale)
		.where(eq(courseSale.courseId, course.id));
	if (n || s)
		throw new CourseError(409, 'Students have joined this course, so it can only be unlisted.');
	await db.delete(deskCourse).where(eq(deskCourse.id, course.id));
	await bump('courses');
}

// ---------------------------------------------------------------- outline

/** Sections in order, each with its topics in order. */
export async function outlineOf(courseId) {
	const [sections, topics] = await Promise.all([
		db
			.select()
			.from(deskModule)
			.where(eq(deskModule.courseId, courseId))
			.orderBy(asc(deskModule.position), asc(deskModule.createdAt)),
		db
			.select({
				id: deskLesson.id,
				moduleId: deskLesson.moduleId,
				slug: deskLesson.slug,
				title: deskLesson.title,
				position: deskLesson.position,
				isPreview: deskLesson.isPreview,
				readTime: deskLesson.readTime,
				publishedAt: deskLesson.publishedAt,
				firstPublishedAt: deskLesson.firstPublishedAt,
				draftTitle: deskLesson.draftTitle,
				pendingChanges: sql`${deskLesson.draftUpdatedAt} is not null`,
				updatedAt: deskLesson.updatedAt
			})
			.from(deskLesson)
			.where(eq(deskLesson.courseId, courseId))
			.orderBy(asc(deskLesson.position), asc(deskLesson.createdAt))
	]);
	return sections.map((s) => ({
		id: s.id,
		title: s.title,
		// The teacher sees their working titles, pending changes included.
		topics: topics
			.filter((t) => t.moduleId === s.id)
			.map(({ draftTitle, ...t }) => ({ ...t, title: draftTitle ?? t.title }))
	}));
}

/**
 * Save the whole outline order in one go: sections in order, each with its
 * topics in order. Every section and topic of the course must appear exactly
 * once, and nothing from another course.
 * @param {string} courseId
 * @param {{ id: string, topicIds: string[] }[]} layout
 */
export async function saveOutline(courseId, layout) {
	if (!Array.isArray(layout)) throw new CourseError(400, 'Bad outline.');
	const current = await outlineOf(courseId);
	const sectionIds = new Set(current.map((s) => s.id));
	const topicIds = new Set(current.flatMap((s) => s.topics.map((t) => t.id)));
	const seenSections = new Set();
	const seenTopics = new Set();
	for (const s of layout) {
		if (!s || !sectionIds.has(s.id) || seenSections.has(s.id) || !Array.isArray(s.topicIds))
			throw new CourseError(400, 'The outline doesn’t match this course. Reload and try again.');
		seenSections.add(s.id);
		for (const t of s.topicIds) {
			if (!topicIds.has(t) || seenTopics.has(t))
				throw new CourseError(400, 'The outline doesn’t match this course. Reload and try again.');
			seenTopics.add(t);
		}
	}
	if (seenSections.size !== sectionIds.size || seenTopics.size !== topicIds.size)
		throw new CourseError(400, 'The outline doesn’t match this course. Reload and try again.');

	await db.transaction(async (tx) => {
		for (const [i, s] of layout.entries()) {
			await tx
				.update(deskModule)
				.set({ position: i, updatedAt: new Date() })
				.where(and(eq(deskModule.id, s.id), eq(deskModule.courseId, courseId)));
			for (const [j, t] of s.topicIds.entries()) {
				await tx
					.update(deskLesson)
					.set({ moduleId: s.id, position: j })
					.where(and(eq(deskLesson.id, t), eq(deskLesson.courseId, courseId)));
			}
		}
	});
	await bump('courses');
	return outlineOf(courseId);
}

export async function createSection(courseId, { title } = {}) {
	const [{ n }] = await db
		.select({ n: sql`coalesce(max(${deskModule.position}) + 1, 0)::int` })
		.from(deskModule)
		.where(eq(deskModule.courseId, courseId));
	const [row] = await db
		.insert(deskModule)
		.values({
			courseId,
			title:
				String(title || '')
					.trim()
					.slice(0, 200) || `Section ${Number(n) + 1}`,
			position: Number(n)
		})
		.returning();
	await bump('courses');
	return row;
}

export async function renameSection(courseId, sectionId, title) {
	const t = String(title || '')
		.trim()
		.slice(0, 200);
	if (!t) throw new CourseError(400, 'A section needs a name.');
	const [row] = await db
		.update(deskModule)
		.set({ title: t, updatedAt: new Date() })
		.where(and(eq(deskModule.id, sectionId), eq(deskModule.courseId, courseId)))
		.returning();
	if (!row) throw new CourseError(404, 'Section not found.');
	await bump('courses');
	return row;
}

/** Delete a section. With topics in it, only when `withTopics` is set. */
export async function deleteSection(courseId, sectionId, { withTopics = false } = {}) {
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(deskLesson)
		.where(eq(deskLesson.moduleId, sectionId));
	if (n && !withTopics)
		throw new CourseError(409, 'This section has topics. Move them or delete them with it.');
	const [{ sections }] = await db
		.select({ sections: sql`count(*)::int` })
		.from(deskModule)
		.where(eq(deskModule.courseId, courseId));
	if (sections <= 1) throw new CourseError(409, 'A course needs at least one section.');
	const gone = await db
		.delete(deskModule)
		.where(and(eq(deskModule.id, sectionId), eq(deskModule.courseId, courseId)))
		.returning({ id: deskModule.id });
	if (!gone.length) throw new CourseError(404, 'Section not found.');
	await bump('courses');
}

// ---------------------------------------------------------------- topics

export async function getTopic(courseId, topicId) {
	const [row] = await db
		.select()
		.from(deskLesson)
		.where(and(eq(deskLesson.id, topicId), eq(deskLesson.courseId, courseId)))
		.limit(1);
	return row || null;
}

export async function createTopic(courseId, { sectionId, title } = {}) {
	const [section] = await db
		.select()
		.from(deskModule)
		.where(and(eq(deskModule.id, sectionId), eq(deskModule.courseId, courseId)))
		.limit(1);
	if (!section) throw new CourseError(404, 'Section not found.');
	const name =
		String(title || '')
			.trim()
			.slice(0, 200) || 'Untitled topic';
	const [{ n }] = await db
		.select({ n: sql`coalesce(max(${deskLesson.position}) + 1, 0)::int` })
		.from(deskLesson)
		.where(eq(deskLesson.moduleId, section.id));
	const [row] = await db
		.insert(deskLesson)
		.values({
			courseId,
			moduleId: section.id,
			title: name,
			slug: await freeTopicSlug(courseId, name),
			position: Number(n)
		})
		.returning();
	return row;
}

/**
 * Edit a topic. A published topic's edits go live at once (it's the
 * teacher's own course).
 * @param {any} topic
 * @param {{ title?: string, slug?: string, body?: any, isPreview?: boolean }} fields
 */
/**
 * Do edits to this topic wait for an Update? Yes once students can read it:
 * a published topic in a live (or unlisted) course.
 */
export function editsAreStaged(course, topic) {
	return !!topic.publishedAt && (course.status === 'published' || course.status === 'archived');
}

/** The topic as its teacher is editing it: pending changes on top of the live version. */
export function workingCopy(topic) {
	const pending = !!topic.draftUpdatedAt;
	return {
		...topic,
		title: pending ? (topic.draftTitle ?? topic.title) : topic.title,
		// A draft is always a whole topic, so an empty draft body means "cleared".
		body: pending ? topic.draftBody : topic.body,
		pendingChanges: pending
	};
}

/**
 * Save a topic's fields. With `staged`, the title and body go into the
 * draft columns and students keep the published version until
 * `applyTopicChanges`. The address and Free to read always apply at once.
 */
export async function updateTopic(topic, fields, { staged = false } = {}) {
	const now = new Date();
	const set = { updatedAt: now };
	if (fields.title !== undefined) {
		const t = String(fields.title).trim().slice(0, 200);
		if (!t) throw new CourseError(400, 'A topic needs a title.');
		if (staged) set.draftTitle = t;
		else set.title = t;
	}
	if (fields.slug !== undefined) {
		const s = titleToSlug(String(fields.slug));
		if (!s) throw new CourseError(400, 'The web address can’t be empty.');
		set.slug = await freeTopicSlug(topic.courseId, s, topic.id);
	}
	if (fields.body !== undefined) {
		if (fields.body && typeof fields.body !== 'object') throw new CourseError(400, 'Bad body.');
		if (staged) set.draftBody = fields.body || null;
		else {
			set.body = fields.body || null;
			set.readTime = fields.body ? calculateReadTime(fields.body) : null;
		}
	}
	if (staged && (set.draftTitle !== undefined || set.draftBody !== undefined)) {
		set.draftUpdatedAt = now;
		// The first draft edit copies whatever half isn't being changed, so
		// the draft is always a whole topic.
		if (!topic.draftUpdatedAt) {
			if (set.draftTitle === undefined) set.draftTitle = topic.title;
			if (set.draftBody === undefined) set.draftBody = topic.body;
		}
	}
	if (fields.isPreview !== undefined) set.isPreview = !!fields.isPreview;
	const [row] = await db.update(deskLesson).set(set).where(eq(deskLesson.id, topic.id)).returning();
	const liveChanged = ['title', 'slug', 'body', 'isPreview'].some((k) => set[k] !== undefined);
	if (topic.publishedAt && liveChanged) await bump('courses');
	return row;
}

/** Publish a topic's pending changes: students see them from now on. */
export async function applyTopicChanges(topic, actor) {
	if (!topic.draftUpdatedAt) throw new CourseError(409, 'There are no changes to update.');
	const body = topic.draftBody;
	if (!lexicalToText(body).trim()) throw new CourseError(400, 'A published topic can’t be empty.');
	const [row] = await db
		.update(deskLesson)
		.set({
			title: topic.draftTitle ?? topic.title,
			body,
			readTime: body ? calculateReadTime(body) : null,
			draftTitle: null,
			draftBody: null,
			draftUpdatedAt: null,
			updatedAt: new Date()
		})
		.where(eq(deskLesson.id, topic.id))
		.returning();
	await db
		.insert(deskRevision)
		.values({ entityType: 'lesson', entityId: topic.id, body, savedBy: actor?.id });
	await bump('courses');
	return row;
}

/** Throw a topic's pending changes away; the published version stays. */
export async function discardTopicChanges(topic) {
	const [row] = await db
		.update(deskLesson)
		.set({ draftTitle: null, draftBody: null, draftUpdatedAt: null, updatedAt: new Date() })
		.where(eq(deskLesson.id, topic.id))
		.returning();
	return row;
}

/**
 * Publish a topic. In a live course, a topic's first publish stamps
 * first_published_at and tells the course's students about it.
 */
export async function publishTopic(course, topic, actor) {
	if (!lexicalToText(topic.body).trim()) throw new CourseError(400, 'Write something first.');
	const now = new Date();
	const courseLive = !!course.firstPublishedAt;
	const first = courseLive && !topic.firstPublishedAt;
	const [row] = await db
		.update(deskLesson)
		.set({
			publishedAt: topic.publishedAt || now,
			...(first ? { firstPublishedAt: now } : {}),
			updatedAt: now
		})
		.where(eq(deskLesson.id, topic.id))
		.returning();
	await db
		.insert(deskRevision)
		.values({ entityType: 'lesson', entityId: topic.id, body: topic.body, savedBy: actor?.id });
	if (first) await announceTopic(course, row, actor);
	await bump('courses');
	return row;
}

export async function unpublishTopic(topic) {
	// Nobody else can see it now, so pending changes become the topic itself.
	const pending = topic.draftUpdatedAt
		? {
				title: topic.draftTitle ?? topic.title,
				body: topic.draftBody,
				readTime: topic.draftBody ? calculateReadTime(topic.draftBody) : null,
				draftTitle: null,
				draftBody: null,
				draftUpdatedAt: null
			}
		: {};
	const [row] = await db
		.update(deskLesson)
		.set({ publishedAt: null, ...pending, updatedAt: new Date() })
		.where(eq(deskLesson.id, topic.id))
		.returning();
	await bump('courses');
	return row;
}

export async function deleteTopic(topic) {
	await db.delete(deskLesson).where(eq(deskLesson.id, topic.id));
	await bump('courses');
}

/** Tell enrolled students about a new topic; non-Premium students learn it's a Premium extra. */
async function announceTopic(course, topic, actor) {
	const students = await db
		.select({
			id: userTable.id,
			role: userTable.role,
			subscriptionStatus: userTable.subscriptionStatus,
			subscriptionEndDate: userTable.subscriptionEndDate
		})
		.from(courseEnrollment)
		.innerJoin(userTable, eq(courseEnrollment.userId, userTable.id))
		.where(and(eq(courseEnrollment.courseId, course.id), isNull(courseEnrollment.revokedAt)));
	const premium = students.filter((s) => userHasPremiumAccess(s)).map((s) => s.id);
	const others = students.filter((s) => !userHasPremiumAccess(s)).map((s) => s.id);
	const base = {
		kind: 'new_topic',
		courseId: course.id,
		lessonId: topic.id,
		actorId: actor?.id ?? null
	};
	await notify(premium, { ...base, data: { premiumOnly: false } });
	await notify(others, { ...base, data: { premiumOnly: true } });
}

// ---------------------------------------------------------------- lists

/**
 * Courses for the Desk list: a teacher's own, or (admin) everyone's, with
 * topic, student and review counts.
 */
export async function listDeskCourses(user, { all = false } = {}) {
	const rows = await db
		.select({
			id: deskCourse.id,
			slug: deskCourse.slug,
			title: deskCourse.title,
			status: deskCourse.status,
			price: deskCourse.price,
			submittedAt: deskCourse.submittedAt,
			reviewNote: deskCourse.reviewNote,
			firstPublishedAt: deskCourse.firstPublishedAt,
			updatedAt: deskCourse.updatedAt,
			coverImageId: deskCourse.coverImageId,
			authorId: deskCourse.authorId,
			authorFirst: userTable.firstName,
			authorLast: userTable.lastName
		})
		.from(deskCourse)
		.leftJoin(userTable, eq(deskCourse.authorId, userTable.id))
		.where(all ? undefined : eq(deskCourse.authorId, user.id))
		.orderBy(sql`${deskCourse.updatedAt} desc`);
	if (!rows.length) return [];
	const ids = rows.map((r) => r.id);
	const monthStart = new Date();
	monthStart.setUTCDate(1);
	monthStart.setUTCHours(0, 0, 0, 0);
	const [topics, students, sales, held] = await Promise.all([
		db
			.select({
				courseId: deskLesson.courseId,
				total: sql`count(*)::int`,
				live: sql`count(${deskLesson.publishedAt})::int`
			})
			.from(deskLesson)
			.where(inArray(deskLesson.courseId, ids))
			.groupBy(deskLesson.courseId),
		db
			.select({ courseId: courseEnrollment.courseId, n: sql`count(*)::int` })
			.from(courseEnrollment)
			.where(and(inArray(courseEnrollment.courseId, ids), isNull(courseEnrollment.revokedAt)))
			.groupBy(courseEnrollment.courseId),
		db
			.select({
				courseId: courseSale.courseId,
				cents: sql`coalesce(sum(${courseSale.grossCents} - ${courseSale.refundedCents}), 0)::int`
			})
			.from(courseSale)
			.where(and(inArray(courseSale.courseId, ids), gte(courseSale.soldAt, monthStart)))
			.groupBy(courseSale.courseId),
		db
			.select({ courseId: coursePost.courseId, n: sql`count(*)::int` })
			.from(coursePost)
			.where(and(inArray(coursePost.courseId, ids), reviewWhere()))
			.groupBy(coursePost.courseId)
	]);
	const by = (list, key) => new Map(list.map((x) => [x.courseId, x[key]]));
	const topicsBy = new Map(topics.map((x) => [x.courseId, x]));
	const studentsBy = by(students, 'n');
	const salesBy = by(sales, 'cents');
	const heldBy = by(held, 'n');
	return rows.map((r) => ({
		...r,
		author: r.authorFirst ? `${r.authorFirst} ${r.authorLast || ''}`.trim() : null,
		topics: topicsBy.get(r.id)?.total ?? 0,
		liveTopics: topicsBy.get(r.id)?.live ?? 0,
		students: studentsBy.get(r.id) ?? 0,
		monthCents: salesBy.get(r.id) ?? 0,
		needsReview: heldBy.get(r.id) ?? 0
	}));
}

/** Posts waiting for a moderator: held, or reported and not yet reviewed. */
export function reviewWhere() {
	return sql`${coursePost.deletedAt} is null and (${coursePost.status} = 'held' or (${coursePost.status} = 'visible' and exists (select 1 from course_post_report r where r.post_id = ${coursePost.id} and r.resolved_at is null)))`;
}

/** How many of a course's discussion posts are waiting for a moderator. */
export async function reviewCount(courseId) {
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(coursePost)
		.where(and(eq(coursePost.courseId, courseId), reviewWhere()));
	return Number(n) || 0;
}
