/**
 * A course's class roster: who is enrolled, how far along they are, and
 * adding or removing students.
 *
 * - Teachers and admins can add anyone with an account, free (a comp; it
 *   earns nothing).
 * - Teachers can remove students they added. A paying student can only be
 *   removed by an admin; a refund is a separate step on the order page.
 */
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	courseEnrollment,
	deskLesson,
	deskLessonProgress,
	user as userTable
} from '$lib/server/db/schema.js';
import { isAdmin } from '$lib/server/auth/roles.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { CourseError } from './builder.js';
import { isNewSince } from './access.js';

/**
 * Everyone enrolled (and, with `removed`, those who were), with progress.
 * @returns {Promise<any[]>}
 */
export async function listStudents(courseId, { removed = false } = {}) {
	const rows = await db
		.select({
			id: courseEnrollment.id,
			userId: userTable.id,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			email: userTable.email,
			role: userTable.role,
			subscriptionStatus: userTable.subscriptionStatus,
			subscriptionEndDate: userTable.subscriptionEndDate,
			source: courseEnrollment.source,
			createdAt: courseEnrollment.createdAt,
			lastSeenAt: courseEnrollment.lastSeenAt,
			lastLessonId: courseEnrollment.lastLessonId,
			mutedAt: courseEnrollment.mutedAt,
			revokedAt: courseEnrollment.revokedAt,
			revokedReason: courseEnrollment.revokedReason
		})
		.from(courseEnrollment)
		.innerJoin(userTable, eq(courseEnrollment.userId, userTable.id))
		.where(
			removed
				? eq(courseEnrollment.courseId, courseId)
				: and(eq(courseEnrollment.courseId, courseId), isNull(courseEnrollment.revokedAt))
		)
		.orderBy(sql`${courseEnrollment.createdAt} desc`);
	if (!rows.length) return [];

	const [topics, done] = await Promise.all([
		db
			.select({
				id: deskLesson.id,
				title: deskLesson.title,
				isPreview: deskLesson.isPreview,
				firstPublishedAt: deskLesson.firstPublishedAt
			})
			.from(deskLesson)
			.where(and(eq(deskLesson.courseId, courseId), isNotNull(deskLesson.publishedAt))),
		db
			.select({ userId: deskLessonProgress.userId, lessonId: deskLessonProgress.lessonId })
			.from(deskLessonProgress)
			.innerJoin(deskLesson, eq(deskLessonProgress.lessonId, deskLesson.id))
			.where(
				and(
					eq(deskLesson.courseId, courseId),
					isNotNull(deskLesson.publishedAt),
					isNotNull(deskLessonProgress.completedAt),
					inArray(
						deskLessonProgress.userId,
						rows.map((r) => r.userId)
					)
				)
			)
	]);
	const titles = new Map(topics.map((t) => [t.id, t.title]));
	const doneBy = new Map();
	for (const d of done) doneBy.set(d.userId, (doneBy.get(d.userId) || 0) + 1);

	return rows.map((r) => {
		const premium = userHasPremiumAccess(r);
		const enrollment = { createdAt: r.createdAt };
		const open = topics.filter((t) => t.isPreview || premium || !isNewSince(t, enrollment)).length;
		const completed = Math.min(doneBy.get(r.userId) || 0, open);
		return {
			id: r.id,
			userId: r.userId,
			name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email,
			email: r.email,
			premium,
			source: r.source,
			enrolledAt: r.createdAt,
			lastSeenAt: r.lastSeenAt,
			current: r.lastLessonId ? titles.get(r.lastLessonId) || null : null,
			completed,
			topics: open,
			percent: open ? Math.round((completed / open) * 100) : 0,
			muted: !!r.mutedAt,
			revokedAt: r.revokedAt,
			revokedReason: r.revokedReason
		};
	});
}

/** Add someone free, by the email on their account. */
export async function addStudent(course, email, actor) {
	const e = String(email || '')
		.trim()
		.toLowerCase();
	if (!e) throw new CourseError(400, 'Enter an email address.');
	const [u] = await db
		.select({ id: userTable.id })
		.from(userTable)
		.where(sql`lower(${userTable.email}) = ${e}`)
		.limit(1);
	if (!u) throw new CourseError(404, 'Nobody has an account with that email yet.');
	const [live] = await db
		.select({ id: courseEnrollment.id })
		.from(courseEnrollment)
		.where(
			and(
				eq(courseEnrollment.courseId, course.id),
				eq(courseEnrollment.userId, u.id),
				isNull(courseEnrollment.revokedAt)
			)
		)
		.limit(1);
	if (live) throw new CourseError(409, 'They’re already in this course.');
	const [row] = await db
		.insert(courseEnrollment)
		.values({ courseId: course.id, userId: u.id, source: 'comp', addedBy: actor.id })
		.returning();
	return row;
}

/** Take someone out of the course. Paying students: admins only. */
export async function removeStudent(course, enrollmentId, actor) {
	const [en] = await db
		.select()
		.from(courseEnrollment)
		.where(and(eq(courseEnrollment.id, enrollmentId), eq(courseEnrollment.courseId, course.id)))
		.limit(1);
	if (!en || en.revokedAt) throw new CourseError(404, 'Student not found.');
	if (en.source === 'purchase' && !isAdmin(actor))
		throw new CourseError(
			403,
			'This student paid for the course, so only an admin can remove them (and refund them from the order).'
		);
	await db
		.update(courseEnrollment)
		.set({ revokedAt: new Date(), revokedReason: 'removed' })
		.where(eq(courseEnrollment.id, en.id));
}

const csvCell = (v) => {
	const s = v == null ? '' : String(v);
	// Formula injection: a cell starting with = + - @ is read as a formula.
	const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
	return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function rosterCsv(students) {
	const head = [
		'Name',
		'Email',
		'Joined',
		'How',
		'Premium',
		'Topics done',
		'Topics',
		'Percent',
		'Reading now',
		'Last active'
	];
	const lines = students.map((s) =>
		[
			s.name,
			s.email,
			s.enrolledAt?.toISOString().slice(0, 10),
			s.source === 'purchase' ? 'Bought' : 'Added free',
			s.premium ? 'yes' : 'no',
			s.completed,
			s.topics,
			s.percent,
			s.current,
			s.lastSeenAt?.toISOString().slice(0, 10)
		]
			.map(csvCell)
			.join(',')
	);
	return [head.join(','), ...lines].join('\n');
}
