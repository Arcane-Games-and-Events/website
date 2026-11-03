/**
 * The Classroom home (/classroom): one page for teachers, admins and
 * editors, with more on it the more someone oversees.
 *
 * - Everyone who teaches: their courses with where each stands and what's
 *   next, the steps waiting on them, their updates, analytics across their
 *   courses and their earnings.
 * - Admins and editors, on top: the approval pipeline of every course, what's
 *   waiting on an admin, flagged posts, and figures for the whole Classroom.
 *   Money (sales, what's owed, payouts) is for admins only.
 */
import { canOverseeCourses, isAdmin, isTeacher } from '$lib/server/auth/roles.js';
import { mediaImagesById } from '$lib/server/media/library.js';
import { classroomAnalytics } from './analytics.js';
import { reviewQueue } from './discussion.js';
import { teacherEarnings } from './earnings.js';
import { listNotifications } from './notifications.js';
import { courseOversight } from './oversight.js';

/** Where a course's checklist item is fixed. */
const FIX = { details: 'details', outline: 'outline' };

/**
 * What a teacher has to do next, most pressing first: courses sent back,
 * courses ready to send, unfinished drafts, flagged posts, topics with
 * changes not live, and live courses with something missing.
 * @param {any[]} courses  from courseOversight()
 */
export function nextSteps(courses) {
	const steps = [];
	for (const c of courses) {
		const base = `/classroom/courses/${c.id}`;
		const stage = c.standing.stage;
		if (stage === 'returned')
			steps.push({
				kind: 'returned',
				course: pick(c),
				since: c.standing.since,
				text: `“${c.title}” came back with a note`,
				note: c.reviewNote,
				detail: c.problems.length
					? `Fix it, then send it again. Still missing: ${c.problems.join(' ').toLowerCase()}`
					: 'Make the changes, then send it again.',
				action: 'Fix and resend',
				href: base
			});
		else if (stage === 'draft' && !c.problems.length)
			steps.push({
				kind: 'ready',
				course: pick(c),
				since: c.updatedAt,
				text: `“${c.title}” is ready to send for approval`,
				detail:
					'Everything on the checklist is done. An admin approves a course once, then it’s yours to run.',
				action: 'Send for approval',
				href: `${base}?send=1`
			});
		else if (stage === 'draft') {
			const first = c.readiness?.find((i) => !i.done);
			steps.push({
				kind: 'building',
				course: pick(c),
				since: c.updatedAt,
				text: `Keep building “${c.title}”`,
				detail: `${c.problems.length} ${c.problems.length === 1 ? 'thing' : 'things'} before you can send it: ${c.problems.join(' ').toLowerCase()}`,
				action: first ? first.problem.replace(/\.$/, '') : 'Open',
				href: first ? `${base}/${FIX[first.fix]}` : base
			});
		}
		if (c.postsToReview)
			steps.push({
				kind: 'posts',
				course: pick(c),
				since: c.postsSince,
				text: `${c.postsToReview} discussion ${c.postsToReview === 1 ? 'post' : 'posts'} waiting for you in “${c.title}”`,
				detail: 'Held by the filter or reported by students. Approve or remove them.',
				action: 'Review',
				href: `${base}/discussion`
			});
		if (c.pendingTopics)
			steps.push({
				kind: 'changes',
				course: pick(c),
				since: c.pendingSince,
				text: `${c.pendingTopics} ${c.pendingTopics === 1 ? 'topic has' : 'topics have'} changes students can’t see yet`,
				detail: `In “${c.title}”. Press Update topic when you’re happy with them.`,
				action: 'Open outline',
				href: `${base}/outline`
			});
		if (c.liveProblems.length)
			steps.push({
				kind: 'problem',
				course: pick(c),
				since: c.firstPublishedAt,
				text: `“${c.title}” is live with ${c.liveProblems.join(', ').toLowerCase()}`,
				detail: 'Buyers see this now.',
				action: c.liveProblems.includes('No published topics') ? 'Open outline' : 'Fix details',
				href: c.liveProblems.includes('No published topics') ? `${base}/outline` : `${base}/details`
			});
	}
	const rank = { returned: 0, problem: 1, posts: 2, ready: 3, changes: 4, building: 5 };
	return steps.sort(
		(a, b) =>
			rank[a.kind] - rank[b.kind] ||
			new Date(a.since || 0).getTime() - new Date(b.since || 0).getTime()
	);
}

const pick = (c) => ({ id: c.id, title: c.title });

/** The fields a course card needs, with its cover image. */
function card(c, images) {
	return {
		id: c.id,
		slug: c.slug,
		title: c.title,
		status: c.status,
		price: c.price,
		author: c.author,
		authorId: c.authorId,
		cover: (c.coverImageId && images[c.coverImageId]) || null,
		standing: c.standing,
		readiness: c.readiness,
		problems: c.problems,
		liveProblems: c.liveProblems,
		reviewNote: c.reviewNote,
		submittedAt: c.submittedAt,
		firstPublishedAt: c.firstPublishedAt,
		updatedAt: c.updatedAt,
		topics: c.topics,
		liveTopics: c.liveTopics,
		pendingTopics: c.pendingTopics,
		postsToReview: c.postsToReview,
		students: c.paidStudents + c.compStudents,
		paidStudents: c.paidStudents,
		compStudents: c.compStudents,
		monthCents: c.monthCents,
		grossCents: c.grossCents - c.refundedCents,
		owedCents: c.owedCents
	};
}

/**
 * Everything the Classroom home shows to this user.
 * @param {any} user
 * @param {{ days?: number, now?: Date }} [opts]
 */
export async function classroomHome(user, { days = 30, now = new Date() } = {}) {
	const oversee = canOverseeCourses(user);
	const money = isAdmin(user);

	const oversight = oversee
		? await courseOversight(user, now, { money, all: true })
		: await courseOversight(user, now, { money: false, all: false });
	const mineFull = oversight.courses.filter((c) => c.authorId === user.id);

	const coverIds = oversight.courses.map((c) => c.coverImageId).filter(Boolean);
	const flagged = oversee ? oversight.courses.filter((c) => c.postsToReview).map((c) => c.id) : [];
	const [images, updates, report, earnings, queue] = await Promise.all([
		mediaImagesById(coverIds),
		listNotifications(user.id, { scope: 'classroom', limit: 30 }),
		// Teachers see their own courses' numbers; admins and editors the whole Classroom's.
		classroomAnalytics(
			(oversee ? oversight.courses : mineFull).map((c) => c.id),
			days
		),
		isTeacher(user) || mineFull.length ? teacherEarnings(user.id, { now }) : null,
		flagged.length ? reviewQueue(flagged) : []
	]);

	const mine = mineFull.map((c) => card(c, images));
	const out = {
		oversee,
		money,
		days,
		mine,
		steps: nextSteps(mineFull),
		updates,
		report,
		earnings: earnings
			? {
					next: earnings.next,
					totals: earnings.totals
				}
			: null
	};
	if (!oversee) return out;

	// Money is for admins: editors' copies of every course leave it out.
	const all = oversight.courses.map((c) => {
		const x = card(c, images);
		if (!money) {
			x.grossCents = 0;
			x.owedCents = 0;
			x.monthCents = 0;
		}
		return x;
	});
	return {
		...out,
		all,
		needsYou: oversight.needsYou.map((n) => ({ ...n, course: n.course ? pick(n.course) : null })),
		figures: money
			? oversight.figures
			: { ...oversight.figures, grossCents: 0, owedCents: 0, dueCents: 0 },
		payDate: oversight.payDate,
		queue
	};
}
