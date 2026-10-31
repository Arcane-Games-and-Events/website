/**
 * YouTube: parsing links, and reading public channel and video details.
 *
 * Uses the YouTube Data API v3 when `YOUTUBE_API_KEY` is set (names,
 * avatars, banners, lengths, availability). Without a key it falls back
 * to what YouTube serves publicly: the channel page, the uploads feed
 * (`/feeds/videos.xml`) and oEmbed — enough to work, minus lengths.
 *
 * Network calls go through `youtube.get` so tests can swap it out.
 */
import { env } from '$env/dynamic/private';

const API = 'https://www.googleapis.com/youtube/v3';
const SITE = 'https://www.youtube.com';
const HEADERS = { 'accept-language': 'en-US,en;q=0.9', 'user-agent': 'Mozilla/5.0 (AGE Studios)' };

export class YouTubeError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

export const youtube = {
	/** GET a URL; resolves `{ status, ok, text, json(), redirected }`. */
	async get(url, { method = 'GET', redirect = 'follow' } = {}) {
		const res = await fetch(url, { method, redirect, headers: HEADERS });
		const text = method === 'HEAD' ? '' : await res.text();
		return {
			status: res.status,
			ok: res.ok,
			text,
			json: () => JSON.parse(text)
		};
	}
};

const key = () => env.YOUTUBE_API_KEY || '';

/**
 * Extract a YouTube video ID from a URL. Handles youtube.com/watch?v=…,
 * youtu.be/…, youtube.com/embed/…, /shorts/… and /live/… forms, or a bare
 * 11-character ID. Returns null if no ID can be found.
 */
export function extractYouTubeVideoId(raw) {
	const s = String(raw ?? '').trim();
	try {
		const u = new URL(s);
		const host = u.hostname.replace(/^www\./, '');
		if (host === 'youtu.be') {
			return u.pathname.slice(1) || null;
		}
		if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
			if (u.pathname === '/watch') {
				return u.searchParams.get('v');
			}
			const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
			if (m) return m[1];
		}
	} catch {
		// Not a URL — maybe a raw ID like "dQw4w9WgXcQ"
		if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
	}
	return null;
}

/**
 * Parse an ISO 8601 duration string (`PT4M13S`, `P1DT2H`) into whole
 * seconds. Returns null on empty / malformed input.
 */
export function parseIso8601Duration(iso) {
	if (!iso || typeof iso !== 'string') return null;
	const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
	if (!m) return null;
	const [d, h, min, s] = m.slice(1).map((n) => parseInt(n || '0', 10));
	return d * 86400 + h * 3600 + min * 60 + s;
}

/**
 * What a channel link points at: `{ id }` (UC…), `{ handle }` (@name),
 * `{ username }` (/user/…) or `{ custom }` (/c/…, or a bare /name), or null.
 */
export function parseChannelUrl(raw) {
	const s = String(raw ?? '').trim();
	if (!s) return null;
	if (/^@[\w.-]{2,}$/.test(s)) return { handle: s.slice(1) };
	if (/^UC[\w-]{22}$/.test(s)) return { id: s };
	let u;
	try {
		u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
	} catch {
		return null;
	}
	const host = u.hostname.replace(/^(www|m)\./, '');
	if (host !== 'youtube.com') return null;
	const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
	if (!parts.length) return null;
	const [first, second] = parts;
	if (first.startsWith('@') && first.length > 2) return { handle: first.slice(1) };
	if (first === 'channel' && /^UC[\w-]{22}$/.test(second || '')) return { id: second };
	if (first === 'user' && second) return { username: second };
	if (first === 'c' && second) return { custom: second };
	// A /channel/, /user/ or /c/ link that's missing its name or ID isn't a channel.
	if (['channel', 'user', 'c'].includes(first)) return null;
	if (['watch', 'shorts', 'embed', 'live', 'playlist', 'results', 'feed'].includes(first))
		return null;
	return { custom: first };
}

/** The channel's public address, from what we know of it. */
export function channelUrl({ handle, id }) {
	return handle ? `${SITE}/@${handle}` : `${SITE}/channel/${id}`;
}

const best = (thumbs) =>
	thumbs?.maxres?.url ||
	thumbs?.standard?.url ||
	thumbs?.high?.url ||
	thumbs?.medium?.url ||
	thumbs?.default?.url ||
	null;

const decode = (s) =>
	String(s ?? '')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&#x27;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');

