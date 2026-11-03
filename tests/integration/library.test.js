/**
 * The Library: searching articles and videos on the server, one search
 * across articles, videos and matches, the drawer counts and topics, and
 * old single-page addresses landing in the right drawer.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskEntryTag, deskTag, vod } from '$lib/server/db/schema.js';
import { libraryCounts, libraryTopics, searchEntries } from '$lib/server/desk/list.js';
import { drawerCounts, searchLibrary } from '$lib/server/library/search.js';
import { load as libraryLoad } from '../../src/routes/library/+page.server.js';
import { load as articlesLoad } from '../../src/routes/library/articles/+page.server.js';
import { createUser } from '../support/factories.js';

let writer;
const tags = {};
beforeEach(async () => {
	writer = await createUser({ firstName: 'Mara', lastName: 'Quill' });
	for (const [slug, name] of [
		['set-review', 'Set Review'],
		['strategy', 'Strategy']
	]) {
		const [t] = await db.insert(deskTag).values({ slug, name }).returning();
		tags[slug] = t;
	}
});

/** A live piece (or not, with overrides), optionally filed under a topic. */
async function piece({ tag, daysAgo = 1, ...fields } = {}) {
	const [row] = await db
		.insert(deskEntry)
		.values({
			title: 'A piece',
			slug: `piece-${randomUUID().slice(0, 8)}`,
			authorId: writer.id,
			status: 'published',
			publishedAt: new Date(Date.now() - daysAgo * 864e5),
			accessMode: 'free',
			...fields
		})
		.returning();
	if (tag) await db.insert(deskEntryTag).values({ entryId: row.id, tagId: tags[tag].id });
	return row;
}

const titles = (r) => r.items.map((i) => i.title);

describe('searching the shelves', () => {
	test('articles and videos are separate drawers; drafts and future pieces stay out', async () => {
		await piece({ title: 'Reading the meta', daysAgo: 2 });
		await piece({ title: 'Deck tech', videoProvider: 'youtube', daysAgo: 1 });
		await piece({ title: 'Draft', status: 'draft' });
		await piece({
			title: 'Next week',
			status: 'scheduled',
			scheduledFor: new Date(Date.now() + 864e5)
		});
		await piece({
			title: 'Went live',
			status: 'scheduled',
			scheduledFor: new Date(Date.now() - 3600e3),
			daysAgo: 3
		});

		expect(titles(await searchEntries({ kind: 'article' }))).toEqual([
			'Reading the meta',
			'Went live'
		]);
		expect(titles(await searchEntries({ kind: 'video' }))).toEqual(['Deck tech']);
		expect(titles(await searchEntries({ sort: 'oldest' }))).toEqual([
			'Went live',
			'Reading the meta',
			'Deck tech'
		]);
		expect(await libraryCounts()).toEqual({ articles: 2, videos: 1 });
	});

	test('search finds the title, the summary, the writer and the topic', async () => {
		await piece({ title: 'Blitz openers', excerpt: 'How to start fast.' });
		await piece({ title: 'Untitled', tag: 'set-review' });
		const other = await createUser({ firstName: 'Ben', lastName: 'Ash' });
		await piece({ title: 'By Ben', authorId: other.id });

		expect(titles(await searchEntries({ q: 'blitz' }))).toEqual(['Blitz openers']);
		expect(titles(await searchEntries({ q: 'start fast' }))).toEqual(['Blitz openers']);
		expect(titles(await searchEntries({ q: 'ben ash' }))).toEqual(['By Ben']);
		expect(titles(await searchEntries({ q: 'review' }))).toEqual(['Untitled']);
		expect(titles(await searchEntries({ q: '100%' }))).toEqual([]);
	});

	test('access and topic narrow it; pages split it', async () => {
		await piece({ title: 'Free one', tag: 'strategy' });
		await piece({ title: 'Paid one', accessMode: 'premium', tag: 'strategy' });
		await piece({ title: 'Review', tag: 'set-review' });
		expect(titles(await searchEntries({ access: 'premium' }))).toEqual(['Paid one']);
		expect(titles(await searchEntries({ tag: 'strategy' })).sort()).toEqual([
			'Free one',
			'Paid one'
		]);

		const p2 = await searchEntries({ perPage: 2, page: 2 });
		expect(p2).toMatchObject({ total: 3, page: 2, totalPages: 2 });
		expect(p2.items).toHaveLength(1);

		expect(await libraryTopics()).toEqual([
			{ name: 'Strategy', slug: 'strategy', count: 2 },
			{ name: 'Set Review', slug: 'set-review', count: 1 }
		]);
	});
});

describe('one search for everything', () => {
	test('groups articles, videos and matches, with how many of each', async () => {
		await piece({ title: 'Kano deep dive' });
		await piece({ title: 'Kano on video', videoProvider: 'mux' });
		await db.insert(vod).values({
			title: 'Kano vs Fai',
			kind: 'gameplay',
			player1Hero: 'Kano',
			status: 'ready',
			isPublished: true,
			publishedAt: new Date(),
			muxPlaybackId: 'pb',
			muxAssetId: `as-${randomUUID().slice(0, 6)}`
		});
		const found = await searchLibrary('kano');
		expect(found.articles.items.map((a) => a.title)).toEqual(['Kano deep dive']);
		expect(found.videos.items.map((a) => a.title)).toEqual(['Kano on video']);
		expect(found.matches.items.map((m) => m.title)).toEqual(['Kano vs Fai']);
		expect(found.total).toBe(3);
		expect(await drawerCounts()).toEqual({ articles: 1, videos: 1, matches: 1, topics: 0 });
	});
});

describe('the reading room', () => {
	const at = async (load, path) => {
		try {
			await load({ url: new URL(`http://localhost${path}`), setHeaders: () => {} });
			return null;
		} catch (err) {
			if (err?.status >= 300 && err?.status < 400) return err.location;
			throw err;
		}
	};

	test('old single-page addresses land in the right drawer', async () => {
		expect(await at(libraryLoad, '/library')).toBeNull();
		expect(await at(libraryLoad, '/library?kind=video')).toBe('/library/videos');
		expect(await at(libraryLoad, '/library?kind=article&access=premium')).toBe(
			'/library/articles?access=premium'
		);
		expect(await at(libraryLoad, '/library?tier=premium')).toBe('/library/articles?access=premium');
		expect(await at(libraryLoad, '/library?tag=Set%20Review')).toBe(
			'/library/articles?tag=set-review'
		);
		expect(await at(libraryLoad, '/library?q=kano')).toBe('/library/search?q=kano');
		expect(await at(libraryLoad, '/library?topic=set-review')).toBe('/library/tag/set-review');
		expect(await at(libraryLoad, '/library?series=sage')).toBe('/library/search?q=sage');
	});

	test('a drawer reads its filters from the address', async () => {
		await piece({ title: 'Paid', accessMode: 'premium', tag: 'strategy' });
		await piece({ title: 'Free', tag: 'strategy' });
		const data = await articlesLoad({
			url: new URL('http://localhost/library/articles?access=premium&tag=strategy&sort=bogus'),
			setHeaders: () => {}
		});
		expect(data.filters).toEqual({ q: '', access: 'premium', tag: 'strategy', sort: 'newest' });
		expect(data.stories.map((s) => s.title)).toEqual(['Paid']);
		expect(data.stories[0]).toMatchObject({ rubric: 'Strategy', kind: 'article', premium: true });
	});
});
