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
 * @param {{ articles?: any[], vods?: any[], events?: any[], podcastInfo?: any, latestPodcastEpisode?: any }} data
 */
export function toFrontData(data) {
	const lead = data.vods?.[0];
	const nextEvent = data.events?.[0];
	const article = data.articles?.[0];
	return {
		lead: lead
			? {
					title: vodTitle(lead),
					eyebrow: '▶ Featured Match',
					image: muxThumb(lead),
					duration: lead.duration ? formatDuration(lead.duration) : '—',
					stand:
						lead.description ||
						`${lead.player1Name || ''} vs ${lead.player2Name || ''}` ||
						'',
					event: `${lead.circuit || 'AGE Open'}${lead.month ? ` · ${lead.month}` : ''}`
				}
			: {
					title: article?.title ?? 'AGE Open coverage',
					eyebrow: 'Cover Story',
					image: articleImage(article),
					duration: article?.readTime ? `${article.readTime} min` : '—',
					stand: article?.excerpt || '',
					event: 'Coverage'
				},
		watch: lead
			? {
					image: muxThumb(lead),
					title: vodTitle(lead),
					meta: `${lead.duration ? formatDuration(lead.duration) : ''}${lead.event ? ` · ${lead.event}` : ''}`
				}
			: {
					image: 'https://www.age.events/banner/studios-banner.webp',
					title: 'AGE Studios',
					meta: 'Bonus matches, original series & podcasts'
				},
		event: nextEvent
			? {
					...eventDay(nextEvent.eventDate),
					city: nextEvent.location || nextEvent.title || 'TBD',
					venue: nextEvent.location || '',
					seats:
						nextEvent.playerCap && nextEvent.registeredCount != null
							? `${nextEvent.registeredCount} / ${nextEvent.playerCap}`
							: 'Open',
					circuit: circuitSlug(nextEvent.circuit)
				}
			: {
					day: '--',
					month: '---',
					city: 'No upcoming events',
					venue: '',
					seats: '',
					circuit: 'la'
				},
		academy: {
			image: 'https://www.age.events/banner/academy-banner.webp',
			title: 'Coming soon',
			progress: 0
		},
		podcast: data.podcastInfo
			? {
					show: data.podcastInfo.name || 'Podcast',
					ep: data.latestPodcastEpisode?.episodeNumber ?? '—',
					duration: data.latestPodcastEpisode?.duration
						? formatDuration(data.latestPodcastEpisode.duration)
						: '—'
				}
			: { show: 'AGE Podcast', ep: '—', duration: '—' }
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
		meta: `${a.author?.name || 'AGE Staff'} · ${a.readTime ? `${a.readTime} min` : '—'}`,
		href: a.slug ? `/library/${a.slug}` : '/library'
	};
}

/**
 * @param {{ articles?: any[], standings?: any[], events?: any[], featuredDecklists?: any[] }} data
 */
export function toHubData(data) {
	const articles = data.articles ?? [];

	// Article-first Library: featured = first article, queue = next 3,
	// grid = next 3. The component supports videos in the featured slot,
	// but we don't have video data, so everything comes from Payload.
	const feat = articles[0];
	const featured = feat
		? {
				type: /** @type {const} */ ('article'),
				premium: !!feat.isPremium,
				image: articleImage(feat),
				title: feat.title,
				summary: feat.excerpt || '',
				event: feat.tags?.[0]?.name || '',
				meta: `${feat.author?.name || 'AGE Staff'} · ${feat.readTime ? `${feat.readTime} min` : '—'}`,
				href: feat.slug ? `/library/${feat.slug}` : '/library'
			}
		: {
				type: /** @type {const} */ ('article'),
				premium: false,
				image: 'https://www.age.events/banner/articles-banner.webp',
				title: 'No articles yet',
				summary: '',
				event: '',
				meta: '',
				href: '/library'
			};

	const queue = articles.slice(1, 4).map(articleLibraryItem);
	const grid = articles.slice(4, 7).map(articleLibraryItem);

	return {
		featured,
		queue,
		grid,
		standings: (data.standings ?? []).slice(0, 5).map((s) => ({
			rank: s.rank ?? 0,
			name: s.playerName,
			points: s.totalPoints || 0
		})),
		events: (data.events ?? []).slice(0, 4).map((e) => ({
			...eventDay(e.eventDate),
			city: e.location || e.title || 'TBD',
			format: e.format || 'CC',
			venue: e.location || '',
			seats:
				e.playerCap && e.registeredCount != null
					? `${e.registeredCount} / ${e.playerCap}`
					: 'Open',
			status: /** @type {const} */ (
				e.playerCap && e.registeredCount >= e.playerCap ? 'closed' : 'open'
			),
			circuit: circuitSlug(e.circuit)
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
