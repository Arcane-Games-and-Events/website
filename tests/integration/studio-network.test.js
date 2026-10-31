/**
 * The AGE Network: creators added from a YouTube channel link, their
 * uploads pulled in for staff to pick from, and only featured videos on
 * the public site. YouTube itself is faked through `youtube.get`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { studioChannel, studioChannelVideo } from '$lib/server/db/schema.js';
import { bump } from '$lib/server/cache/index.js';
import { parseChannelUrl, extractYouTubeVideoId, youtube } from '$lib/server/video/youtube.js';
import {
	channelVideos,
	listChannels,
	networkSummary,
	syncChannel,
	syncDue
} from '$lib/server/studio/network.js';
import { creatorPage, networkHome, networkPlayer } from '$lib/server/studio/public.js';
import { POST as addRoute } from '../../src/routes/api/studio/network/+server.js';
import { POST as addVideoRoute } from '../../src/routes/api/studio/network/[id]/videos/+server.js';
import { PATCH as featureRoute } from '../../src/routes/api/studio/network/videos/[videoId]/+server.js';
import { GET as cronRoute } from '../../src/routes/api/cron/studio-network/+server.js';
import { createUser } from '../support/factories.js';
import { callRoute } from '../support/courses.js';

const CH = 'UC' + 'a'.repeat(22);
let producer, writer;
/** What the fake YouTube serves: the channel's uploads, and which IDs are gone. */
let uploads;
let gone;
let calls;
const realGet = youtube.get;

const entry = (id, title, { short = false, published = '2026-10-20T10:00:00+00:00' } = {}) => `
<entry>
  <yt:videoId>${id}</yt:videoId>
  <yt:channelId>${CH}</yt:channelId>
  <title>${title}</title>
  <link rel="alternate" href="https://www.youtube.com/${short ? `shorts/${id}` : `watch?v=${id}`}"/>
  <published>${published}</published>
  <media:group><media:thumbnail url="https://i.ytimg.com/vi/${id}/hqdefault.jpg" width="480" height="360"/>
  <media:description>About ${title}</media:description></media:group>
</entry>`;

const page = (body, status = 200) => ({
	status,
	ok: status < 400,
	text: typeof body === 'string' ? body : JSON.stringify(body),
	json: () => (typeof body === 'string' ? JSON.parse(body) : body)
});

