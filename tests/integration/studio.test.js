/**
 * The Studio: who can use it, its media (gameplay, podcast episodes,
 * interviews, video) and shows, its image library, and how it all reaches
 * readers on AGE Studios (/studios) — including Premium on the player.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskMedia, vod } from '$lib/server/db/schema.js';
import mux from '$lib/server/mux.js';
import { load as studioLayout } from '../../src/routes/studio/+layout.server.js';
import { load as deskLayout } from '../../src/routes/desk/+layout.server.js';
import { load as classroomLayout } from '../../src/routes/classroom/+layout.server.js';
import { load as playerLoad } from '../../src/routes/studios/[id=uuid]/+page.server.js';
import { POST as createRoute } from '../../src/routes/api/desk/videos/vod/+server.js';
import { PATCH as itemRoute } from '../../src/routes/api/desk/videos/[target]/[id]/+server.js';
import { POST as showsRoute } from '../../src/routes/api/studio/shows/+server.js';
import { DELETE as deleteShowRoute } from '../../src/routes/api/studio/shows/[id]/+server.js';
import { canManage, listMedia } from '$lib/server/media/library.js';
import { canManageVideoOf } from '$lib/server/video/mux.js';
import { studioHome } from '$lib/server/studio/list.js';
import { archive, latest, playerItem, showPage, watchHome } from '$lib/server/studio/public.js';
import { createAdmin, createUser } from '../support/factories.js';
import { callRoute } from '../support/courses.js';

let admin, editor, producer, writer, member, visitor;

beforeEach(async () => {
	admin = await createAdmin();
	editor = await createUser({ additionalRoles: ['editor'] });
	producer = await createUser({ additionalRoles: ['producer'] });
	writer = await createUser({ additionalRoles: ['writer'] });
	member = await createUser({ role: 'premium', subscriptionStatus: 'active' });
	visitor = await createUser();
	mux.jwt.signPlaybackId = vi.fn(async () => ({ 'playback-token': 'pt', 'thumbnail-token': 'tt' }));
});

async function landing(load, user, path) {
	try {
		await load({ locals: { user }, url: new URL(`http://localhost${path}`) });
		return 'ok';
	} catch (err) {
		if (err?.status >= 300 && err?.status < 400) return err.location;
		throw err;
	}
}

const create = (user, body) => callRoute(createRoute, { user, body });
const patch = (user, id, body) =>
	callRoute(itemRoute, { method: 'PATCH', params: { target: 'vod', id }, user, body });
const newShow = async (body = {}) =>
	(await callRoute(showsRoute, { user: producer, body: { name: 'Cardboard Hour', ...body } })).body
		.show;

/** A published, ready item, as if Mux had finished processing it. */
async function live(fields) {
	const [row] = await db
		.insert(vod)
		.values({
			title: 'Item',
			status: 'ready',
			muxPlaybackId: `pb_${randomUUID().slice(0, 6)}`,
			muxAssetId: `as_${randomUUID().slice(0, 6)}`,
			isPublished: true,
			publishedAt: new Date(),
			isPremium: false,
			...fields
		})
		.returning();
	return row;
}

async function image(library = 'studio') {
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
			library
		})
		.returning();
	return row;
}

describe('who uses the Studio', () => {
	test('producers get the Studio only; admins and editors get it too; writers don’t', async () => {
		expect(await landing(studioLayout, producer, '/studio')).toBe('ok');
		expect(await landing(deskLayout, producer, '/desk')).toBe('/');
		expect(await landing(classroomLayout, producer, '/classroom')).toBe('/');
		for (const u of [admin, editor]) expect(await landing(studioLayout, u, '/studio')).toBe('ok');
		expect(await landing(studioLayout, writer, '/studio')).toBe('/');
	});

	test('producers manage Studio media; writers can’t create it', async () => {
		const row = await live({ kind: 'gameplay' });
		expect(await canManageVideoOf(producer, 'vod', row)).toBe(true);
		expect(await canManageVideoOf(writer, 'vod', row)).toBe(false);
		expect((await create(writer, { title: 'Nope' })).status).toBe(403);
	});
});

