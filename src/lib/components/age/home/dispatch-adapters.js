/**
 * Adapters that map the existing homepage server data shape into the
 * editorial Dispatch* component prop shapes. Keeps the adapters in one
 * place so each component stays presentation-only.
 *
 * Each adapter is defensive — it returns `null` when there isn't enough
 * data, so the preview page can decide to skip a section instead of
 * rendering a half-empty card.
 */

/**
 * Lower-case a few words to derive a circuit slug.
 * @param {string | undefined | null} circuit
 * @returns {'la' | 'stl' | 'ne'}
 */
function circuitSlug(circuit) {
	const c = (circuit || '').toLowerCase();
	if (c.includes('st. louis') || c.includes('st louis')) return 'stl';
	if (c.includes('new england') || c.includes('boston')) return 'ne';
	return 'la';
}

/**
 * Format a JS Date / ISO string as the editorial "21 / JUN" pair used
 * for event date chips.
 * @param {string | Date | null | undefined} date
 */
function eventDay(date) {
	if (!date) return { day: '', month: '' };
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return { day: '', month: '' };
	return {
		day: String(d.getUTCDate()).padStart(2, '0'),
		month: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
	};
}

/**
 * Abbreviate a format name for tight surfaces (e.g. the homepage Hub
 * sidebar). Longer-form names stay as-is so unknown formats still read
 * with their full name.
 * @param {string | null | undefined} format
 * @returns {string}
 */
function abbreviateFormat(format) {
	if (!format) return '';
	switch (format) {
		case 'Classic Constructed':
			return 'CC';
		case 'Silver Age':
			return 'SAGE';
		default:
			return format;
	}
}

/**
 * Build a Mux thumbnail URL for a VOD row.
 * @param {{ muxPlaybackId?: string | null, thumbnailToken?: string | null } | null | undefined} v
 * @returns {string}
 */
function muxThumb(v) {
	if (!v || !v.muxPlaybackId) return '';
	const t = v.thumbnailToken ? `?token=${v.thumbnailToken}` : '';
	return `https://image.mux.com/${v.muxPlaybackId}/thumbnail.webp${t}`;
}

/**
 * Best image we can pull off an article. Payload's `getOptimizedImage`
 * returns `{ src, srcset, width, height }`, but the field name varies
 * across older / newer content, so we check a couple of paths.
 * @param {any} a
 */
function articleImage(a) {
	if (!a) return 'https://www.age.events/banner/articles-banner.webp';
	const c = a.coverImage;
	if (!c) return 'https://www.age.events/banner/articles-banner.webp';
	if (typeof c === 'string') return c;
	if (c.src) return c.src;
	if (c.url) return c.url;
	return 'https://www.age.events/banner/articles-banner.webp';
}

/**
 * VOD title fallback.
 * @param {any} v
 */
function vodTitle(v) {
	if (!v) return '';
	return v.title || `${v.player1Hero || ''} vs ${v.player2Hero || ''}`.trim() || 'Untitled match';
}

/**
 * Pick the newest "Library" piece of content for the "Latest" row in
 * the Across AGE digest. Returns null when there's no content.
 *
 * Today this means: the newest article. We intentionally exclude the
 * VOD pool here — every VOD currently in the system is a tournament
 * backup recording that isn't promoted as Library content. When the
 * VOD schema grows a "library / featured" flag, expand this to also
 * accept VODs that carry that flag and compare by publish date.
 *
 * @param {any[] | undefined} articles
 */
function pickLatestContent(articles) {
	const a = articles?.[0];
	if (!a) return null;
	return { kind: /** @type {const} */ ('article'), src: a };
}

/**
 * @param {{ articles?: any[], recentVods?: any[], events?: any[], podcastInfo?: any, latestPodcastEpisode?: any }} data
 */
