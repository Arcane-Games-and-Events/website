/**
 * Summaries fit on one line of a card: 150 characters. A new or growing
 * summary over that is refused; one written before the limit can still be
 * saved while it's being shortened. Summaries made from the body fit too.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskEntry } from '$lib/server/db/schema.js';
import { deriveExcerpt } from '$lib/server/desk/entries.js';
import { EXCERPT_MAX } from '$lib/desk/limits.js';
import * as entryRoute from '../../src/routes/api/desk/entries/[id]/+server.js';
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

const patch = async (entry, body) => {
	try {
		const res = await entryRoute.PATCH({
			params: { id: entry.id },
			locals: { user: writer },
			request: new Request('http://test/api', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			})
		});
		return res.status;
	} catch (err) {
		return err.status;
	}
};
const saved = async (entry) =>
	(await db.select().from(deskEntry).where(eq(deskEntry.id, entry.id)))[0].excerpt;

describe('the summary limit', () => {
	test('up to 150 characters saves; more is refused', async () => {
		const entry = await createEntry();
		expect(await patch(entry, { excerpt: 'x'.repeat(EXCERPT_MAX) })).toBe(200);
		expect(await patch(entry, { excerpt: 'x'.repeat(EXCERPT_MAX + 1) })).toBe(400);
		expect(await saved(entry)).toHaveLength(EXCERPT_MAX);
	});

	test('an older, longer summary saves while it shrinks, never while it grows', async () => {
		const entry = await createEntry({ excerpt: 'y'.repeat(200) });
		expect(await patch(entry, { title: 'Renamed', excerpt: 'y'.repeat(200) })).toBe(200);
		expect(await patch(entry, { excerpt: 'y'.repeat(180) })).toBe(200);
		expect(await patch(entry, { excerpt: 'y'.repeat(190) })).toBe(400);
		expect(await saved(entry)).toHaveLength(180);
	});

	test('a summary made from the body fits, cut at a word', () => {
		const words = 'Kano rewards the player who reads the arcane pool first, every single turn. ';
		const body = {
			root: {
				type: 'root',
				children: [{ type: 'paragraph', children: [{ type: 'text', text: words.repeat(5) }] }]
			}
		};
		const excerpt = deriveExcerpt(body);
		expect(excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX);
		expect(excerpt.endsWith('…')).toBe(true);
		expect(words.repeat(5)).toContain(excerpt.slice(0, -1));
	});
});