const meta = (html, prop) => {
	const m =
		html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`, 'i')) ||
		html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${prop}"`, 'i'));
	return m ? decode(m[1]) : null;
};

async function apiGet(path, params) {
	const q = new URLSearchParams({ ...params, key: key() });
	const res = await youtube.get(`${API}/${path}?${q}`);
	if (!res.ok) {
		let reason = '';
		try {
			reason = res.json()?.error?.message || '';
		} catch {
			// not JSON
		}
		throw new YouTubeError(502, `YouTube said no (${res.status})${reason ? `: ${reason}` : ''}.`);
	}
	return res.json();
}

function fromApiChannel(c) {
	const handle = c.snippet?.customUrl?.replace(/^@/, '') || null;
	const banner = c.brandingSettings?.image?.bannerExternalUrl;
	return {
		channelId: c.id,
		name: c.snippet?.title || 'Untitled channel',
		handle,
		description: c.snippet?.description || null,
		avatarUrl: best(c.snippet?.thumbnails),
		bannerUrl: banner ? `${banner}=w1600` : null,
		url: channelUrl({ handle, id: c.id }),
		uploadsPlaylistId: c.contentDetails?.relatedPlaylists?.uploads || `UU${c.id.slice(2)}`
	};
}

/** Read a channel page without the API: its ID, name, avatar and description. */
async function scrapeChannel(path) {
	const res = await youtube.get(`${SITE}${path}`);
	if (res.status === 404) throw new YouTubeError(404, 'That channel doesn’t exist on YouTube.');
	if (!res.ok) throw new YouTubeError(502, `YouTube didn’t answer (${res.status}).`);
	const html = res.text;
	const id =
		html.match(
			/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/
		)?.[1] || html.match(/"(?:externalId|channelId)":"(UC[\w-]{22})"/)?.[1];
	if (!id) throw new YouTubeError(404, 'Couldn’t find a channel at that link.');
	const handle = html.match(/"canonicalBaseUrl":"\/@([^"]+)"/)?.[1] || null;
	return {
		channelId: id,
		name: meta(html, 'og:title') || 'Untitled channel',
		handle: handle ? decodeURIComponent(handle) : null,
		description: meta(html, 'og:description'),
		avatarUrl: meta(html, 'og:image'),
		bannerUrl: null,
		url: channelUrl({ handle, id }),
		uploadsPlaylistId: `UU${id.slice(2)}`
	};
}

/**
 * Look a channel up from any link to it. Throws a YouTubeError when the
 * link isn't a channel or YouTube doesn't know it.
 */
export async function resolveChannel(link) {
	const ref = parseChannelUrl(link);
	if (!ref)
		throw new YouTubeError(
			400,
			'Paste a link to a YouTube channel, like youtube.com/@name or youtube.com/channel/UC….'
		);
	if (key() && !ref.custom) {
		const by = ref.id
			? { id: ref.id }
			: ref.handle
				? { forHandle: ref.handle }
				: { forUsername: ref.username };
		const body = await apiGet('channels', {
			part: 'snippet,brandingSettings,contentDetails',
			...by
		});
		const c = body?.items?.[0];
		if (!c) throw new YouTubeError(404, 'YouTube doesn’t know that channel.');
		return fromApiChannel(c);
	}
	const path = ref.id
		? `/channel/${ref.id}`
		: ref.handle
			? `/@${encodeURIComponent(ref.handle)}`
			: ref.username
				? `/user/${encodeURIComponent(ref.username)}`
				: `/c/${encodeURIComponent(ref.custom)}`;
	const scraped = await scrapeChannel(path);
	if (!key()) return scraped;
	// A /c/ link: the page gave us the ID; the API fills in the rest.
	const body = await apiGet('channels', {
		part: 'snippet,brandingSettings,contentDetails',
		id: scraped.channelId
	});
	return body?.items?.[0] ? fromApiChannel(body.items[0]) : scraped;
}

function fromApiVideo(v) {
	const duration = parseIso8601Duration(v.contentDetails?.duration);
	return {
		youtubeVideoId: v.id,
		channelId: v.snippet?.channelId || null,
		title: v.snippet?.title || 'Untitled',
		description: v.snippet?.description || null,
		publishedAt: v.snippet?.publishedAt ? new Date(v.snippet.publishedAt) : null,
		thumbnailUrl: best(v.snippet?.thumbnails) || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
		duration,
		// Livestreams that haven't happened, and private or unembeddable videos.
		available:
			v.status?.privacyStatus !== 'private' &&
			v.status?.embeddable !== false &&
			v.snippet?.liveBroadcastContent !== 'upcoming',
		isShort: false
	};
}

