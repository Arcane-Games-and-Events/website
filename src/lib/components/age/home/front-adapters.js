/**
 * Front-page adapter — maps the `+page.server.js` payload into the
 * props the Front* components render.
 *
 * Design intent: a magazine front page. Department nav in the header,
 * one lead story beside a numbered "The Latest" list, then one
 * department per tentpole — Articles, Video, Academy, AGE Open,
 * Podcast, Premium — each with the same restrained template.
 */

const FALLBACK_IMAGE = 'https://www.age.events/banner/articles-banner.webp';

/* ============ formatting ============ */

/** @param {number | string | null | undefined} seconds */
export function formatDuration(seconds) {
	if (seconds == null || seconds === '') return '';
	if (typeof seconds === 'string' && seconds.includes(':')) return seconds; // podcast "45:32"
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

function ts(d) {
	const t = d ? new Date(d).getTime() : 0;
	return Number.isNaN(t) ? 0 : t;
}

/** @param {string | null | undefined} hero */
function heroSlug(hero) {
	return (hero || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
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

	// The Latest — newest five of everything after the lead.
	const latest = [...rest, ...vods].sort((a, b) => ts(b.dateIso) - ts(a.dateIso)).slice(0, 5);

	// Articles department — prose only, lead excluded.
	const prose = rest.filter((s) => s.kind === 'article');
	const articles = prose.length ? { feature: prose[0], cards: prose.slice(1, 4) } : null;

	// Video department — video entries + bonus matches, newest first.
	const videos = [...rest.filter((s) => s.kind === 'video'), ...vods].sort(
		(a, b) => ts(b.dateIso) - ts(a.dateIso)
	);
	const video = videos.length ? { feature: videos[0], cards: videos.slice(1, 4) } : null;

	const courses = liveCourses.length ? liveCourses : COURSES_PLACEHOLDER;
	const academy = { featured: courses[0], list: courses.slice(1, 4), live: liveCourses.length > 0 };

	const open = {
		events: events.slice(0, 3).map((e) => ({
			...eventDay(e.eventDate),
			title: e.title || e.location || 'TBD',
			venue: e.location || '',
			format: e.format === 'Classic Constructed' ? 'CC' : e.format || '',
			circuit: circuitSlug(e.circuit),
			href: e.id ? `/age-open/${e.id}` : '/age-open'
		})),
		leaders: (data?.standings ?? []).slice(0, 5).map((s) => ({
			rank: s.rank ?? 0,
			name: s.playerName,
			points: s.totalPoints || 0,
			href: s.gemId ? `/player/${s.gemId}` : '/age-open?tab=standings'
		})),
		decklists: (data?.featuredDecklists ?? []).slice(0, 3).map((d) => ({
			hero: d.hero || 'Unknown hero',
			by: d.playerName || 'Unknown',
			event: d.eventName || d.eventCircuit || '',
			image: d.heroImageUrl || `https://www.age.events/hero_images/${heroSlug(d.hero)}.webp`,
			href:
				d.eventId && d.id ? `/age-open/${d.eventId}/decklist/${d.id}` : '/age-open?tab=decklists'
		}))
	};
	const hasOpen = open.events.length + open.leaders.length + open.decklists.length > 0;

	const pod = data?.podcastInfo;
	const ep = data?.latestPodcastEpisode;
	const podcast = pod
		? {
				show: pod.name || 'AGE Podcast',
				host: pod.hostName || pod.host || '',
				ep: ep?.episodeNumber ?? null,
				title: ep?.title || pod.description || pod.name || '',
				length: formatDuration(ep?.duration),
				date: formatDate(ep?.publishedAt),
				image: ep?.thumbnailUrl || pod.coverImageUrl || '',
				href: '/studios'
			}
		: null;

	// Department nav — only the departments that render this request.
	const departments = [
		articles && { id: 'articles', label: 'Articles' },
		video && { id: 'video', label: 'Video' },
		{ id: 'academy', label: 'Academy' },
		hasOpen && { id: 'age-open', label: 'AGE Open' },
		podcast && { id: 'podcast', label: 'Podcast' },
		{ id: 'premium', label: 'Premium' }
	].filter(Boolean);

	return {
		departments,
		lead,
		leads,
		latest,
		articles,
		video,
		academy,
		open: hasOpen ? open : null,
		podcast
	};
}
