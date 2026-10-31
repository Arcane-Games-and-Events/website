/**
 * The admin's view of every course in the Desk: where each one stands in
 * plain words, whose move it is and since when, what's waiting on an admin
 * (approvals, flagged posts, payouts, live courses with problems) and what's
 * waiting on teachers (returned courses, unfinished drafts, live topics with
 * changes not put live). Also one course's full picture, for its Status tab.
 */
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	courseActivity,
	courseEnrollment,
	coursePost,
	courseSale,
	deskCourse,
	deskLesson,
	deskLessonProgress,
	deskModule,
	teacherPayout,
	user as userTable
} from '$lib/server/db/schema.js';
import { listDeskCourses, readinessOf, reviewWhere } from './builder.js';
import { listActivity } from './activity.js';
import { nextPayDate, payoutsDue, shareOf } from './earnings.js';

const NONE = ['00000000-0000-0000-0000-000000000000'];
const nameOf = (first, last, fallback = null) =>
	first ? `${first} ${last || ''}`.trim() : fallback;

/** The latest logged time of each kind of action, per course (empty before migration 033). */
async function lastActions(courseIds, kinds) {
	try {
		const rows = await db
			.select({
				courseId: courseActivity.courseId,
				kind: courseActivity.kind,
				at: sql`max(${courseActivity.createdAt})`,
				lastAny: sql`max(${courseActivity.createdAt})`
			})
			.from(courseActivity)
			.where(and(inArray(courseActivity.courseId, courseIds), inArray(courseActivity.kind, kinds)))
			.groupBy(courseActivity.courseId, courseActivity.kind);
		const out = new Map();
		for (const r of rows) out.set(`${r.courseId}:${r.kind}`, new Date(r.at));
		return { get: (id, kind) => out.get(`${id}:${kind}`) || null, available: true };
	} catch {
		return { get: () => null, available: false };
	}
}

/**
 * Where a course stands, as the admin needs to read it.
 * @returns {{ stage: string, label: string, line: string, whose: 'admin'|'teacher'|'none', since: Date|null }}
 */
export function standing(c) {
	if (c.status === 'in_review')
		return {
			stage: 'in_review',
			label: 'Waiting for approval',
			line: 'Sent for approval. Approve it or return it with a note.',
			whose: 'admin',
			since: c.submittedAt
		};
	if (c.status === 'draft' && c.reviewNote)
		return {
			stage: 'returned',
			label: 'Returned to teacher',
			line: 'Returned with a note. Waiting for the teacher to fix it and send it again.',
			whose: 'teacher',
			since: c.returnedAt || c.updatedAt
		};
	if (c.status === 'draft')
		return {
			stage: 'draft',
			label: 'Draft',
			line: c.problems?.length
				? `Being built. Before it can be sent: ${c.problems.join(' ').replace(/\.$/, '')}.`
				: 'Ready to send for approval, but the teacher hasn’t sent it yet.',
			whose: 'teacher',
			since: c.updatedAt
		};
	if (c.status === 'archived')
		return {
			stage: 'unlisted',
			label: 'Unlisted',
			line: 'Hidden from the Academy and can’t be bought. Students who have it keep it.',
			whose: 'none',
			since: c.unlistedAt || c.updatedAt
		};
	return {
		stage: 'live',
		label: 'Live',
		line: c.liveTopics
			? 'In the Academy and on sale. The teacher publishes changes without approval.'
			: 'In the Academy and on sale, but it has no published topics: buyers get an empty course.',
		whose: 'none',
		since: c.firstPublishedAt
	};
}

/** A live course with problems or flagged posts needs an admin, whatever its stage says. */
function withAttention(st, { liveProblems = [], postsToReview = 0 }) {
	if (st.whose !== 'none' || (!liveProblems.length && !postsToReview)) return st;
	return { ...st, whose: 'admin' };
}

/** Problems with a course students can see. */
function liveProblems(c) {
	if (c.status !== 'published') return [];
	const out = [];
	if (!c.liveTopics) out.push('No published topics');
	if (!c.coverImageId) out.push('No cover image');
	if (!c.description?.trim()) out.push('No description');
	return out;
}

/** Every course, with its standing and open items, plus the admin's to-do list. */
/**
 * @param {any} admin  an admin or editor
 * @param {Date} [now]
 * @param {{ money?: boolean }} [opts]  include payouts owed (admins only)
 */
