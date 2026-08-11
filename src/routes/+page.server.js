import { listPublishedEntries } from '$lib/server/cms/list.js';
import { db } from '$lib/server/db/index.js';
import { event, standing, decklist, podcast, podcastEpisode, vod } from '$lib/server/db/schema.js';
import { asc, gte, desc, and, or, eq, isNull } from 'drizzle-orm';
import { getMuxThumbnailToken } from '$lib/server/mux.js';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';
import { playerKey as getPlayerKey } from '$lib/server/players/key.js';

/**
 * Calculate derived stats from monthly data
 * - eventsPlayed: count of months with points > 0
 * - top8Finishes: count of months with points >= 15 (5th-8th or better)
 */
function calculateDerivedStats(standing) {
	const monthlyPoints = [
		standing.januaryPoints || 0,
		standing.februaryPoints || 0,
		standing.marchPoints || 0,
		standing.aprilPoints || 0,
		standing.mayPoints || 0,
		standing.junePoints || 0,
		standing.julyPoints || 0,
		standing.augustPoints || 0,
		standing.septemberPoints || 0,
		standing.octoberPoints || 0,
		standing.novemberPoints || 0,
		standing.decemberPoints || 0
	];

	const eventsPlayed = monthlyPoints.filter((p) => p > 0).length;
	const top8Finishes = monthlyPoints.filter((p) => p >= 15).length;

	return { eventsPlayed, top8Finishes };
}

/**
 * Compare two standings using tiebreaker rules:
 * 1. Total Points (primary)
 * 2. Number of Top 8's made
 * 3. Total match wins
 * 4. Number of events attended
 */
function compareStandings(a, b) {
	const pointsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
	if (pointsDiff !== 0) return pointsDiff;

	const aDerived = calculateDerivedStats(a);
	const bDerived = calculateDerivedStats(b);

	const top8Diff = bDerived.top8Finishes - aDerived.top8Finishes;
	if (top8Diff !== 0) return top8Diff;

	const winsDiff = (b.matchesWon || 0) - (a.matchesWon || 0);
	if (winsDiff !== 0) return winsDiff;

	return bDerived.eventsPlayed - aDerived.eventsPlayed;
}

const withTimeout = (promise, ms, fallback) =>
	Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

/**
 * Aggregate the full standings table into the three small pieces the
 * homepage actually displays (top-8 leaderboard, unique player count,
 * filter options). Helper shared by the default-view cache builder and
 * the filtered-view path so both produce data in the same shape.
 */
function aggregateStandings(standingRows, { season = 'all', circuit = 'all' } = {}) {
	const seasonSet = new Set();
	const circuitSet = new Set();
	for (const s of standingRows) {
		if (s.season) seasonSet.add(s.season);
		if (s.circuit) circuitSet.add(s.circuit);
	}

	let filtered = standingRows;
	if (season !== 'all') filtered = filtered.filter((s) => s.season === season);
	if (circuit !== 'all') filtered = filtered.filter((s) => s.circuit === circuit);

	const statsMap = new Map();
	for (const s of filtered) {
		const key = getPlayerKey(s);
		if (!statsMap.has(key)) {
			statsMap.set(key, {
				gemId: s.gemId,
				playerName: s.playerName,
				totalPoints: 0,
				matchesWon: 0,
				matchesPlayed: 0,
				eventsPlayed: 0,
				top8Finishes: 0
			});
		}
		const derived = calculateDerivedStats(s);
		const stats = statsMap.get(key);
		stats.totalPoints += s.totalPoints || 0;
		stats.matchesWon += s.matchesWon || 0;
		stats.matchesPlayed += s.matchesPlayed || 0;
		stats.eventsPlayed += derived.eventsPlayed;
		stats.top8Finishes += derived.top8Finishes;
	}

	const sorted = Array.from(statsMap.values()).sort(compareStandings);
	const top8 = sorted.slice(0, 8).map((p, i) => ({ ...p, rank: i + 1 }));

	// Unique player count is always across the full (unfiltered) set, so
	// the "series stats" number stays stable as users toggle filters.
	const uniquePlayers = new Set();
	for (const s of standingRows) {
		uniquePlayers.add(getPlayerKey(s));
	}

	return {
		top8,
		playerCount: uniquePlayers.size,
		availableSeasons: ['all', ...[...seasonSet].sort().reverse()],
		availableCircuits: ['all', ...[...circuitSet].sort()]
	};
}

