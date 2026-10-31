/**
 * Editing a live course: changes to a published topic wait for the
 * teacher's Update, so students never read a half-finished rewrite.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskLesson } from '$lib/server/db/schema.js';
import { PATCH as topicRoute } from '../../src/routes/api/desk/courses/[id]/topics/[topicId]/+server.js';
import { POST as changesRoute } from '../../src/routes/api/desk/courses/[id]/topics/[topicId]/changes/+server.js';
import { POST as publishRoute } from '../../src/routes/api/desk/courses/[id]/topics/[topicId]/publish/+server.js';
import { outlineOf } from '$lib/server/courses/builder.js';
import { courseForReader, topicBody } from '$lib/server/courses/reader.js';
import { createUser } from '../support/factories.js';
import {
	callRoute,
	createTeacher,
	doc,
	enrol,
	liveCourse,
	readyCourse
} from '../support/courses.js';

let teacher;
let course;
let topic;

beforeEach(async () => {
	teacher = await createTeacher();
	({
		course,
		topics: [topic]
	} = await liveCourse(teacher));
});

const row = async (id = topic.id) =>
	(await db.select().from(deskLesson).where(eq(deskLesson.id, id)))[0];
const edit = (body, t = topic, c = course) =>
	callRoute(topicRoute, {
		method: 'PATCH',
		params: { id: c.id, topicId: t.id },
		user: teacher,
		body
	});
const changes = (action, t = topic) =>
	callRoute(changesRoute, {
		params: { id: course.id, topicId: t.id },
		user: teacher,
		body: { action }
	});

/** What a student reads for this topic. */
async function studentView(student) {
	const r = await courseForReader(course.slug, student);
	const t = r.topics.find((x) => x.id === topic.id);
	return { title: t.title, body: (await topicBody(t))?.body };
}

describe('a published topic in a live course', () => {
	test('edits save privately; students keep the published version until Update', async () => {
		const student = await createUser();
		await enrol(course, student);
		const before = await studentView(student);

		const r = await edit({ title: 'Rewritten', body: doc('A whole new take.') });
		expect(r.status).toBe(200);
		expect(r.body.topic).toMatchObject({ title: 'Rewritten', pendingChanges: true });

		expect(await studentView(student)).toEqual(before);
		const [section] = await outlineOf(course.id);
		expect(section.topics.find((t) => t.id === topic.id)).toMatchObject({
			title: 'Rewritten',
			pendingChanges: true
		});

		const applied = await changes('apply');
		expect(applied.status).toBe(200);
		expect(applied.body.topic.pendingChanges).toBe(false);
		const after = await studentView(student);
		expect(after.title).toBe('Rewritten');
		expect(JSON.stringify(after.body)).toContain('A whole new take.');
		expect((await row()).draftUpdatedAt).toBeNull();
	});

	test('the teacher’s preview shows the pending changes', async () => {
		await edit({ title: 'Preview me', body: doc('Draft words.') });
		const preview = await topicBody(topic, { fresh: true });
		expect(preview).toMatchObject({ title: 'Preview me', pendingChanges: true });
		expect(JSON.stringify(preview.body)).toContain('Draft words.');
	});

	test('editing only the body keeps the title, and the draft is a whole topic', async () => {
		await edit({ body: doc('Just the body.') });
		const r = await row();
		expect(r.draftTitle).toBe(topic.title);
		await changes('apply');
		expect((await row()).title).toBe(topic.title);
	});

	test('discard throws the changes away', async () => {
		const live = await row();
		await edit({ title: 'Oops', body: doc('Never mind.') });
		const r = await changes('discard');
		expect(r.body.topic).toMatchObject({ title: live.title, pendingChanges: false });
		const now = await row();
		expect(now.body).toEqual(live.body);
		expect(now.draftBody).toBeNull();
		expect((await changes('apply')).status).toBe(409);
	});

	test('an empty rewrite can’t go live', async () => {
		await edit({ body: null });
		const r = await changes('apply');
		expect(r.status).toBe(400);
		expect((await row()).body).not.toBeNull();
	});

	test('Free to read and the address still apply at once', async () => {
		await edit({ isPreview: true });
		expect((await row()).isPreview).toBe(true);
		expect((await row()).draftUpdatedAt).toBeNull();
	});

	test('unpublishing keeps the pending changes as the topic itself', async () => {
		await edit({ title: 'Folded in', body: doc('Kept.') });
		const r = await callRoute(publishRoute, {
			params: { id: course.id, topicId: topic.id },
			user: teacher,
			body: { publish: false }
		});
		expect(r.status).toBe(200);
		const now = await row();
		expect(now).toMatchObject({ title: 'Folded in', publishedAt: null, draftUpdatedAt: null });
	});
});

describe('when edits save straight through', () => {
	test('a course that isn’t live yet', async () => {
		const { course: draft, topics } = await readyCourse(teacher, { title: 'Not live' });
		await edit({ title: 'Direct' }, topics[0], draft);
		expect((await row(topics[0].id)).title).toBe('Direct');
	});

	test('an unpublished topic in a live course', async () => {
		const { course: draft, topics } = await readyCourse(teacher, {
			title: 'Has a draft',
			topics: 1,
			drafts: 1
		});
		const unpublished = topics[1];
		expect(unpublished.publishedAt).toBeNull();
		await edit({ title: 'Direct too' }, unpublished, draft);
		expect((await row(unpublished.id)).title).toBe('Direct too');
	});
});
