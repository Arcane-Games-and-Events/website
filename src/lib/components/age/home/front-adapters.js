/**
 * Front-page adapter — maps the `+page.server.js` payload into the
 * props the Front* components render.
 *
 * Design intent: a magazine front page. Department nav in the header,
 * one lead story beside a numbered "The Latest" list, then one
 * department per tentpole — Articles, Video, Academy, AGE Open,
 * Premium — each with the same restrained template.
 */

import { CIRCUITS } from '$lib/data/circuits.js';

const FALLBACK_IMAGE = 'https://www.age.events/banner/articles-banner.webp';

/* ============ formatting ============ */

/** @param {number | string | null | undefined} seconds */
export function formatDuration(seconds) {
	if (seconds == null || seconds === '') return '';
	if (typeof seconds === 'string' && seconds.includes(':')) return seconds; // preformatted "45:32"
	const n = Number(seconds);
	if (!n || Number.isNaN(n)) return '';
	const h = Math.floor(n / 3600);
	const m = Math.floor((n % 3600) / 60);
	const s = Math.floor(n % 60);
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${m}:${String(s).padStart(2, '0')}`;
}

/** Minutes → "3 hr 38 min" / "54 min". @param {number} mins */
function formatMinutes(mins) {
	if (!mins) return '';
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return h ? `${h} hr${m ? ` ${m} min` : ''}` : `${m} min`;
}

/** @param {string | Date | null | undefined} d */
export function formatDate(d) {
	if (!d) return '';
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

/** @param {string | Date | null | undefined} date */
function eventDay(date) {
	if (!date) return { day: '', month: '' };
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return { day: '', month: '' };
	return {
		day: String(d.getUTCDate()),
		month: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
	};
}

/** @param {string | undefined | null} circuit */
function circuitSlug(circuit) {
	const c = (circuit || '').toLowerCase();
	if (c.includes('st. louis') || c.includes('st louis')) return 'stl';
	if (c.includes('new england') || c.includes('boston')) return 'ne';
	return 'la';
}

/** Whole days from today (UTC) to a date; null when unknown. */
function daysUntil(d) {
	if (!d) return null;
	const t = new Date(d).getTime();
	if (Number.isNaN(t)) return null;
	return Math.max(0, Math.round((t - Date.now()) / 86400000));
}

function ts(d) {
	const t = d ? new Date(d).getTime() : 0;
	return Number.isNaN(t) ? 0 : t;
}

/** @param {any} a */
function entryImage(a) {
	const c = a?.coverImage;
	if (!c) return { src: FALLBACK_IMAGE, alt: '' };
	if (typeof c === 'string') return { src: c, alt: a?.title || '' };
	return { src: c.src || c.url || FALLBACK_IMAGE, alt: c.alt || a?.title || '' };
}

/** @param {any} v */
function vodImage(v) {
	if (v?.muxPlaybackId) {
		const t = v.thumbnailToken ? `&token=${v.thumbnailToken}` : '';
		return `https://image.mux.com/${v.muxPlaybackId}/thumbnail.webp?width=720&height=405&fit_mode=smartcrop${t}`;
	}
	return v?.thumbnail || 'https://www.age.events/banner/age-open-banner.webp';
}

/* ============ story normalizers ============
 * Story: { kind, href, title, dek, image, alt, rubric, length, author,
 *          date, dateIso, premium }
 * `rubric` is the small-caps department label above the headline;
 * `length` is "7 min read" / "34:18".
 */

/** @param {any} a */
function entryStory(a) {
	const isVideo = !!a?.hasVideo;
	const img = entryImage(a);
	return {
		kind: /** @type {'article' | 'video'} */ (isVideo ? 'video' : 'article'),
		href: a?.slug ? `/library/${a.slug}` : '/library',
		title: a?.title || 'Untitled',
		dek: a?.excerpt || '',
		image: img.src,
		alt: img.alt,
		rubric: a?.tags?.[0]?.name || (isVideo ? 'Video' : 'Article'),
		length: isVideo
			? formatDuration(a?.videoDuration)
			: a?.readTime
				? `${a.readTime} min read`
				: '',
		author: a?.author?.name || 'AGE Staff',
		date: formatDate(a?.publishedAt),
		dateIso: a?.publishedAt || null,
		premium: !!a?.isPremium
	};
}