export async function courseOversight(admin, now = new Date(), { money: withMoney = true } = {}) {
	const base = await listDeskCourses(admin, { all: true });
	const ids = base.length ? base.map((c) => c.id) : NONE;

	const [details, pending, held, money, students, actions, due] = await Promise.all([
		db
			.select({
				id: deskCourse.id,
				description: deskCourse.description,
				createdAt: deskCourse.createdAt
			})
			.from(deskCourse)
			.where(inArray(deskCourse.id, ids)),
		db
			.select({
				courseId: deskLesson.courseId,
				n: sql`count(*)::int`,
				oldest: sql`min(${deskLesson.draftUpdatedAt})`
			})
			.from(deskLesson)
			.where(and(inArray(deskLesson.courseId, ids), isNotNull(deskLesson.draftUpdatedAt)))
			.groupBy(deskLesson.courseId),
		db
			.select({
				courseId: coursePost.courseId,
				n: sql`count(*)::int`,
				oldest: sql`min(${coursePost.createdAt})`
			})
			.from(coursePost)
			.where(and(inArray(coursePost.courseId, ids), reviewWhere()))
			.groupBy(coursePost.courseId),
		db
			.select({
				courseId: courseSale.courseId,
				sales: sql`count(*)::int`,
				gross: sql`coalesce(sum(${courseSale.grossCents}), 0)::int`,
				refunded: sql`coalesce(sum(${courseSale.refundedCents}), 0)::int`,
				owed: sql`coalesce(sum(case when ${courseSale.payoutId} is null then round((${courseSale.grossCents} - ${courseSale.refundedCents}) * ${courseSale.sharePct} / 100.0) else 0 end), 0)::int`,
				lastSale: sql`max(${courseSale.soldAt})`
			})
			.from(courseSale)
			.where(inArray(courseSale.courseId, ids))
			.groupBy(courseSale.courseId),
		db
			.select({
				courseId: courseEnrollment.courseId,
				paid: sql`count(*) filter (where ${courseEnrollment.source} = 'purchase')::int`,
				comp: sql`count(*) filter (where ${courseEnrollment.source} <> 'purchase')::int`
			})
			.from(courseEnrollment)
			.where(and(inArray(courseEnrollment.courseId, ids), isNull(courseEnrollment.revokedAt)))
			.groupBy(courseEnrollment.courseId),
		lastActions(ids, ['returned', 'unlisted', 'approved']),
		withMoney ? payoutsDue(nextPayDate(now)) : []
	]);
	const by = (rows) => new Map(rows.map((r) => [r.courseId ?? r.id, r]));
	const detailsBy = by(details);
	const pendingBy = by(pending);
	const heldBy = by(held);
	const moneyBy = by(money);
	const studentsBy = by(students);

	const courses = await Promise.all(
		base.map(async (c) => {
			const d = detailsBy.get(c.id);
			const full = {
				...c,
				description: d?.description ?? null,
				createdAt: d?.createdAt ?? null,
				returnedAt: actions.get(c.id, 'returned'),
				unlistedAt: actions.get(c.id, 'unlisted')
			};
			if (c.status === 'draft') full.problems = await readinessOf(full);
			const p = pendingBy.get(c.id);
			const h = heldBy.get(c.id);
			const m = moneyBy.get(c.id);
			const s = studentsBy.get(c.id);
			const problemsLive = liveProblems(full);
			return {
				...full,
				standing: withAttention(standing(full), {
					liveProblems: problemsLive,
					postsToReview: h ? Number(h.n) : 0
				}),
				problems: full.problems || [],
				liveProblems: problemsLive,
				pendingTopics: p ? Number(p.n) : 0,
				pendingSince: p?.oldest ? new Date(p.oldest) : null,
				postsToReview: h ? Number(h.n) : 0,
				postsSince: h?.oldest ? new Date(h.oldest) : null,
				paidStudents: s ? Number(s.paid) : 0,
				compStudents: s ? Number(s.comp) : 0,
				sales: m ? Number(m.sales) : 0,
				grossCents: m ? Number(m.gross) : 0,
				refundedCents: m ? Number(m.refunded) : 0,
				owedCents: m ? Number(m.owed) : 0,
				lastSaleAt: m?.lastSale ? new Date(m.lastSale) : null
			};
		})
	);

	// What's waiting on an admin, oldest first.
	const needsYou = [];
	for (const c of courses) {
		if (c.status === 'in_review')
			needsYou.push({
				kind: 'approval',
				course: c,
				since: c.submittedAt,
				text: `${c.author || 'A teacher'} sent “${c.title}” for approval`,
				action: 'Review course',
				href: `/classroom/courses/${c.id}/status`
			});
		if (c.postsToReview)
			needsYou.push({
				kind: 'posts',
				course: c,
				since: c.postsSince,
				text: `${c.postsToReview} discussion ${c.postsToReview === 1 ? 'post' : 'posts'} flagged in “${c.title}”`,
				detail: 'The teacher can clear these too.',
				action: 'Review posts',
				href: `/classroom/courses/${c.id}/discussion`
			});
		if (c.liveProblems.length)
			needsYou.push({
				kind: 'problem',
				course: c,
				since: c.firstPublishedAt,
				text: `“${c.title}” is live with problems: ${c.liveProblems.join(', ').toLowerCase()}`,
				detail: 'Buyers see this now. Ask the teacher to fix it, or unlist it.',
				action: 'Open course',
				href: `/classroom/courses/${c.id}/status`
			});
	}
	const payDate = nextPayDate(now);
	const payDay = new Date(`${payDate}T12:00:00Z`).toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});
	if (due.length) {
		const total = due.reduce((n, t) => n + t.cents, 0);
		const missed = due.filter((t) => t.overdue);
		needsYou.push({
			kind: missed.length ? 'payout-missed' : 'payout',
			since: null,
			payDate,
			cents: total,
			text: missed.length
				? `${missed.length} ${missed.length === 1 ? 'teacher has' : 'teachers have'} money from a pay date that was missed`
				: `${due.length} ${due.length === 1 ? 'teacher' : 'teachers'} to pay on ${payDay}`,
			detail: `${due.length} ${due.length === 1 ? 'teacher' : 'teachers'}, ${due.reduce((n, t) => n + t.sales, 0)} sales in total.`,
			action: 'Payouts',
			href: '/classroom/payouts'
		});
	}
	const rank = { 'payout-missed': 0, approval: 1, problem: 2, posts: 3, payout: 4 };
	needsYou.sort(
		(a, b) =>
			rank[a.kind] - rank[b.kind] ||
			new Date(a.since || now).getTime() - new Date(b.since || now).getTime()
	);

	// What's waiting on teachers.
	const waiting = [];
	for (const c of courses) {
		if (c.standing.stage === 'returned')
			waiting.push({
				kind: 'returned',
				course: c,
				since: c.standing.since,
				text: `“${c.title}” was returned to ${c.author || 'its teacher'}`,
				detail: `Your note: “${c.reviewNote}”`
			});
		else if (c.standing.stage === 'draft')
			waiting.push({
				kind: 'draft',
				course: c,
				since: c.updatedAt,
				text: `${c.author || 'A teacher'} is building “${c.title}”`,
				detail: c.problems.length
					? `Still to do before sending: ${c.problems.join(' ')}`
					: 'Ready to send, not sent yet.'
			});
		if (c.pendingTopics)
			waiting.push({
				kind: 'changes',
				course: c,
				since: c.pendingSince,
				text: `${c.pendingTopics} ${c.pendingTopics === 1 ? 'topic' : 'topics'} in “${c.title}” ${c.pendingTopics === 1 ? 'has' : 'have'} changes not put live`,
				detail: 'Students see the published version until the teacher presses Update topic.'
			});
	}
	waiting.sort((a, b) => new Date(a.since || now).getTime() - new Date(b.since || now).getTime());

	const count = (stage) => courses.filter((c) => c.standing.stage === stage).length;
	const sum = (k) => courses.reduce((n, c) => n + c[k], 0);
	return {
		courses,
		needsYou,
		waiting,
		payDate,
		historyAvailable: actions.available,
		figures: {
			live: count('live'),
			inReview: count('in_review'),
			returned: count('returned'),
			drafts: count('draft'),
			unlisted: count('unlisted'),
			students: sum('paidStudents') + sum('compStudents'),
			paidStudents: sum('paidStudents'),
			grossCents: sum('grossCents') - sum('refundedCents'),
			owedCents: sum('owedCents'),
			dueCents: due.reduce((n, t) => n + t.cents, 0)
		}
	};
}