function fakeYouTube(url) {
	calls.push(url);
	const u = new URL(url);
	if (u.pathname === '/@cardcast' || u.pathname === `/channel/${CH}`)
		return page(
			`<html><link rel="canonical" href="https://www.youtube.com/channel/${CH}">
			<meta property="og:title" content="Card Cast &amp; Friends">
			<meta property="og:image" content="https://yt3.ggpht.com/avatar.jpg">
			<meta property="og:description" content="Weekly Flesh and Blood talk.">
			<script>{"canonicalBaseUrl":"/@cardcast"}</script></html>`
		);
	if (u.pathname === '/feeds/videos.xml')
		return page(`<feed>${uploads.map((v) => entry(v.id, v.title, v)).join('')}</feed>`);
	if (u.pathname === '/oembed') {
		const id = new URL(u.searchParams.get('url')).searchParams.get('v');
		if (gone.has(id)) return page('Not Found', 404);
		const theirs = id.startsWith('other');
		return page({
			title: `Old video ${id}`,
			author_url: theirs
				? 'https://www.youtube.com/@someoneelse'
				: 'https://www.youtube.com/@cardcast',
			thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
		});
	}
	// Data API
	if (u.hostname === 'www.googleapis.com') {
		if (u.pathname.endsWith('/channels'))
			return page({
				items: [
					{
						id: CH,
						snippet: {
							title: 'Card Cast',
							customUrl: '@cardcast',
							description: 'Weekly.',
							thumbnails: { high: { url: 'https://yt3.ggpht.com/a.jpg' } }
						},
						brandingSettings: { image: { bannerExternalUrl: 'https://yt3.ggpht.com/banner' } },
						contentDetails: { relatedPlaylists: { uploads: 'UU' + 'a'.repeat(22) } }
					}
				]
			});
		if (u.pathname.endsWith('/playlistItems'))
			return page({ items: uploads.map((v) => ({ contentDetails: { videoId: v.id } })) });
		if (u.pathname.endsWith('/videos'))
			return page({
				items: u.searchParams
					.get('id')
					.split(',')
					.filter((id) => !gone.has(id))
					.map((id) => {
						const v = uploads.find((x) => x.id === id) || { id, title: id, seconds: 900 };
						return {
							id,
							snippet: {
								channelId: CH,
								title: v.title,
								publishedAt: '2026-10-20T10:00:00Z',
								thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hq.jpg` } }
							},
							contentDetails: { duration: `PT${v.seconds ?? 900}S` },
							status: { privacyStatus: 'public', embeddable: true }
						};
					})
			});
	}
	if (u.pathname.startsWith('/shorts/')) return page('', 303);
	return page('Not Found', 404);
}

beforeEach(async () => {
	producer = await createUser({ additionalRoles: ['producer'] });
	writer = await createUser({ additionalRoles: ['writer'] });
	uploads = [
		{ id: 'vid00000001', title: 'Episode One' },
		{ id: 'vid00000002', title: 'Episode Two', published: '2026-10-25T10:00:00+00:00' },
		{ id: 'short000001', title: 'A Short', short: true }
	];
	gone = new Set();
	calls = [];
	youtube.get = async (url) => fakeYouTube(url);
});

afterEach(() => {
	youtube.get = realGet;
	env.YOUTUBE_API_KEY = '';
});

const add = (user = producer, body = { url: 'https://www.youtube.com/@cardcast' }) =>
	callRoute(addRoute, { user, body });
const feature = (id, isFeatured = true) =>
	callRoute(featureRoute, {
		method: 'PATCH',
		params: { videoId: id },
		user: producer,
		body: { isFeatured }
	});
const rowOf = async (youtubeVideoId) =>
	(
		await db
			.select()
			.from(studioChannelVideo)
			.where(eq(studioChannelVideo.youtubeVideoId, youtubeVideoId))
	)[0];

describe('reading YouTube links', () => {
	test('every kind of channel link, and video links', () => {
		expect(parseChannelUrl('https://www.youtube.com/@cardcast')).toEqual({ handle: 'cardcast' });
		expect(parseChannelUrl('@cardcast')).toEqual({ handle: 'cardcast' });
		expect(parseChannelUrl(`youtube.com/channel/${CH}/videos`)).toEqual({ id: CH });
		expect(parseChannelUrl('https://m.youtube.com/user/oldname')).toEqual({ username: 'oldname' });
		expect(parseChannelUrl('https://www.youtube.com/c/Custom')).toEqual({ custom: 'Custom' });
		expect(parseChannelUrl('https://www.youtube.com/watch?v=abc')).toBeNull();
		expect(parseChannelUrl('https://www.youtube.com/channel/UCnotachannel video')).toBeNull();
		expect(parseChannelUrl('https://vimeo.com/@x')).toBeNull();
		expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
		expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});
});

describe('adding a creator', () => {
	test('from a channel link: their uploads come in unfeatured, Shorts left out', async () => {
		const r = await add();
		expect(r.status).toBe(201);
		expect(r.body.channel).toMatchObject({
			name: 'Card Cast & Friends',
			slug: 'cardcast',
			handle: 'cardcast',
			youtubeChannelId: CH,
			youtubeUrl: 'https://www.youtube.com/@cardcast',
			avatarUrl: 'https://yt3.ggpht.com/avatar.jpg'
		});
		expect(r.body.sync).toEqual({ added: 2, seen: 2 });
		const vids = await channelVideos(r.body.channel.id);
		expect(vids.map((v) => v.youtubeVideoId).sort()).toEqual(['vid00000001', 'vid00000002']);
		expect(vids.every((v) => !v.isFeatured)).toBe(true);
		// Nothing is public until staff feature something.
		await bump('vods');
		expect(await creatorPage('cardcast')).toBeNull();
		expect((await networkHome()).creators).toEqual([]);
	});

	test('the same channel twice is refused; writers can’t add creators', async () => {
		expect((await add()).status).toBe(201);
		expect((await add()).status).toBe(409);
		expect((await add(writer)).status).toBe(403);
		expect((await add(producer, { url: 'https://example.com/x' })).status).toBe(400);
	});

	test('with an API key: name, banner and lengths come from the Data API', async () => {
		env.YOUTUBE_API_KEY = 'k';
		uploads = [
			{ id: 'vid00000001', title: 'Long one', seconds: 1800 },
			{ id: 'vid00000003', title: 'Tiny', seconds: 40 }
		];
		const r = await add();
		expect(r.body.channel).toMatchObject({
			name: 'Card Cast',
			bannerUrl: 'https://yt3.ggpht.com/banner=w1600'
		});
		const vids = await channelVideos(r.body.channel.id);
		expect(vids.map((v) => [v.youtubeVideoId, v.duration])).toEqual([['vid00000001', 1800]]);
	});
});

describe('featuring', () => {
	test('only featured videos are public, credited to their creator', async () => {
		const { body } = await add();
		const one = await rowOf('vid00000001');
		expect((await feature(one.id)).status).toBe(200);
		await bump('vods');

		const home = await networkHome();
		expect(home.creators).toMatchObject([{ slug: 'cardcast', videos: 1 }]);
		expect(home.latest).toMatchObject([
			{
				id: 'vid00000001',
				href: '/studios/network/cardcast/vid00000001',
				network: true,
				isPremium: false,
				creator: { name: 'Card Cast & Friends' }
			}
		]);
		const player = await networkPlayer('cardcast', 'vid00000001');
		expect(player.creator.subscribeUrl).toBe(
			'https://www.youtube.com/@cardcast?sub_confirmation=1'
		);
		expect(await networkPlayer('cardcast', 'vid00000002')).toBeNull();
		expect(await networkPlayer('someone-else', 'vid00000001')).toBeNull();

		// Inactive creators leave the site.
		await db
			.update(studioChannel)
			.set({ isActive: false })
			.where(eq(studioChannel.id, body.channel.id));
		await bump('vods');
		expect(await creatorPage('cardcast')).toBeNull();
	});

	test('a sync never changes what staff featured, and drops videos YouTube lost', async () => {
		const { body } = await add();
		await feature((await rowOf('vid00000001')).id);
		// The video leaves the uploads list (older now) and is later deleted.
		uploads = [{ id: 'vid00000009', title: 'Newest' }];
		const channel = (
			await db.select().from(studioChannel).where(eq(studioChannel.id, body.channel.id))
		)[0];
		expect(await syncChannel(channel)).toEqual({ added: 1, seen: 1 });
		expect(await rowOf('vid00000001')).toMatchObject({ isFeatured: true, isAvailable: true });
		expect(await rowOf('vid00000009')).toMatchObject({ isFeatured: false });

		gone.add('vid00000001');
		await syncChannel(channel);
		expect(await rowOf('vid00000001')).toMatchObject({ isFeatured: true, isAvailable: false });
		await bump('vods');
		expect(await creatorPage('cardcast')).toBeNull();
	});

	test('an older video can be added by its link — only from this creator', async () => {
		const { body } = await add();
		const call = (url) =>
			callRoute(addVideoRoute, { params: { id: body.channel.id }, user: producer, body: { url } });
		const ok = await call('https://www.youtube.com/watch?v=oldvid00001');
		expect(ok.status).toBe(201);
		expect(ok.body.video).toMatchObject({ youtubeVideoId: 'oldvid00001', isFeatured: true });
		expect((await call('https://youtu.be/othervid001')).status).toBe(400);
		gone.add('gonevid0001');
		expect((await call('https://youtu.be/gonevid0001')).status).toBe(404);
	});

	test('a failed sync is recorded on the creator', async () => {
		const { body } = await add();
		youtube.get = async () => page('oops', 500);
		const channel = (
			await db.select().from(studioChannel).where(eq(studioChannel.id, body.channel.id))
		)[0];
		await expect(syncChannel(channel)).rejects.toThrow();
		const [after] = await db.select().from(studioChannel).where(eq(studioChannel.id, channel.id));
		expect(after.syncError).toMatch(/500/);
	});
});

describe('the Studio’s view', () => {
	test('creators with their counts, and the home panel’s summary', async () => {
		uploads = [
			{ id: 'vid00000001', title: 'Old', published: '2026-01-01T10:00:00+00:00' },
			{ id: 'vid00000002', title: 'Fresh', published: new Date().toISOString() }
		];
		await add();
		await feature((await rowOf('vid00000001')).id);
		const [c] = await listChannels();
		expect(c).toMatchObject({ name: 'Card Cast & Friends', videos: 2, featured: 1, fresh: 1 });
		expect(c.avatar).toBe('https://yt3.ggpht.com/avatar.jpg');
		expect(await networkSummary()).toMatchObject({
			creators: 1,
			featured: 1,
			fresh: 1,
			failing: []
		});
	});
});

describe('the hourly sync', () => {
	test('needs the cron secret, and syncs only creators that are due', async () => {
		await add();
		const call = (auth) =>
			cronRoute({
				request: new Request('http://localhost/api/cron/studio-network', {
					headers: auth ? { authorization: auth } : {}
				}),
				locals: { user: null }
			});
		expect((await call()).status).toBe(401);
		expect((await call('Bearer wrong')).status).toBe(401);
		// Just synced when added, so nothing is due yet.
		const r = await call('Bearer test-cron-secret');
		expect(r.status).toBe(200);
		expect((await r.json()).synced).toBe(0);
		const later = new Date(Date.now() + 2 * 3600e3);
		expect(await syncDue({ now: later })).toMatchObject([{ added: 0, seen: 2 }]);
	});
});