/** @param {any} v */
function vodStory(v) {
	const players = [v?.player1Name || v?.player1Hero, v?.player2Name || v?.player2Hero]
		.filter(Boolean)
		.join(' vs ');
	return {
		kind: /** @type {const} */ ('video'),
		href: v?.id ? `/library/${v.id}` : '/library',
		title: v?.title || players || 'Untitled match',
		dek: v?.description || players,
		image: vodImage(v),
		alt: v?.title || players || '',
		rubric: v?.eventCircuit ? `Bonus match · ${v.eventCircuit}` : 'Bonus match',
		length: formatDuration(v?.duration),
		author: 'AGE Studios',
		date: formatDate(v?.publishedAt),
		dateIso: v?.publishedAt || null,
		premium: !!v?.isPremium
	};
}

/* ============ Academy placeholder ============
 * No course has been published through the CMS yet, so the Academy
 * department runs on this placeholder catalog (generic names) until
 * `data.courses` is non-empty, at which point the live list takes over.
 */
const COURSES_PLACEHOLDER = [
	{
		href: '/academy',
		title: 'Reading the Board: Decision-Making in Classic Constructed',
		dek: 'How the best players turn a messy board into a short list of real decisions — and pick the right one on the clock.',
		image: 'https://www.age.events/banner/academy-banner.webp',
		instructor: 'Morgan Ellis',
		lessons: 14,
		runtime: formatMinutes(218),
		price: 79
	},
	{
		href: '/academy',
		title: 'Punishing the Mirror',
		dek: '',
		image: 'https://www.age.events/banner/articles-banner.webp',
		instructor: 'Jordan Reeves',
		lessons: 9,
		runtime: formatMinutes(142),
		price: 59
	},
	{
		href: '/academy',
		title: 'Sideboarding for Sealed',
		dek: '',
		image: 'https://www.age.events/banner/studios-banner.webp',
		instructor: 'Sam Whitfield',
		lessons: 7,
		runtime: formatMinutes(95),
		price: 0
	},
	{
		href: '/academy',
		title: 'Tempo & Tempo Loss',
		dek: '',
		image: 'https://www.age.events/banner/age-open-banner.webp',
		instructor: 'Casey Marchetti',
		lessons: 11,
		runtime: formatMinutes(174),
		price: 49
	}
];

/** @param {any} c */
function courseItem(c) {
	return {
		href: c?.slug ? `/academy/${c.slug}` : '/academy',
		title: c?.title || 'Untitled course',
		dek: c?.description || '',
		image: c?.coverImage?.src || 'https://www.age.events/banner/academy-banner.webp',
		instructor: c?.author?.name || 'AGE Academy',
		lessons: c?.lessons || 0,
		runtime: formatMinutes(c?.minutes || 0),
		price: Number(c?.price) || 0
	};
}

/* ============ entry point ============ */