export function toFrontData(data) {
	const articles = data.articles ?? [];
	const vods = data.recentVods ?? [];
	const events = data.events ?? [];

	// "Lead" drives the big featured pane at the top-left of the Front
	// section (the one labeled "New from AGE" in the vertical gutter).
	// It should always show Library content — currently that's articles
	// only. Backup tournament VODs are excluded for the same reason
	// they're excluded from `pickLatestContent` above. When a "library
	// video" flag lands on the VOD schema, expand this to consider
	// flagged VODs alongside articles and pick the newest by date.
	const article = articles[0];

	// "Latest" — the newest Library article. VODs are excluded here
	// (see `pickLatestContent` for why).
	const pick = pickLatestContent(articles);
	const latest = pick
		? {
				type: /** @type {const} */ ('article'),
				title: pick.src.title,
				meta: `${pick.src.author?.name || 'AGE Staff'}${
					pick.src.readTime ? ` · ${pick.src.readTime} min read` : ''
				}`,
				image: articleImage(pick.src),
				href: pick.src.slug ? `/library/${pick.src.slug}` : '/library'
			}
		: null;

	// Bonus-match row — the latest VOD. No dedup against `latest`
	// anymore since `latest` can no longer be a video.
	const bonusVod = vods[0] ?? null;
	const bonusMatch = bonusVod
		? {
				title: vodTitle(bonusVod),
				meta:
					[
						bonusVod.duration ? formatDuration(bonusVod.duration) : '',
						bonusVod.event || bonusVod.circuit || 'Bonus match'
					]
						.filter(Boolean)
						.join(' · ') || 'Bonus match',
				image: muxThumb(bonusVod),
				duration: bonusVod.duration ? formatDuration(bonusVod.duration) : '',
				href: '/library'
			}
		: null;

	// Next 3 upcoming events. Server already returns them date-asc and
	// capped at 3, but slice defensively in case the cap changes.
	// `href` points at the event detail / signup page (`/age-open/[eventId]`)
	// when an event id is present, falling back to the AGE Open index when
	// it isn't — so a row always has somewhere to go.
	//
	// Title slot is the event title (so each row reads with the
	// official event name, not the location). The meta slot's second
	// position uses the event format (CC / Blitz / etc.) instead of
	// seat counts so the row tells the reader *what* the event is at
	// a glance rather than how full it is — capacity already lives on
	// the event detail page.
	const eventsList = events.slice(0, 3).map((e) => ({
		...eventDay(e.eventDate),
		city: e.title || e.location || 'TBD',
		venue: e.location || '',
		seats: e.format || '',
		circuit: circuitSlug(e.circuit),
		href: e.id ? `/age-open/${e.id}` : '/age-open'
	}));

	return {
		lead: article
			? {
					type: /** @type {const} */ ('article'),
					title: article.title,
					eyebrow: article.tags?.[0]?.name || 'Cover Story',
					image: articleImage(article),
					readTime: article.readTime ? `${article.readTime} min read` : '',
					author: article.author?.name || 'AGE Staff',
					stand: article.excerpt || '',
					event:
						article.tags?.[0]?.name ||
						(article.author?.name ? `By ${article.author.name}` : 'Library'),
					href: article.slug ? `/library/${article.slug}` : '/library',
					premium: !!article.isPremium
				}
			: {
					type: /** @type {const} */ ('article'),
					title: 'AGE Open coverage',
					eyebrow: 'Cover Story',
					image: 'https://www.age.events/banner/articles-banner.webp',
					readTime: '',
					author: 'AGE Staff',
					stand: '',
					event: 'Library',
					href: '/library',
					premium: false
				},
		latest,
		events: eventsList,
		bonusMatch,
		podcast: data.podcastInfo
			? {
					show: data.podcastInfo.name || 'Podcast',
					ep: data.latestPodcastEpisode?.episodeNumber ?? '—',
					duration: data.latestPodcastEpisode?.duration
						? formatDuration(data.latestPodcastEpisode.duration)
						: '—',
					href: '/podcasts'
				}
			: { show: 'AGE Podcast', ep: '—', duration: '—', href: '/podcasts' }
	};
}

/**
 * Build a library item from a Payload article.
 * @param {any} a
 * @returns {import('./types.js') extends never ? any : any}
 */
function articleLibraryItem(a) {
	return {
		type: /** @type {const} */ ('article'),
		premium: !!a.isPremium,
		image: articleImage(a),
		title: a.title,
		// `summary` is the excerpt shown beneath the title in card
		// surfaces like "More to read" — empty string when an article
		// has no excerpt so the cards collapse cleanly.
		summary: a.excerpt || '',
		meta: `${a.author?.name || 'AGE Staff'} · ${a.readTime ? `${a.readTime} min` : '—'}`,
		href: a.slug ? `/library/${a.slug}` : '/library'
	};
}

/**
 * Build a library item from a VOD row so the unified "latest" feed can
 * mix articles + videos cleanly.
 * @param {any} v
 */
function vodLibraryItem(v) {
	const dur = v?.duration ? formatDuration(v.duration) : '';
	return {
		type: /** @type {const} */ ('video'),
		premium: !!v?.isPremium,
		image: muxThumb(v),
		title: vodTitle(v),
		// summary feeds the big featured preview pane
		summary:
			v?.description ||
			[v?.player1Name || v?.player1Hero, v?.player2Name || v?.player2Hero]
				.filter(Boolean)
				.join(' vs ') ||
			'',
		event: v?.event || v?.circuit || '',
		meta: [dur || null, v?.event || v?.circuit || null].filter(Boolean).join(' · '),
		duration: dur,
		// VODs don't have a public reader route yet, so link to the
		// Studios surface as the closest fit. Replace with a per-VOD URL
		// once that route lands.
		href: '/studios',
		publishedAt: v?.publishedAt
	};
}

/**
 * Interleave articles + VODs into a single feed sorted newest-first.
 * @param {any[]} articles
 * @param {any[]} vods
 * @param {number} count
 */
