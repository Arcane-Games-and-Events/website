/**
 * The Desk and the Classroom are separate tools. The Desk holds articles,
 * videos and gameplay for writers, editors and admins; the Classroom holds
 * courses for teachers, editors and admins (money is admins only). Each has
 * its own image library, and pickers only ever show their own.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db/index.js';
import { deskMedia } from '$lib/server/db/schema.js';
import { load as deskLayout } from '../../src/routes/desk/+layout.server.js';
import { load as classroomLayout } from '../../src/routes/classroom/+layout.server.js';
import { GET as mediaRoute } from '../../src/routes/api/desk/media/+server.js';
import { POST as reviewRoute } from '../../src/routes/api/desk/courses/[id]/review/+server.js';
import { POST as payoutRoute } from '../../src/routes/api/desk/payouts/+server.js';
import { canManage, listMedia } from '$lib/server/media/library.js';
import { areasFor } from '$lib/server/video/list.js';
import { createAdmin, createUser } from '../support/factories.js';
import { callRoute, createTeacher, readyCourse } from '../support/courses.js';

let admin;
let editor;
let writer;
let teacher;

beforeEach(async () => {
	admin = await createAdmin();
	editor = await createUser({ additionalRoles: ['editor'] });
	writer = await createUser({ additionalRoles: ['writer'] });
	teacher = await createTeacher();
});

/** Run a layout load and return where it redirected, or 'ok'. */
async function landing(load, user, path) {
	try {
		await load({ locals: { user }, url: new URL(`http://localhost${path}`) });
		return 'ok';
	} catch (err) {
		if (err?.status >= 300 && err?.status < 400) return err.location;
		throw err;
	}
}

async function image(owner, library) {
	const id = randomUUID();
	const [row] = await db
		.insert(deskMedia)
		.values({
			id,
			uploadedBy: owner.id,
			storagePath: `${id}/original.jpg`,
			url: `https://x.test/${id}.jpg`,
			mimeType: 'image/jpeg',
			name: `${library} image`,
			status: 'ready',
			library
		})
		.returning();
	return row;
}

const listAs = async (user, library) =>
	callRoute(mediaRoute, {
		method: 'GET',
		user,
		url: `http://localhost/api/desk/media?library=${library}`
	});

describe('who reaches which tool', () => {
	test('teachers who only teach go to the Classroom, not the Desk', async () => {
		expect(await landing(deskLayout, teacher, '/desk')).toBe('/classroom');
		expect(await landing(classroomLayout, teacher, '/classroom')).toBe('ok');
	});

	test('writers have the Desk but not the Classroom', async () => {
		expect(await landing(deskLayout, writer, '/desk')).toBe('ok');
		expect(await landing(classroomLayout, writer, '/classroom')).toBe('/');
	});

	test('admins and editors have both', async () => {
		for (const u of [admin, editor]) {
			expect(await landing(deskLayout, u, '/desk')).toBe('ok');
			expect(await landing(classroomLayout, u, '/classroom')).toBe('ok');
		}
	});

	test('course videos are the Classroom’s', () => {
		expect(areasFor(teacher)).toMatchObject({ gameplay: false, articles: false, courses: true });
		expect(areasFor(editor)).toMatchObject({ courses: true, allCourses: true });
		expect(areasFor(writer).courses).toBe(false);
	});
});

describe('two image libraries', () => {
	test('each library lists only its own images', async () => {
		const article = await image(writer, 'content');
		const cover = await image(teacher, 'classroom');

		const desk = await listMedia(admin, { library: 'content' });
		const classroom = await listMedia(admin, { library: 'classroom' });
		expect(desk.items.map((i) => i.id)).toContain(article.id);
		expect(desk.items.map((i) => i.id)).not.toContain(cover.id);
		expect(classroom.items.map((i) => i.id)).toEqual([cover.id]);
	});

	test('teachers only use the Classroom’s library, writers only the Desk’s', async () => {
		await image(teacher, 'classroom');
		expect((await listAs(teacher, 'classroom')).status).toBe(200);
		expect((await listAs(teacher, 'content')).status).toBe(403);
		expect((await listAs(writer, 'classroom')).status).toBe(403);
		expect((await listAs(writer, 'content')).status).toBe(200);
	});

	test('editors see every Classroom image; a teacher sees their own', async () => {
		const other = await createTeacher();
		const mine = await image(teacher, 'classroom');
		const theirs = await image(other, 'classroom');
		const r = await listAs(editor, 'classroom');
		expect(r.body.items.map((i) => i.id).sort()).toEqual([mine.id, theirs.id].sort());
		const t = await listAs(teacher, 'classroom');
		expect(t.body.items.map((i) => i.id)).toEqual([mine.id]);
	});

	test('nobody manages an image from the other tool’s library', async () => {
		const article = await image(admin, 'content');
		const cover = await image(teacher, 'classroom');
		expect(canManage(teacher, cover)).toBe(true);
		expect(canManage(teacher, article)).toBe(false);
		expect(canManage(writer, cover)).toBe(false);
		expect(canManage(editor, cover)).toBe(true);
	});
});

describe('editors in the Classroom', () => {
	test('approve courses, but don’t touch money', async () => {
		const { course } = await readyCourse(teacher);
		const params = { id: course.id };
		await callRoute(reviewRoute, { params, user: teacher, body: { action: 'submit' } });
		const r = await callRoute(reviewRoute, { params, user: editor, body: { action: 'approve' } });
		expect(r.status).toBe(200);
		expect(r.body.course.status).toBe('published');

		const pay = await callRoute(payoutRoute, {
			user: editor,
			body: { teacherId: teacher.id, payDate: '2026-11-13' }
		});
		expect(pay.status).toBe(403);
	});
});
