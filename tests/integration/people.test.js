/**
 * People pages: every writer and teacher gets /people/<handle> with what
 * they've made for AGE, and their bylines and course pages link to it.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskAuthorProfile, deskEntry } from '$lib/server/db/schema.js';
import { handleFor } from '$lib/server/profile/handles.js';
import { getCourseWithDrafts } from '$lib/server/desk/courses.js';
import { load } from '../../src/routes/people/[handle]/+page.server.js';
import { GET as oldAuthorPage } from '../../src/routes/library/author/[authorSlug]/+server.js';
import { createUser } from '../support/factories.js';
import { createTeacher, liveCourse, readyCourse } from '../support/courses.js';

let writer;
beforeEach(async () => {
	writer = await createUser({ firstName: 'Wren', lastName: 'Okafor', additionalRoles: ['writer'] });
});

async function piece(author, overrides = {}) {
	const [row] = await db
		.insert(deskEntry)
		.values({
			title: 'A piece',
			slug: `piece-${randomUUID().slice(0, 8)}`,
			authorId: author.id,
			status: 'published',
			publishedAt: new Date(),
			accessMode: 'free',
			readTime: 6,
			...overrides
		})
		.returning();
	return row;
}

const page = (handle) =>
	load({ params: { handle }, setHeaders: () => {} }).catch((e) => ({ status: e.status }));

describe('handles', () => {
	test('made from the name they go by, then kept when it changes', async () => {
		await db.insert(deskAuthorProfile).values({ userId: writer.id, displayName: 'Wren Ó Kafor' });
		expect(await handleFor(writer.id)).toBe('wren-o-kafor');
		await db
			.update(deskAuthorProfile)
			.set({ displayName: 'Someone Else' })
			.where(eq(deskAuthorProfile.userId, writer.id));
		expect(await handleFor(writer.id)).toBe('wren-o-kafor');
	});

	test('two people with the same name get different handles', async () => {
		const twin = await createUser({ firstName: 'Wren', lastName: 'Okafor' });
		expect(await handleFor(writer.id)).toBe('wren-okafor');
		expect(await handleFor(twin.id)).toBe('wren-okafor-2');
	});

	test('no user, no handle', async () => {
		expect(await handleFor('nobody')).toBeNull();
		expect(await handleFor(null)).toBeNull();
	});
});

describe('the people page', () => {
	test('a writer: their published pieces, newest first, with their profile', async () => {
		await db
			.insert(deskAuthorProfile)
			.values({ userId: writer.id, title: 'Staff writer', bio: 'I write about blocking.' });
		await piece(writer, { title: 'First steps', publishedAt: new Date('2025-03-01') });
		await piece(writer, { title: 'Second wind' });
		await piece(writer, { title: 'Draft', status: 'draft', publishedAt: null });

		const { person } = await page(await handleFor(writer.id));
		expect(person).toMatchObject({
			name: 'Wren Okafor',
			title: 'Staff writer',
			bio: 'I write about blocking.'
		});
		expect(person.entries.map((e) => e.title)).toEqual(['Second wind', 'First steps']);
		expect(person.courses).toEqual([]);
	});

	test('a teacher: their live courses, never drafts', async () => {
		const teacher = await createTeacher({ firstName: 'Tess', lastName: 'Ramirez' });
		await liveCourse(teacher, { title: 'Blocking 101' });
		await readyCourse(teacher, { title: 'Still a draft' });

		const { person } = await page(await handleFor(teacher.id));
		expect(person.courses.map((c) => c.title)).toEqual(['Blocking 101']);
		expect(person.entries).toEqual([]);
	});

	test('someone with nothing public, or an unknown handle, is a 404', async () => {
		await piece(writer, { status: 'draft', publishedAt: null });
		expect(await page(await handleFor(writer.id))).toEqual({ status: 404 });
		expect(await page('nobody-here')).toEqual({ status: 404 });
		expect(await page('Not A Handle!')).toEqual({ status: 404 });
	});
});

describe('links to it', () => {
	test('a course page knows its teacher’s handle', async () => {
		const teacher = await createTeacher({ firstName: 'Tess', lastName: 'Ramirez' });
		const { course } = await liveCourse(teacher);
		const c = await getCourseWithDrafts(course.slug);
		expect(c.author.handle).toBe('tess-ramirez');
	});

	test('old /library/author links go to the people page', async () => {
		const res = await Promise.resolve()
			.then(() => oldAuthorPage({ params: { authorSlug: 'wren-okafor' } }))
			.catch((e) => e);
		expect(res).toMatchObject({ status: 301, location: '/people/wren-okafor' });
	});

	test('migration 039 backfill gives existing writers a handle', async () => {
		await piece(writer);
		await db.execute(
			sql.raw(
				(await import('node:fs')).readFileSync('supabase/migrations/039_people_handles.sql', 'utf8')
			)
		);
		const [row] = await db
			.select({ userId: deskAuthorProfile.userId })
			.from(deskAuthorProfile)
			.where(eq(deskAuthorProfile.userId, writer.id));
		expect(row).toBeTruthy();
		expect(await handleFor(writer.id)).toBe('wren-okafor');
	});
});
