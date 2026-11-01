import { error } from '@sveltejs/kit';
import { listPublishedCourses } from '$lib/server/desk/courses.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { courseForReader } from '$lib/server/courses/reader.js';
import { listCards, publicCard } from '$lib/server/payments/cards.js';
import { acceptConfig } from '$lib/server/payments/accept-config.js';
import { discussionRole, listThreads } from '$lib/server/courses/discussion.js';

export async function load({ params, locals, setHeaders, depends }) {
	depends('academy:course');
	const r = await courseForReader(params.slug, locals.user);
	if (!r) error(404, 'Course not found');
	const { course, owner, enrollment, syllabus, topics } = r;

	setHeaders({
		'cache-control': locals.user
			? 'private, no-store'
			: 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
		vary: 'Cookie'
	});

	const all = await listPublishedCourses({ limit: 12 }).catch(() => []);
	const related = all.filter((c) => c.slug !== course.slug).slice(0, 3);

	const open = topics.filter((t) => t.access === 'open');
	const done = open.filter((t) => t.done).length;
	const resume =
		(enrollment?.lastLessonId && topics.find((t) => t.id === enrollment.lastLessonId)) ||
		open.find((t) => !t.done) ||
		open[0] ||
		null;
	const buying = !!locals.user && !owner && !enrollment && course.price > 0;

	// The Discussion tab: the newest few threads for the course's students
	// (and its teacher); everyone else sees who it's for.
	const role = await discussionRole(locals.user, course);
	const threads = role.read ? await listThreads(course, locals.user).catch(() => []) : [];

	return {
		course: { ...course, syllabus },
		related,
		isPremiumMember: userHasPremiumAccess(locals.user),
		signedIn: !!locals.user,
		owner,
		enrolled: !!enrollment,
		progress: enrollment
			? {
					done,
					total: open.length,
					lockedForPremium: topics.filter((t) => t.access === 'locked-premium').length
				}
			: null,
		resume: resume ? { slug: resume.slug, title: resume.title } : null,
		firstFree: topics.find((t) => t.isPreview && t.access === 'open') || null,
		discussion: {
			read: role.read,
			post: role.post,
			muted: role.muted,
			total: threads.length,
			topics: role.post ? topics.map((t) => ({ id: t.id, title: t.title })) : [],
			threads: threads.slice(0, 5).map((t) => ({
				id: t.id,
				kind: t.kind,
				title: t.title,
				excerpt: t.excerpt,
				pinned: t.pinned,
				locked: t.locked,
				status: t.status,
				mine: t.mine,
				author: t.author,
				isTeacher: t.isTeacher,
				lesson: t.lesson,
				replies: t.replies,
				lastReply: t.lastReply,
				at: t.lastReplyAt || t.createdAt
			}))
		},
		savedCards: buying ? (await listCards(locals.user.id)).map(publicCard) : [],
		accept: buying ? acceptConfig() : null
	};
}