function fetchAllStandings() {
	return getCachedOrFetch(
		`${CACHE_KEYS.STANDINGS}:all`,
		() => db.select().from(standing).orderBy(desc(standing.totalPoints)),
		CACHE_TTL.MEDIUM
	);
}

/**
 * Default homepage view (no filter) — read a tiny pre-aggregated cache
 * instead of pulling the full standings table into the request and
 * iterating it in memory. Cache misses still do the full aggregation,
 * but cache hits return a small object.
 */
function fetchHomeStandingsAggregates() {
	return getCachedOrFetch(
		`${CACHE_KEYS.STANDINGS}:home:aggregates`,
		async () => {
			const rows = await fetchAllStandings();
			return aggregateStandings(rows);
		},
		CACHE_TTL.SHORT
	);
}

async function fetchFilteredStandings(season, circuit) {
	const rows = await fetchAllStandings();
	return aggregateStandings(rows, { season, circuit });
}

async function fetchArticles() {
	// Homepage's "Newest from AGE" section — CMS entries only. Payload is
	// turned off, but the list helper already sorts by publishedAt DESC
	// and applies the public-visibility filter, so the caller just takes
	// the first 12.
	try {
		return await listPublishedEntries({ limit: 12 });
	} catch (error) {
		console.error('Error fetching CMS entries:', error);
		return [];
	}
}

function fetchUpcomingEvents() {
	const now = new Date();
	return withTimeout(
		getCachedOrFetch(
			`${CACHE_KEYS.EVENTS}:upcoming:3`,
			() =>
				db
					.select()
					.from(event)
					.where(
						and(
							gte(event.eventDate, now),
							or(eq(event.status, 'upcoming'), isNull(event.status))
						)
					)
					.orderBy(asc(event.eventDate))
					.limit(3),
			CACHE_TTL.SHORT
		),
		10000,
		[]
	);
}

function fetchFeaturedDecklists() {
	return withTimeout(
		getCachedOrFetch(
			`${CACHE_KEYS.DECKLISTS}:featured:3`,
			() =>
				db
					.select({
						id: decklist.id,
						playerName: decklist.playerName,
						gemId: decklist.gemId,
						hero: decklist.hero,
						format: decklist.format,
						placement: decklist.placement,
						createdAt: decklist.createdAt,
						eventId: decklist.eventId,
						eventName: event.title,
						eventCircuit: event.circuit
					})
					.from(decklist)
					.leftJoin(event, eq(decklist.eventId, event.id))
					.where(and(eq(decklist.placement, 1), eq(decklist.isPublic, true)))
					.orderBy(desc(decklist.createdAt))
					.limit(3),
			CACHE_TTL.MEDIUM
		),
		10000,
		[]
	);
}

async function fetchPodcastBundle() {
	try {
		return await getCachedOrFetch(
			`${CACHE_KEYS.PODCASTS}:home:latest`,
			async () => {
				const activePodcasts = await db
					.select()
					.from(podcast)
					.where(eq(podcast.isActive, true))
					.orderBy(podcast.sortOrder, podcast.createdAt)
					.limit(1);

				if (activePodcasts.length === 0) {
					return { podcastInfo: null, latestPodcastEpisode: null };
				}

				const podcastInfo = activePodcasts[0];
				const episodes = await db
					.select()
					.from(podcastEpisode)
					.where(
						and(
							eq(podcastEpisode.podcastId, podcastInfo.id),
							eq(podcastEpisode.isPublished, true)
						)
					)
					.orderBy(desc(podcastEpisode.publishedAt))
					.limit(1);

				return {
					podcastInfo,
					latestPodcastEpisode: episodes[0] || null
				};
			},
			CACHE_TTL.MEDIUM
		);
	} catch (err) {
		console.warn('Could not fetch podcast data:', err.message);
		return { podcastInfo: null, latestPodcastEpisode: null };
	}
}