/** @param {any} data */
export function buildFront(data) {
	const entries = (data?.articles ?? []).map(entryStory);
	const vods = (data?.recentVods ?? []).map(vodStory);
	const liveCourses = (data?.courses ?? []).map(courseItem);
	const events = data?.events ?? [];

	// Hero carousel — the three newest Library entries (articles or videos).
	const leads = entries.slice(0, 3);
	const lead = leads[0] ?? null;
	const rest = entries.slice(leads.length);

	// Newest Library pieces after the hero (articles, videos, bonus matches).
	const newest = [...rest, ...vods].sort((a, b) => ts(b.dateIso) - ts(a.dateIso));

	// Library department — the newest seven pieces of any kind after the
	// hero, articles and video together, for the mosaic grid.
	const library = newest.slice(0, 7);

	const courses = liveCourses.length ? liveCourses : COURSES_PLACEHOLDER;
	const academy = { featured: courses[0], list: courses.slice(1, 4), live: liveCourses.length > 0 };

	// AGE Open department — a recruitment poster: series stats, the next
	// events with price and a sign-up link, the three circuits, and the
	// season leaders.
	const stats = data?.seriesStats ?? {};
	const upcoming = events.slice(0, 3).map((e) => ({
		...eventDay(e.eventDate),
		title: e.title || e.location || 'TBD',
		venue: e.location || '',
		format: e.format === 'Classic Constructed' ? 'CC' : e.format || '',
		circuit: circuitSlug(e.circuit),
		circuitName: e.circuit || '',
		price: e.price != null && Number(e.price) > 0 ? `$${Math.round(Number(e.price))}` : 'Free',
		premiumDiscount: !!e.premiumDiscount,
		cap: e.playerCap || null,
		dateIso: e.eventDate || null,
		daysUntil: daysUntil(e.eventDate),
		weekday: e.eventDate
			? new Date(e.eventDate).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
			: '',
		image: CIRCUITS[e.circuit]?.image || '/banner/age-open-banner.webp',
		href: e.id ? `/age-open/${e.id}` : '/age-open'
	}));
	const circuits = Object.values(CIRCUITS).map((c) => {
		const next = upcoming.find((e) => e.circuitName === c.name) ?? null;
		return {
			name: c.name,
			region: c.region,
			abbreviation: c.abbreviation,
			slug: circuitSlug(c.name),
			image: c.image,
			next,
			href: '/age-open?tab=events'
		};
	});
	const open = {
		series: {
			events: stats.totalEvents || 24,
			prizePool: stats.prizePool ? `$${Math.round(stats.prizePool / 1000)}K+` : '$30K+',
			players: stats.totalPlayers || 0,
			regions: circuits.length
		},
		events: upcoming,
		circuits,
		leaders: (data?.standings ?? []).slice(0, 3).map((s) => ({
			rank: s.rank ?? 0,
			name: s.playerName,
			points: s.totalPoints || 0,
			href: s.gemId ? `/player/${s.gemId}` : '/age-open?tab=standings'
		}))
	};
	const hasOpen = true;

	// The Latest — one mixed list: the newest Library piece leads, then the
	// next two events, three more Library pieces, and one course.
	const eventRows = upcoming.slice(0, 2).map((e) => ({
		kind: /** @type {const} */ ('event'),
		href: e.href,
		title: e.title,
		dek: '',
		image: e.image,
		alt: '',
		rubric: `AGE Open · ${e.circuitName || 'Event'}`,
		day: e.day,
		month: e.month,
		circuit: e.circuit,
		daysUntil: e.daysUntil,
		meta: [e.weekday, e.venue, e.format, e.price].filter(Boolean).join(' · '),
		cta: 'Sign up',
		premium: false
	}));
	const courseRows = courses.slice(0, 1).map((c) => ({
		kind: /** @type {const} */ ('course'),
		href: c.href,
		title: c.title,
		dek: c.dek,
		image: c.image,
		alt: '',
		rubric: 'Academy · Course',
		meta: [
			`With ${c.instructor}`,
			c.lessons ? `${c.lessons} lessons` : '',
			c.price > 0 ? `$${c.price}` : 'Free'
		]
			.filter(Boolean)
			.join(' · '),
		cta: c.price > 0 ? 'Enroll' : 'Start free',
		premium: false
	}));
	const latest = [newest[0], ...eventRows, ...newest.slice(1, 4), ...courseRows].filter(Boolean);

	// Department nav — only the departments that render this request.
	const departments = [
		library.length && { id: 'library', label: 'Library' },
		{ id: 'academy', label: 'Academy' },
		hasOpen && { id: 'age-open', label: 'AGE Open' },
		{ id: 'premium', label: 'Premium' }
	].filter(Boolean);

	return {
		departments,
		lead,
		leads,
		latest,
		library,
		academy,
		open
	};
}
