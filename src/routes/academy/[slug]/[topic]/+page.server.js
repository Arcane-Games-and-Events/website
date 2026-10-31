import { error } from '@sveltejs/kit';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { courseForReader, topicBody } from '$lib/server/courses/reader.js';
import { openLesson } from '$lib/server/courses/progress.js';
import { extractEntryCardNames, resolveCardImages } from '$lib/server/desk/entryData.js';
import { mediaImagesById } from '$lib/server/media/library.js';
import { extractMediaIds } from '$lib/desk/render/lexical-utils.js';

/**
 * One topic of a course. Open to its students (topics added after they
 * enrolled need Premium), to everyone when it's Free to read, and to the
 * course's teacher, drafts included.
 */
export async function load({ params, locals, setHeaders }) {
	const r = await courseForReader(params.slug, locals.user);
	if (!r) error(404, 'Course not found');
	const { course, owner, enrollment, syllabus, topics } = r;
	const i = topics.findIndex((t) => t.slug === params.topic);
	if (i < 0) error(404, 'Topic not found');
	const lesson = topics[i];

	setHeaders({
		'cache-control': locals.user
			? 'private, no-store'
			: 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
		vary: 'Cookie'
	});

	let body = null;
	let pending = null;
	let cardImages = {};
	let media = {};
	if (lesson.access === 'open') {
		const row = await topicBody(lesson, { fresh: owner });
		body = row?.body || null;
		if (row?.pendingChanges) pending = { title: row.title || null };
		if (body) {
			const names = extractEntryCardNames(body);
			[cardImages, media] = await Promise.all([
				names.size ? resolveCardImages(names) : {},
				mediaImagesById(extractMediaIds(body))
			]);
		}
		if (enrollment) await openLesson(enrollment, lesson.id);
	}

	const open = topics.filter((t) => t.access === 'open');
	const strip = (t) => (t ? { slug: t.slug, title: t.title, access: t.access } : null);
	return {
		course: {
			id: course.id,
			slug: course.slug,
			title: course.title,
			price: course.price,
			author: course.author,
			status: course.status
		},
		syllabus,
		lesson: {
			id: lesson.id,
			slug: lesson.slug,
			title: pending?.title || lesson.title,
			sectionTitle: lesson.sectionTitle,
			no: lesson.no,
			minutes: lesson.minutes,
			isPreview: lesson.isPreview,
			publishedAt: lesson.publishedAt,
			access: lesson.access,
			done: lesson.done
		},
		body,
		cardImages,
		media,
		prev: strip(topics[i - 1]),
		next: strip(topics[i + 1]),
		owner,
		// The teacher is previewing changes students don't see yet.
		previewingChanges: !!pending,
		enrolled: !!enrollment,
		signedIn: !!locals.user,
		isPremiumMember: userHasPremiumAccess(locals.user),
		progress: { done: open.filter((t) => t.done).length, total: open.length }
	};
}
