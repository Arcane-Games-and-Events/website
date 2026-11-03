/**
 * AGE Studios projects: the Studio adds a card for each (an interactive
 * page, stats, software, a film), and /studios lists the published ones.
 * Also: old AGE Studios addresses land on their new pages.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db/index.js';
import { deskMedia } from '$lib/server/db/schema.js';
import { cleanHref, publicProjects } from '$lib/server/studio/projects.js';
import { POST as createRoute } from '../../src/routes/api/studio/projects/+server.js';
import {
	DELETE as deleteRoute,
	PATCH as patchRoute
} from '../../src/routes/api/studio/projects/[id]/+server.js';
import { load as projectsPage } from '../../src/routes/studios/projects/+page.server.js';
import { handle } from '../../src/hooks.server.js';
import { createUser } from '../support/factories.js';
import { callRoute } from '../support/courses.js';

let producer;
beforeEach(async () => {
	producer = await createUser({ additionalRoles: ['producer'] });
});

const create = (body, user = producer) => callRoute(createRoute, { user, body });
const patch = (id, body, user = producer) =>
	callRoute(patchRoute, { method: 'PATCH', params: { id }, user, body });

async function cover() {
	const id = randomUUID();
	const [row] = await db
		.insert(deskMedia)
		.values({
			id,
			uploadedBy: producer.id,
			storagePath: `${id}/original.jpg`,
			url: `https://x.test/${id}.jpg`,
			mimeType: 'image/jpeg',
			status: 'ready',
			library: 'studio'
		})
		.returning();
	return row;
}

/** A project, published. */
async function published(fields = {}) {
	const img = await cover();
	const { body } = await create({
		title: 'Top 100 Players',
		type: 'interactive',
		href: '/studios/top-100',
		coverImageId: img.id,
		...fields
	});
	const r = await patch(body.project.id, { status: 'published' });
	expect(r.status).toBe(200);
	return r.body.project;
}

describe('the Studio’s projects', () => {
	test('only the Studio’s people can add them', async () => {
		expect((await create({ title: 'X' }, null)).status).toBe(401);
		expect((await create({ title: 'X' }, await createUser())).status).toBe(403);
		const r = await create({ title: 'Hero meta', type: 'stats' });
		expect(r.status).toBe(201);
		expect(r.body.project).toMatchObject({
			title: 'Hero meta',
			slug: 'hero-meta',
			type: 'stats',
			status: 'draft'
		});
	});

	test('a link is a page on the site or an https address, nothing else', () => {
		expect(cleanHref('/studios/top-100')).toBe('/studios/top-100');
		expect(cleanHref('https://tools.age.events/deck')).toBe('https://tools.age.events/deck');
		expect(cleanHref('')).toBeNull();
		for (const bad of ['javascript:alert(1)', 'http://x.test', '//evil.test', 'ftp://x.test'])
			expect(() => cleanHref(bad)).toThrow();
	});

	test('publishing needs a link and a cover; the first publish dates it', async () => {
		const { body } = await create({ title: 'Deck tool', type: 'software' });
		const refused = await patch(body.project.id, { status: 'published' });
		expect(refused.status).toBe(400);
		expect(refused.body.message).toMatch(/link/);

		const img = await cover();
		await patch(body.project.id, { href: 'https://tools.test/deck', coverImageId: img.id });
		const ok = await patch(body.project.id, { status: 'published' });
		expect(ok.body.project.status).toBe('published');
		expect(ok.body.project.publishedAt).toBeTruthy();
		expect((await patch(body.project.id, { type: 'nonsense' })).status).toBe(400);
	});

	test('AGE Studios shows published ones, featured first, by kind, with their covers', async () => {
		await published({ title: 'Older', type: 'stats' });
		await published({ title: 'Lead', type: 'interactive', isFeatured: true });
		await create({ title: 'Draft', type: 'stats' });

		const all = await publicProjects();
		expect(all.map((p) => p.title)).toEqual(['Lead', 'Older']);
		expect(all[0]).toMatchObject({ external: false, cover: { src: expect.any(String) } });
		expect((await publicProjects({ type: 'stats' })).map((p) => p.title)).toEqual(['Older']);

		const page = await projectsPage({
			url: new URL('http://localhost/studios/projects?type=stats'),
			setHeaders: () => {}
		});
		expect(page.type).toBe('stats');
		expect(page.projects.map((p) => p.title)).toEqual(['Older']);
		expect(page.counts).toMatchObject({ stats: 1, interactive: 1, software: 0 });
	});

	test('deleting a card takes it off AGE Studios', async () => {
		const p = await published({ href: 'https://example.test/film', type: 'film' });
		expect((await publicProjects())[0].external).toBe(true);
		const r = await callRoute(deleteRoute, {
			method: 'DELETE',
			params: { id: p.id },
			user: producer
		});
		expect(r.status).toBe(200);
		expect(await publicProjects()).toEqual([]);
	});
});

describe('old AGE Studios addresses', () => {
	/** Where a GET for `path` is sent, or null if it isn't. */
	async function lands(path) {
		const url = new URL(`http://localhost${path}`);
		try {
			await handle({
				event: { request: new Request(url), url, cookies: { get: () => undefined }, locals: {} },
				resolve: () => new Response('ok')
			});
			return null;
		} catch (err) {
			if (err?.status === 301) return err.location;
			throw err;
		}
	}

	test('gameplay, the network and the old sections move to their new pages', async () => {
		expect(await lands('/studios/gameplay?hero=Fai')).toBe('/library/matches?hero=Fai');
		expect(await lands('/studios/network')).toBe('/studios/partners');
		expect(await lands('/studios/network/cardcast/vid00000001')).toBe(
			'/studios/partners/cardcast/vid00000001'
		);
		expect(await lands('/studios/podcasts')).toBe('/studios/shows');
		expect(await lands('/studios/interviews')).toBe('/studios/shows');
	});
});
