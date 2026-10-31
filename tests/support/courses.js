/**
 * Course fixtures and a way to call API route handlers directly.
 *
 *   const teacher = await createTeacher();
 *   const { course, sections, topics } = await liveCourse(teacher, { price: '50.00' });
 *   const r = await callRoute(PATCH, { params: { id: course.id }, user: teacher, body: {...} });
 *   r.status, r.body
 */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { courseEnrollment, deskCourse, deskLesson, deskMedia } from '$lib/server/db/schema.js';
import {
	approveCourse,
	createCourse,
	createSection,
	createTopic,
	outlineOf,
	publishTopic,
	updateCourse,
	updateTopic
} from '$lib/server/courses/builder.js';
import { createUser } from './factories.js';

export const createTeacher = (overrides = {}) =>
	createUser({ additionalRoles: ['creator'], ...overrides });

/** A short Lexical document with one paragraph. */
export const doc = (text = 'Some words about the topic.') => ({
	root: {
		type: 'root',
		version: 1,
		children: [
			{
				type: 'paragraph',
				version: 1,
				children: [
					{ type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' }
				]
			}
		]
	}
});

export async function createMedia(owner) {
	const id = randomUUID();
	const [row] = await db
		.insert(deskMedia)
		.values({
			id,
			uploadedBy: owner.id,
			storagePath: `${id}/original.jpg`,
			url: `https://x.test/cms-media/${id}/original.jpg`,
			mimeType: 'image/jpeg',
			name: `Image ${id.slice(0, 4)}`,
			width: 1200,
			height: 675,
			status: 'ready'
		})
		.returning();
	return row;
}

const reload = async (id) => (await db.select().from(deskCourse).where(eq(deskCourse.id, id)))[0];

/**
 * A course ready to send for review: description, cover, and `topics`
 * published topics across two sections (the last `drafts` unpublished).
 */
export async function readyCourse(
	teacher,
	{ title = 'Pitch Fundamentals', price = '40.00', topics = 3, drafts = 0 } = {}
) {
	let course = await createCourse(teacher, { title });
	const cover = await createMedia(teacher);
	course = await updateCourse(course, { description: 'Learn it.', coverImageId: cover.id, price });
	const [first] = await outlineOf(course.id);
	const second = await createSection(course.id, { title: 'Section 2' });
	const made = [];
	for (let i = 0; i < topics + drafts; i++) {
		const sectionId = i % 2 === 0 ? first.id : second.id;
		let t = await createTopic(course.id, { sectionId, title: `Topic ${i + 1}` });
		t = await updateTopic(t, { body: doc(`Topic ${i + 1} body`) });
		if (i < topics) t = await publishTopic(course, t, teacher);
		made.push(t);
	}
	return { course: await reload(course.id), sections: [first, second], topics: made };
}

/** A course that an admin has approved, so it's live. */
export async function liveCourse(teacher, opts = {}) {
	const r = await readyCourse(teacher, opts);
	await db.update(deskCourse).set({ status: 'in_review' }).where(eq(deskCourse.id, r.course.id));
	const course = await approveCourse(await reload(r.course.id));
	const topics = await db.select().from(deskLesson).where(eq(deskLesson.courseId, course.id));
	return { ...r, course, topics: r.topics.map((t) => topics.find((x) => x.id === t.id)) };
}

/** Enrol a student directly (as a comp), optionally back-dated. */
export async function enrol(course, student, { at = new Date(), source = 'comp' } = {}) {
	const [row] = await db
		.insert(courseEnrollment)
		.values({ courseId: course.id, userId: student.id, source, createdAt: at })
		.returning();
	return row;
}

/**
 * Call a +server.js handler as SvelteKit would. Thrown `error()`s become a
 * status and `{ message }`, like the real response.
 */
export async function callRoute(
	handler,
	{ params = {}, user = null, body, method = 'POST', url = 'http://localhost/api/test' } = {}
) {
	const request = new Request(url, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body === undefined || method === 'GET' ? undefined : JSON.stringify(body)
	});
	try {
		const res = await handler({
			params,
			request,
			url: new URL(url),
			locals: { user, session: null },
			cookies: { get: () => undefined, set: () => {}, delete: () => {} },
			getClientAddress: () => '127.0.0.1'
		});
		return { status: res.status, body: await res.json().catch(() => null) };
	} catch (err) {
		if (err?.status && err?.body) return { status: err.status, body: err.body };
		throw err;
	}
}
