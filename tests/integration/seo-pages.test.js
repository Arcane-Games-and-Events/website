/**
 * The sitemap and llms.txt: live pieces, public events and published
 * courses are in; drafts, unpublished events and draft courses are not.
 */
import { describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db/index.js';
import { deskEntry, event } from '$lib/server/db/schema.js';
import { publicPages } from '$lib/server/seo/pages.js';
import { llmsText } from '$lib/server/seo/llms.js';
import { GET as robots } from '../../src/routes/robots.txt/+server.js';
import { createUser } from '../support/factories.js';

const slug = (s) => `${s}-${randomUUID().slice(0, 6)}`;

describe('sitemap and llms.txt', () => {
	test('only what the public can open', async () => {
		const writer = await createUser({ additionalRoles: ['writer'] });
		const live = slug('live-piece');
		const draft = slug('draft-piece');
		await db.insert(deskEntry).values([
			{
				title: 'Live piece',
				slug: live,
				authorId: writer.id,
				status: 'published',
				publishedAt: new Date(),
				excerpt: 'Hidden ||Briar wins|| here.'
			},
			{ title: 'Draft piece', slug: draft, authorId: writer.id, status: 'draft' }
		]);
		const ok = `ev-${randomUUID().slice(0, 6)}`;
		const hidden = `ev-${randomUUID().slice(0, 6)}`;
		const soon = new Date(Date.now() + 7 * 86400000);
		await db.insert(event).values([
			{ id: ok, title: 'Open One', price: '40.00', eventDate: soon, status: 'upcoming' },
			{ id: hidden, title: 'Open Hidden', price: '40.00', eventDate: soon, status: 'unpublished' }
		]);

		const paths = (await publicPages()).map((p) => p.path);
		expect(paths).toContain('/');
		expect(paths).toContain(`/library/${live}`);
		expect(paths).not.toContain(`/library/${draft}`);
		expect(paths).toContain(`/ageopen/${ok}`);
		expect(paths).not.toContain(`/ageopen/${hidden}`);

		const text = await llmsText('https://www.age.events');
		expect(text).toContain(`[Live piece](https://www.age.events/library/${live}) (Article, Free)`);
		expect(text).not.toContain('Briar wins');
		expect(text).not.toContain('Draft piece');
		expect(text).toContain('Open One');
		expect(text).not.toContain('Open Hidden');
	});

	test('robots.txt keeps private areas out and points to the sitemap', async () => {
		const res = robots({ url: new URL('https://www.age.events/robots.txt') });
		const body = await res.text();
		expect(body).toContain('Disallow: /admin');
		expect(body).toContain('User-agent: ClaudeBot');
		expect(body).toContain('Sitemap: https://www.age.events/sitemap.xml');
		expect(body).not.toMatch(/Disallow: \/studios/);
	});
});
