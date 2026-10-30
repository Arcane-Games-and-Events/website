/**
 * Library tags against a real database: one tag per entry, new tags made
 * from a name without near-duplicates, and the entry API's tag checks.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskEntryTag, deskTag } from '$lib/server/db/schema.js';
import {
	cleanTagName,
	findOrCreateTag,
	getEntryTag,
	listTags,
	setEntryTag
} from '$lib/server/desk/tags.js';
import * as entryRoute from '../../src/routes/api/desk/entries/[id]/+server.js';
import * as tagsRoute from '../../src/routes/api/desk/tags/+server.js';
import { createUser } from '../support/factories.js';

let writer;

beforeEach(async () => {
	writer = await createUser({ additionalRoles: ['writer'] });
});

async function createEntry(overrides = {}) {
	const [row] = await db
		.insert(deskEntry)
		.values({
			title: 'A piece',
			slug: `piece-${randomUUID().slice(0, 8)}`,
			authorId: writer.id,
			status: 'draft',
			...overrides
		})
		.returning();
	return row;
}

const request = (user, params, body, method = 'POST') => ({
	params,
	locals: { user },
	request: new Request('http://test/api', {
		method,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body ?? {})
	})
});
const status = async (fn) => {
	try {
		return (await fn()).status;
	} catch (err) {
		return err.status;
	}
};

describe('tag names', () => {
	test('are trimmed, single-spaced and capped at 40 characters', () => {
		expect(cleanTagName('  Deck   Tech ')).toBe('Deck Tech');
		expect(cleanTagName('x'.repeat(60))).toHaveLength(40);
	});

	test('a name that makes an existing address returns that tag', async () => {
		const first = await findOrCreateTag('Deck Tech');
		expect(first.created).toBe(true);
		expect(first.tag.slug).toBe('deck-tech');
		const again = await findOrCreateTag('deck  tech');
		expect(again.created).toBe(false);
		expect(again.tag.id).toBe(first.tag.id);
	});

	test('a name with no letters or numbers is refused', async () => {
		await expect(findOrCreateTag(' !! ')).rejects.toMatchObject({ status: 400 });
	});
});

describe('one tag per entry', () => {
	test('setting a tag replaces the one before', async () => {
		const entry = await createEntry();
		const { tag: a } = await findOrCreateTag('Strategy');
		const { tag: b } = await findOrCreateTag('Feature');
		expect(await setEntryTag(entry.id, a.id)).toBe(true);
		expect(await setEntryTag(entry.id, a.id)).toBe(false);
		expect(await setEntryTag(entry.id, b.id)).toBe(true);
		const rows = await db.select().from(deskEntryTag).where(eq(deskEntryTag.entryId, entry.id));
		expect(rows).toEqual([{ entryId: entry.id, tagId: b.id }]);
		expect((await getEntryTag(entry.id))?.name).toBe('Feature');
		expect(await setEntryTag(entry.id, null)).toBe(true);
		expect(await getEntryTag(entry.id)).toBeNull();
	});

	test('the database refuses a second tag on an entry', async () => {
		const entry = await createEntry();
		const { tag: a } = await findOrCreateTag('Strategy');
		const { tag: b } = await findOrCreateTag('Feature');
		await db.insert(deskEntryTag).values({ entryId: entry.id, tagId: a.id });
		await expect(
			db.insert(deskEntryTag).values({ entryId: entry.id, tagId: b.id })
		).rejects.toThrow();
	});

	test('listTags counts entries, and live ones separately', async () => {
		const { tag } = await findOrCreateTag('Dispatch');
		await setEntryTag((await createEntry()).id, tag.id);
		await setEntryTag(
			(await createEntry({ status: 'published', publishedAt: new Date() })).id,
			tag.id
		);
		const row = (await listTags()).find((t) => t.id === tag.id);
		expect(row).toMatchObject({ count: 2, live: 1 });
	});
});

describe('the API', () => {
	test('a writer can make a tag and file their entry under it', async () => {
		const made = await tagsRoute.POST(request(writer, {}, { name: 'Set Review' }));
		expect(made.status).toBe(201);
		const { tag } = await made.json();
		const entry = await createEntry();
		const res = await entryRoute.PATCH(
			request(writer, { id: entry.id }, { tagId: tag.id }, 'PATCH')
		);
		expect(res.status).toBe(200);
		expect((await getEntryTag(entry.id))?.slug).toBe('set-review');
		await entryRoute.PATCH(request(writer, { id: entry.id }, { tagId: null }, 'PATCH'));
		expect(await getEntryTag(entry.id)).toBeNull();
	});

	test('an unknown tag is refused', async () => {
		const entry = await createEntry();
		expect(
			await status(() =>
				entryRoute.PATCH(request(writer, { id: entry.id }, { tagId: randomUUID() }, 'PATCH'))
			)
		).toBe(400);
		expect(
			await status(() =>
				entryRoute.PATCH(request(writer, { id: entry.id }, { tagId: 'not-a-uuid' }, 'PATCH'))
			)
		).toBe(400);
	});

	test('readers can’t list or make tags', async () => {
		const reader = await createUser();
		expect(await status(() => tagsRoute.GET({ locals: { user: reader } }))).toBe(403);
		expect(await status(() => tagsRoute.POST(request(reader, {}, { name: 'X' })))).toBe(403);
		expect((await db.select().from(deskTag).where(eq(deskTag.slug, 'x'))).length).toBe(0);
	});
});