describe('media and shows', () => {
	test('an episode belongs to a podcast, can be audio, and carries its number and guests', async () => {
		const show = await newShow();
		expect(show).toMatchObject({ slug: 'cardboard-hour', kind: 'podcast' });
		const r = await create(producer, {
			kind: 'podcast',
			mediaType: 'audio',
			title: 'Ep. 1',
			showId: show.id,
			season: 1,
			episodeNumber: '3',
			guests: 'Ana Lopez'
		});
		expect(r.status).toBe(201);
		expect(r.body.vod).toMatchObject({
			kind: 'podcast',
			mediaType: 'audio',
			showId: show.id,
			season: 1,
			episodeNumber: 3,
			guests: 'Ana Lopez'
		});
	});

	test('only podcasts can be audio, and gameplay never has a show', async () => {
		const show = await newShow();
		const r = await create(producer, {
			kind: 'gameplay',
			mediaType: 'audio',
			title: 'Match',
			showId: show.id
		});
		expect(r.body.vod).toMatchObject({ kind: 'gameplay', mediaType: 'video', showId: null });
		expect((await create(producer, { kind: 'radio', title: 'x' })).status).toBe(400);
	});

	test('publishing waits for the file; audio needs a cover; an episode needs its podcast', async () => {
		const r = await create(producer, { kind: 'podcast', mediaType: 'audio', title: 'Ep' });
		const id = r.body.vod.id;
		expect((await patch(producer, id, { isPublished: true })).status).toBe(409);

		await db.update(vod).set({ status: 'ready' }).where(eq(vod.id, id));
		const blocked = await patch(producer, id, { isPublished: true });
		expect(blocked.status).toBe(400);
		expect(blocked.body.message).toMatch(/cover image/);
		expect(blocked.body.message).toMatch(/podcast/);

		const show = await newShow();
		const cover = await image();
		const ok = await patch(producer, id, {
			showId: show.id,
			coverImageId: cover.id,
			isPublished: true
		});
		expect(ok.status).toBe(200);
		expect(ok.body.vod.isPublished).toBe(true);
	});

	test('a show with episodes can’t be deleted', async () => {
		const show = await newShow();
		await live({ kind: 'podcast', showId: show.id });
		const r = await callRoute(deleteShowRoute, {
			method: 'DELETE',
			params: { id: show.id },
			user: producer
		});
		expect(r.status).toBe(409);
	});

	test('the Studio home counts what’s live and lists what’s still in production', async () => {
		await live({ kind: 'gameplay' });
		await live({ kind: 'interview' });
		await live({ kind: 'gameplay', isPublished: false });
		await db.insert(vod).values({ title: 'Uploading', status: 'waiting', kind: 'video' });
		const h = await studioHome();
		expect(h.figures).toMatchObject({ gameplay: 1, interview: 1, podcast: 0, video: 0 });
		expect(h.inProduction.map((i) => i.stage).sort()).toEqual(['draft', 'no-file']);
	});
});

describe('the Studio’s image library', () => {
	test('is its own: producers use it; others’ libraries are closed to them', async () => {
		const studioImg = await image('studio');
		const deskImg = await image('content');
		const listed = await listMedia(producer, { library: 'studio' });
		expect(listed.items.map((i) => i.id)).toEqual([studioImg.id]);
		expect(canManage(producer, studioImg)).toBe(true);
		expect(canManage(producer, deskImg)).toBe(false);
		expect(canManage(writer, studioImg)).toBe(false);
	});
});

describe('AGE Studios', () => {
	test('the front room groups what’s live by kind, newest first', async () => {
		const show = await newShow();
		await live({ kind: 'gameplay', title: 'Old match', publishedAt: new Date(Date.now() - 864e5) });
		await live({ kind: 'podcast', title: 'Episode', showId: show.id });
		await live({ kind: 'interview', title: 'Chat' });
		await live({ kind: 'gameplay', title: 'Hidden', isPublished: false });
		const h = await watchHome();
		expect(h.counts).toEqual({ gameplay: 1, podcast: 1, interview: 1 });
		expect(h.gameplay.map((g) => g.title)).toEqual(['Old match']);
		expect(h.podcasts[0]).toMatchObject({ title: 'Episode', show: { slug: 'cardboard-hour' } });
		expect(h.shows.map((s) => s.name)).toEqual(['Cardboard Hour']);
		expect((await latest({ kind: 'interview' }))[0].href).toMatch(/^\/studios\//);
	});

	test('the gameplay archive filters by hero and search', async () => {
		await live({ kind: 'gameplay', title: 'A', player1Name: 'Ana', player1Hero: 'Fai' });
		await live({ kind: 'gameplay', title: 'B', player1Name: 'Ben', player2Hero: 'Dorinthea' });
		await live({ kind: 'interview', title: 'Ana talks' });
		const byHero = await archive({ kind: 'gameplay', hero: 'Fai' });
		expect(byHero.items.map((i) => i.title)).toEqual(['A']);
		expect(byHero.heroes).toEqual(['Dorinthea', 'Fai']);
		const bySearch = await archive({ kind: 'gameplay', q: 'ben' });
		expect(bySearch.items.map((i) => i.title)).toEqual(['B']);
	});

	test('a show page lists episodes newest first; the player knows the next and previous', async () => {
		const show = await newShow();
		const e1 = await live({
			kind: 'podcast',
			showId: show.id,
			title: 'One',
			season: 1,
			episodeNumber: 1
		});
		const e2 = await live({
			kind: 'podcast',
			showId: show.id,
			title: 'Two',
			season: 1,
			episodeNumber: 2
		});
		const e3 = await live({
			kind: 'podcast',
			showId: show.id,
			title: 'Three',
			season: 1,
			episodeNumber: 3
		});
		const page = await showPage('cardboard-hour');
		expect(page.episodes.map((e) => e.title)).toEqual(['Three', 'Two', 'One']);
		const mid = await playerItem(e2.id);
		expect(mid.prev.id).toBe(e1.id);
		expect(mid.next.id).toBe(e3.id);
	});

	test('Premium items play only for members; free ones for everyone', async () => {
		const paid = await live({ kind: 'interview', isPremium: true });
		const free = await live({ kind: 'interview', isPremium: false });
		const asUser = (user, id) => playerLoad({ params: { id }, locals: { user } });

		const locked = await asUser(visitor, paid.id);
		expect(locked).toMatchObject({ canWatch: false, playbackId: null, tokens: null });
		const unlocked = await asUser(member, paid.id);
		expect(unlocked).toMatchObject({ canWatch: true, playbackId: paid.muxPlaybackId });
		expect(unlocked.tokens['playback-token']).toBe('pt');
		expect((await asUser(null, free.id)).canWatch).toBe(true);

		await db.update(vod).set({ isPublished: false }).where(eq(vod.id, free.id));
		const { bump } = await import('$lib/server/cache/index.js');
		await bump('vods');
		await expect(asUser(member, free.id)).rejects.toMatchObject({ status: 404 });
	});
});