// ------------------------------------------------------------ one course

const ACTION_TEXT = {
	created: 'Created the course',
	details_changed: 'Changed the details',
	submitted: 'Sent it for approval',
	withdrawn: 'Withdrew it from approval',
	returned: 'Returned it to the teacher',
	approved: 'Approved it: the course went live',
	unlisted: 'Unlisted it',
	listed: 'Listed it again',
	section_added: 'Added a section',
	section_renamed: 'Renamed a section',
	section_deleted: 'Deleted a section',
	outline_reordered: 'Reordered the outline',
	topic_added: 'Added a topic',
	topic_deleted: 'Deleted a topic',
	topic_published: 'Published a topic',
	topic_unpublished: 'Unpublished a topic',
	topic_updated: 'Put changes to a topic live',
	topic_changes_discarded: 'Discarded changes to a topic',
	topic_free_on: 'Made a topic free to read',
	topic_free_off: 'Stopped a topic being free to read',
	topic_address_changed: 'Changed a topic’s web address',
	student_added: 'Added a student for free',
	student_removed: 'Removed a student',
	student_muted: 'Muted a student in the discussion',
	student_unmuted: 'Unmuted a student',
	update_posted: 'Posted an update to students',
	post_approved: 'Approved a flagged post',
	post_removed: 'Removed a post'
};

