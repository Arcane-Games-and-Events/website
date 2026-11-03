/**
 * Profiles: one per person (photo, title, bio), edited from the account page
 * (photo), the Desk and the Classroom, and shown in "Your instructor" on a
 * teacher's course pages. Uploads need storage, which tests don't have, so
 * photos here are rows put in place directly.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskAuthorProfile, deskMedia } from '$lib/server/db/schema.js';
import { actions as classroomProfile } from '../../src/routes/classroom/profile/+page.server.js';
import { actions as deskProfile } from '../../src/routes/desk/profile/+page.server.js';
import {
	POST as photoPost,
	DELETE as photoDelete
} from '../../src/routes/api/account/photo/+server.js';
import { getAuthorProfile, parseTeacherProfile } from '$lib/server/desk/authorProfile.js';
import { getCourseWithDrafts } from '$lib/server/desk/courses.js';
import { listMedia } from '$lib/server/media/library.js';
import { createAdmin, createUser } from '../support/factories.js';
import { callAction } from '../support/actions.js';
import { callRoute, createMedia, createTeacher, readyCourse } from '../support/courses.js';

let teacher;
beforeEach(async () => {
	teacher = await createTeacher({ firstName: 'Tess', lastName: 'Ramirez' });
});

/** A profile photo as the upload would leave it. */
async function givePhoto(user) {
	const row = await createMedia(user);
	await db.update(deskMedia).set({ library: 'profile' }).where(eq(deskMedia.id, row.id));
	await db
		.insert(deskAuthorProfile)
		.values({ userId: user.id, avatarMediaId: row.id })
		.onConflictDoUpdate({ target: deskAuthorProfile.userId, set: { avatarMediaId: row.id } });
	return row;
}

describe('editing a profile', () => {
	test('the Classroom saves the title and bio, and keeps the photo and Desk links', async () => {
		const photo = await givePhoto(teacher);
		await db
			.update(deskAuthorProfile)
			.set({ displayName: 'Tess R.', links: [{ platform: 'website', url: 'https://x.test' }] })
			.where(eq(deskAuthorProfile.userId, teacher.id));

		const r = await callAction(classroomProfile, 'save', {
			user: teacher,
			fields: { title: 'Guardian specialist', bio: 'First paragraph.\n\nSecond paragraph.' }
		});
		expect(r.status).toBe(200);
		const { profile } = await getAuthorProfile(teacher.id);
		expect(profile).toMatchObject({
			title: 'Guardian specialist',
			bio: 'First paragraph.\n\nSecond paragraph.',
			displayName: 'Tess R.'
		});
		expect(profile.avatar.id).toBe(photo.id);
		expect(profile.links).toHaveLength(1);
	});

	test('saving the Desk profile never clears the photo', async () => {
		const writer = await createUser({ additionalRoles: ['writer'] });
		const photo = await givePhoto(writer);
		const r = await callAction(deskProfile, 'save', {
			user: writer,
			fields: { displayName: 'Wren', title: 'Staff writer', bio: '', links: '[]' }
		});
		expect(r.status).toBe(200);
		expect((await getAuthorProfile(writer.id)).profile.avatar.id).toBe(photo.id);
	});

	test('a bio over the limit is refused', () => {
		expect(parseTeacherProfile({ title: 'x', bio: 'a'.repeat(601) }).ok).toBe(false);
		expect(parseTeacherProfile({ title: '  ', bio: '' })).toEqual({
			ok: true,
			value: { title: null, bio: null }
		});
	});
});

describe('profile photos', () => {
	test('anyone signed in can remove theirs; it is deleted, not left behind', async () => {
		const member = await createUser();
		const photo = await givePhoto(member);
		const r = await callRoute(photoDelete, { method: 'DELETE', user: member });
		expect(r.status).toBe(200);
		expect((await getAuthorProfile(member.id)).profile.avatar).toBeNull();
		expect(await db.select().from(deskMedia).where(eq(deskMedia.id, photo.id))).toHaveLength(0);
	});

	test('a library image someone chose as their photo is never deleted with it', async () => {
		const writer = await createUser({ additionalRoles: ['writer'] });
		const libraryImage = await createMedia(writer); // 'content' library
		await db
			.insert(deskAuthorProfile)
			.values({ userId: writer.id, avatarMediaId: libraryImage.id });
		await callRoute(photoDelete, { method: 'DELETE', user: writer });
		expect(await db.select().from(deskMedia).where(eq(deskMedia.id, libraryImage.id))).toHaveLength(
			1
		);
	});

	test('uploading needs a signed-in user and a file', async () => {
		expect((await callRoute(photoPost, { user: null, body: {} })).status).toBe(401);
		const res = await photoPost({
			request: new Request('http://localhost/api/account/photo', {
				method: 'POST',
				body: new FormData()
			}),
			locals: { user: await createUser() }
		}).catch((e) => e);
		expect(res.status).toBe(400);
	});

	test('profile photos never show in an image picker', async () => {
		const admin = await createAdmin();
		await givePhoto(admin);
		for (const library of ['content', 'classroom', 'studio'])
			expect((await listMedia(admin, { library })).items).toHaveLength(0);
	});
});

describe('Your instructor on the course page', () => {
	test('shows the teacher’s photo, title and bio', async () => {
		const { course } = await readyCourse(teacher, { title: 'Blocking' });
		let c = await getCourseWithDrafts(course.slug);
		expect(c.author).toMatchObject({ name: 'Tess Ramirez' });
		expect(c.author.photo).toBeUndefined();

		const photo = await givePhoto(teacher);
		await callAction(classroomProfile, 'save', {
			user: teacher,
			fields: { title: 'Two-time finalist', bio: 'I teach defense.' }
		});
		c = await getCourseWithDrafts(course.slug);
		expect(c.author).toMatchObject({
			name: 'Tess Ramirez',
			title: 'Two-time finalist',
			bio: 'I teach defense.',
			photo: photo.url
		});
	});
});