/** Details for up to 50 videos at a time (API only). Missing IDs are left out. */
async function apiVideos(ids) {
	const out = [];
	for (let i = 0; i < ids.length; i += 50) {
		const body = await apiGet('videos', {
			part: 'snippet,contentDetails,status',
			id: ids.slice(i, i + 50).join(',')
		});
		out.push(...(body?.items ?? []).map(fromApiVideo));
	}
	return out;
}

/**
 * Whether a short-ish video is a YouTube Short: /shorts/<id> answers 200
 * for a Short and redirects to /watch for anything else.
 */
async function isShortVideo(id) {
	try {
		const res = await youtube.get(`${SITE}/shorts/${id}`, { method: 'HEAD', redirect: 'manual' });
		return res.status === 200;
	} catch {
		return false;
	}
}

/** Parse the public uploads feed (no key needed): the 15 newest. */
function parseFeed(xml) {
	return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
		const tag = (t) => e.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? null;
		const id = tag('yt:videoId');
		const link = e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] || '';
		return {
			youtubeVideoId: id,
			channelId: tag('yt:channelId'),
			title: decode(tag('title') || 'Untitled'),
			description: decode(tag('media:description') || '') || null,
			publishedAt: tag('published') ? new Date(tag('published')) : null,
			thumbnailUrl:
				e.match(/<media:thumbnail url="([^"]+)"/)?.[1] ||
				`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
			duration: null,
			available: true,
			isShort: link.includes('/shorts/')
		};
	});
}

/**
 * A channel's newest uploads: up to 25 with the API (with lengths), 15
 * from the public feed without. Shorts are marked `isShort`.
 */
export async function channelUploads(channel) {
	if (key()) {
		const playlistId = channel.uploadsPlaylistId || `UU${channel.channelId.slice(2)}`;
		const body = await apiGet('playlistItems', {
			part: 'contentDetails',
			playlistId,
			maxResults: '25'
		});
		const ids = (body?.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean);
		const videos = await apiVideos(ids);
		for (const v of videos) {
			if (v.duration != null && v.duration <= 60) v.isShort = true;
			else if (v.duration != null && v.duration <= 180)
				v.isShort = await isShortVideo(v.youtubeVideoId);
		}
		return videos;
	}
	const res = await youtube.get(`${SITE}/feeds/videos.xml?channel_id=${channel.channelId}`);
	if (res.status === 404) throw new YouTubeError(404, 'YouTube no longer has that channel.');
	if (!res.ok) throw new YouTubeError(502, `YouTube’s feed didn’t answer (${res.status}).`);
	return parseFeed(res.text);
}

/**
 * One video by ID, with the channel it belongs to, or null if YouTube
 * doesn't have it. Without a key the channel comes back as `authorUrl`
 * (its @handle address) instead of an ID.
 */
export async function videoDetails(id) {
	if (key()) {
		const [v] = await apiVideos([id]);
		return v ?? null;
	}
	const res = await youtube.get(
		`${SITE}/oembed?url=${encodeURIComponent(`${SITE}/watch?v=${id}`)}&format=json`
	);
	if (!res.ok) return null;
	const o = res.json();
	return {
		youtubeVideoId: id,
		channelId: null,
		authorUrl: o.author_url || null,
		title: o.title || 'Untitled',
		description: null,
		publishedAt: null,
		thumbnailUrl: o.thumbnail_url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
		duration: null,
		available: true,
		isShort: false
	};
}

/**
 * Which of these videos YouTube still plays: a Set of the available IDs.
 * Used to drop featured videos that were deleted or made private.
 */
export async function stillAvailable(ids) {
	if (!ids.length) return new Set();
	if (key()) {
		const videos = await apiVideos(ids);
		return new Set(videos.filter((v) => v.available).map((v) => v.youtubeVideoId));
	}
	const ok = new Set();
	for (const id of ids) {
		const res = await youtube.get(
			`${SITE}/oembed?url=${encodeURIComponent(`${SITE}/watch?v=${id}`)}&format=json`
		);
		// oEmbed answers 401/403 for private and 404 for deleted videos; anything
		// else (a blip) counts as still there.
		if (![401, 403, 404].includes(res.status)) ok.add(id);
	}
	return ok;
}