/** The full picture of one course for its Status tab. */
export async function courseStatus(course, now = new Date()) {
	const [authorRow] = course.authorId
		? await db
				.select({
					firstName: userTable.firstName,
					lastName: userTable.lastName,
					email: userTable.email
				})
				.from(userTable)
				.where(eq(userTable.id, course.authorId))
				.limit(1)
		: [];
	const [topics, sales, enrollments, held, completions, logged, payouts] = await Promise.all([
		db
			.select({
				id: deskLesson.id,
				title: deskLesson.title,
				slug: deskLesson.slug,
				isPreview: deskLesson.isPreview,
				publishedAt: deskLesson.publishedAt,
				firstPublishedAt: deskLesson.firstPublishedAt,
				draftUpdatedAt: deskLesson.draftUpdatedAt,
				updatedAt: deskLesson.updatedAt,
				createdAt: deskLesson.createdAt,
				section: deskModule.title
			})
			.from(deskLesson)
			.innerJoin(deskModule, eq(deskLesson.moduleId, deskModule.id))
			.where(eq(deskLesson.courseId, course.id))
			.orderBy(asc(deskModule.position), asc(deskLesson.position)),
		db
			.select({
				id: courseSale.id,
				grossCents: courseSale.grossCents,
				refundedCents: courseSale.refundedCents,
				sharePct: courseSale.sharePct,
				soldAt: courseSale.soldAt,
				payableAt: courseSale.payableAt,
				payoutId: courseSale.payoutId
			})
			.from(courseSale)
			.where(eq(courseSale.courseId, course.id)),
		db
			.select({
				id: courseEnrollment.id,
				source: courseEnrollment.source,
				createdAt: courseEnrollment.createdAt,
				revokedAt: courseEnrollment.revokedAt,
				revokedReason: courseEnrollment.revokedReason,
				firstName: userTable.firstName,
				lastName: userTable.lastName,
				email: userTable.email
			})
			.from(courseEnrollment)
			.innerJoin(userTable, eq(courseEnrollment.userId, userTable.id))
			.where(eq(courseEnrollment.courseId, course.id))
			.orderBy(desc(courseEnrollment.createdAt)),
		db
			.select({ n: sql`count(*)::int`, oldest: sql`min(${coursePost.createdAt})` })
			.from(coursePost)
			.where(and(eq(coursePost.courseId, course.id), reviewWhere())),
		db
			.select({ lessonId: deskLessonProgress.lessonId, n: sql`count(*)::int` })
			.from(deskLessonProgress)
			.innerJoin(deskLesson, eq(deskLessonProgress.lessonId, deskLesson.id))
			.where(and(eq(deskLesson.courseId, course.id), isNotNull(deskLessonProgress.completedAt)))
			.groupBy(deskLessonProgress.lessonId),
		listActivity(course.id),
		db
			.select({
				id: teacherPayout.id,
				payDate: teacherPayout.payDate,
				paidAt: teacherPayout.paidAt,
				reference: teacherPayout.reference,
				cents: sql`sum(round((${courseSale.grossCents} - ${courseSale.refundedCents}) * ${courseSale.sharePct} / 100.0))::int`
			})
			.from(courseSale)
			.innerJoin(teacherPayout, eq(courseSale.payoutId, teacherPayout.id))
			.where(eq(courseSale.courseId, course.id))
			.groupBy(
				teacherPayout.id,
				teacherPayout.payDate,
				teacherPayout.paidAt,
				teacherPayout.reference
			)
	]);

	const liveTopics = topics.filter((t) => t.publishedAt).length;
	const full = {
		...course,
		author: nameOf(authorRow?.firstName, authorRow?.lastName, authorRow?.email || null),
		liveTopics,
		returnedAt: logged?.find((a) => a.kind === 'returned')?.createdAt || null,
		unlistedAt: logged?.find((a) => a.kind === 'unlisted')?.createdAt || null
	};
	full.problems = course.status === 'draft' ? await readinessOf(course) : [];
	const doneBy = new Map(completions.map((c) => [c.lessonId, Number(c.n)]));

	// Money.
	const nowMs = now.getTime();
	const gross = sales.reduce((n, s) => n + s.grossCents, 0);
	const refunded = sales.reduce((n, s) => n + s.refundedCents, 0);
	const share = sales.reduce((n, s) => n + shareOf(s), 0);
	const paidOut = sales.filter((s) => s.payoutId).reduce((n, s) => n + shareOf(s), 0);
	const onHold = sales
		.filter((s) => !s.payoutId && new Date(s.payableAt).getTime() > nowMs)
		.reduce((n, s) => n + shareOf(s), 0);
	const payable = share - paidOut - onHold;

	// The steps a course goes through, with when each happened.
	const steps = [
		{ id: 'draft', label: 'Built', at: course.createdAt, done: true },
		{
			id: 'submitted',
			label: 'Sent for approval',
			at: course.submittedAt,
			done: !!course.submittedAt || course.status !== 'draft'
		},
		{
			id: 'approved',
			label: 'Approved and live',
			at: course.firstPublishedAt,
			done: !!course.firstPublishedAt
		}
	];
	if (course.status === 'archived')
		steps.push({ id: 'unlisted', label: 'Unlisted', at: full.unlistedAt, done: true });

	// History: what was logged, plus what other tables show for certain.
	const events = (logged || []).map((a) => ({
		at: a.createdAt,
		who: a.actor,
		text: ACTION_TEXT[a.kind] || a.kind,
		kind: a.kind,
		note: a.note,
		topic: a.lessonTitle || a.data?.title || null,
		data: a.data
	}));
	const loggedKinds = new Set(events.map((e) => e.kind));
	if (!loggedKinds.has('created') && course.createdAt)
		events.push({
			at: course.createdAt,
			who: full.author,
			text: 'Created the course',
			kind: 'created'
		});
	if (!loggedKinds.has('approved') && course.firstPublishedAt)
		events.push({
			at: course.firstPublishedAt,
			text: 'Approved: the course went live',
			kind: 'approved'
		});
	if (!loggedKinds.has('submitted') && course.submittedAt)
		events.push({
			at: course.submittedAt,
			who: full.author,
			text: 'Sent it for approval',
			kind: 'submitted'
		});
	for (const e of enrollments)
		events.push({
			at: e.createdAt,
			who: nameOf(e.firstName, e.lastName, e.email),
			text: e.source === 'purchase' ? 'Bought the course' : 'Was added for free',
			kind: e.source === 'purchase' ? 'sale' : 'comp',
			note: e.revokedAt ? `Access removed later (${e.revokedReason || 'removed'})` : null
		});
	for (const p of payouts)
		events.push({
			at: p.paidAt,
			text: `Teacher paid ${(Number(p.cents) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} for this course (pay date ${p.payDate})`,
			kind: 'payout',
			note: p.reference ? `Reference: ${p.reference}` : null
		});
	events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

	const problemsLive = liveProblems({ ...full, description: course.description });
	const postsToReview = Number(held[0]?.n) || 0;
	return {
		standing: withAttention(standing(full), { liveProblems: problemsLive, postsToReview }),
		author: full.author,
		authorEmail: authorRow?.email || null,
		problems: full.problems,
		liveProblems: problemsLive,
		steps,
		postsToReview,
		postsSince: held[0]?.oldest ? new Date(held[0].oldest) : null,
		topics: topics.map((t) => ({
			...t,
			state: !t.publishedAt ? 'draft' : t.draftUpdatedAt ? 'changes' : 'published',
			completions: doneBy.get(t.id) || 0
		})),
		students: {
			paid: enrollments.filter((e) => !e.revokedAt && e.source === 'purchase').length,
			comp: enrollments.filter((e) => !e.revokedAt && e.source !== 'purchase').length,
			removed: enrollments.filter((e) => e.revokedAt).length
		},
		money: {
			sales: sales.length,
			grossCents: gross,
			refundedCents: refunded,
			shareCents: share,
			paidOutCents: paidOut,
			payableCents: payable,
			onHoldCents: onHold,
			platformCents: gross - refunded - share
		},
		events,
		historyAvailable: logged !== null
	};
}