function buildLatestFeed(articles, vods, count) {
	const items = [
		...articles.map((a) => ({
			...articleLibraryItem(a),
			summary: a?.excerpt || '',
			event: a?.tags?.[0]?.name || '',
			publishedAt: a?.publishedDate || a?.publishedAt
		})),
		...vods.map(vodLibraryItem)
	];
	items.sort((a, b) => {
		const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
		const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
		return tb - ta;
	});
	return items.slice(0, count);
}

/**
 * @param {{ articles?: any[], recentVods?: any[], standings?: any[], events?: any[], featuredDecklists?: any[] }} data
 */
export function toHubData(data) {
	const articles = data.articles ?? [];
	const vods = data.recentVods ?? [];

	// "Latest in the Library" — interleaved article + video feed, newest
	// first. The featured preview on the left cycles through these
	// items; the right column lists all of them as hover/click targets.
	const LATEST_COUNT = 6;
	const latest = buildLatestFeed(articles, vods, LATEST_COUNT);

	// Featured stays as a sensible default so the component renders
	// even before the cycling state mounts (SSR + first paint).
	const featured =
		latest[0] ?? {
			type: /** @type {const} */ ('article'),
			premium: false,
			image: 'https://www.age.events/banner/articles-banner.webp',
			title: 'No content yet',
			summary: '',
			event: '',
			meta: '',
			href: '/library'
		};

	// keys of items already in the latest feed so we don't repeat them
	// in the follow-on "more to read / more to watch" sections.
	const latestKeys = new Set(latest.map((i) => `${i.type}:${i.href}:${i.title}`));

	const moreToRead = articles
		.map(articleLibraryItem)
		.filter((a) => !latestKeys.has(`article:${a.href}:${a.title}`))
		.slice(0, 3);

	const moreToWatch = vods
		.map(vodLibraryItem)
		.filter((v) => !latestKeys.has(`video:${v.href}:${v.title}`))
		.slice(0, 3);

	return {
		featured,
		latest,
		moreToRead,
		moreToWatch,
		// Legacy keys kept as harmless fallbacks for any other consumers.
		queue: latest.slice(1, 4),
		grid: moreToRead.slice(0, 3),
		standings: (data.standings ?? []).slice(0, 5).map((s) => ({
			rank: s.rank ?? 0,
			name: s.playerName,
			points: s.totalPoints || 0
		})),
		// Sidebar event rows. Title slot is the event title (matches the
		// Across AGE treatment); the format renders as an inline chip
		// next to the title (abbreviated — "Classic Constructed" →
		// "CC", "Silver Age" → "SAGE") so the meta line is left clean
		// for the venue alone.
		events: (data.events ?? []).slice(0, 4).map((e) => ({
			...eventDay(e.eventDate),
			city: e.title || e.location || 'TBD',
			format: abbreviateFormat(e.format) || 'CC',
			venue: e.location || '',
			seats: '',
			status: /** @type {const} */ (
				e.playerCap && e.registeredCount >= e.playerCap ? 'closed' : 'open'
			),
			circuit: circuitSlug(e.circuit),
			// Link the row to the event detail / signup page when we have
			// an event id; otherwise fall through to the AGE Open index.
			href: e.id ? `/age-open/${e.id}` : '/age-open'
		})),
		decklists: (data.featuredDecklists ?? []).slice(0, 3).map((d) => ({
			image:
				d.heroImageUrl ||
				`https://www.age.events/hero_images/${heroSlug(d.hero)}.webp`,
			hero: d.hero || 'Unknown hero',
			format: d.format || 'CC',
			by: d.playerName || 'Unknown',
			city: d.eventName || d.eventCircuit || ''
		}))
	};
}

/**
 * @param {{ podcastInfo?: any, latestPodcastEpisode?: any }} data
 */
export function toStudiosData(data) {
	if (!data.podcastInfo) return null;
	const ep = data.latestPodcastEpisode;
	const featured = {
		image: ep?.thumbnailUrl || data.podcastInfo.coverImageUrl || 'https://www.age.events/banner/studios-banner.webp',
		show: data.podcastInfo.name || 'Podcast',
		ep: ep?.episodeNumber ?? '—',
		title: ep?.title || data.podcastInfo.description || '—',
		host: data.podcastInfo.hostName || data.podcastInfo.host || '',
		pct: 0,
		at: '0:00',
		duration: ep?.duration ? formatDuration(ep.duration) : '—:--'
	};
	// We only have one show in DB right now, so render that as the
	// "featured" entry; the rest of the network grid stays as placeholder.
	return {
		featured,
		shows: [
			{
				origin: /** @type {const} */ ('original'),
				name: featured.show,
				image: featured.image,
				host: featured.host,
				cadence: 'Latest',
				latest: featured.title,
				dur: featured.duration
			}
		]
	};
}

/* ============ helpers ============ */

/** @param {number} seconds */
function formatDuration(seconds) {
	if (!seconds || Number.isNaN(seconds)) return '—';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${String(s).padStart(2, '0')}`;
}

/** @param {string | null | undefined} hero */
function heroSlug(hero) {
	return (hero || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