async function fetchRecentVods() {
	try {
		const vodRows = await getCachedOrFetch(
			`${CACHE_KEYS.VODS}:home:latest:12`,
			() =>
				db
					.select()
					.from(vod)
					.where(and(eq(vod.isPublished, true), eq(vod.status, 'ready')))
					.orderBy(desc(vod.publishedAt))
					.limit(12),
			CACHE_TTL.MEDIUM
		);

		return Promise.all(
			vodRows.map(async (v) => {
				if (!v.muxPlaybackId) return v;
				try {
					const token = await getMuxThumbnailToken(v.muxPlaybackId);
					return { ...v, thumbnailToken: token };
				} catch {
					return v;
				}
			})
		);
	} catch (err) {
		console.warn('Could not fetch VODs:', err.message);
		return [];
	}
}

export async function load({ setHeaders, url, locals }) {
	const standingsSeason = url.searchParams.get('standings_season') || 'all';
	const standingsCircuit = url.searchParams.get('standings_circuit') || 'all';
	const isDefaultFilters = standingsSeason === 'all' && standingsCircuit === 'all';

	try {
		// All independent lookups run in parallel — cache hits resolve in one
		// round-trip instead of stacking 8 sequential awaits.
		const [
			articles,
			upcomingEvents,
			standingsData,
			featuredDecklists,
			podcastBundle,
			recentVods
		] = await Promise.all([
			fetchArticles(),
			fetchUpcomingEvents(),
			isDefaultFilters
				? fetchHomeStandingsAggregates()
				: fetchFilteredStandings(standingsSeason, standingsCircuit),
			fetchFeaturedDecklists(),
			fetchPodcastBundle(),
			fetchRecentVods()
		]);

		// Edge-cache for 5 minutes with an hour of stale-while-revalidate.
		// `Vary: Cookie` keeps one entry per cookie fingerprint, so an
		// anonymous visitor's HTML never gets served to a logged-in one
		// (or vice versa). Logged-in visitors still benefit — their own
		// second navigation is edge-served.
		//
		// If the article fetch failed and we returned an empty page, skip
		// caching so we don't lock in the empty state.
		if (articles.length > 0) {
			setHeaders({
				'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
				vary: 'Cookie'
			});
		} else {
			setHeaders({
				'cache-control': 'private, no-cache, no-store, must-revalidate',
				vary: 'Cookie'
			});
		}

		return {
			articles,
			events: upcomingEvents,
			standings: standingsData.top8,
			standingsFilters: {
				season: standingsSeason,
				circuit: standingsCircuit,
				availableSeasons: standingsData.availableSeasons,
				availableCircuits: standingsData.availableCircuits
			},
			seriesStats: {
				totalPlayers: standingsData.playerCount,
				totalEvents: 24, // Total AGE Open events
				prizePool: 30000 // 2026 prize pool
			},
			featuredDecklists,
			latestPodcastEpisode: podcastBundle.latestPodcastEpisode,
			podcastInfo: podcastBundle.podcastInfo,
			recentVods
		};
	} catch (error) {
		console.error('Error fetching data for homepage:', error);
		setHeaders({
			'cache-control': 'private, no-cache, no-store, must-revalidate'
		});
		return {
			articles: [],
			events: [],
			standings: [],
			standingsFilters: {
				season: 'all',
				circuit: 'all',
				availableSeasons: ['all'],
				availableCircuits: ['all']
			},
			seriesStats: {
				totalPlayers: 0,
				totalEvents: 24,
				prizePool: 30000
			},
			featuredDecklists: [],
			latestPodcastEpisode: null,
			podcastInfo: null,
			recentVods: []
		};
	}
}
