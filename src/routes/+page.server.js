import { listPublishedEntries } from '$lib/server/desk/list.js';
import { latest } from '$lib/server/studio/public.js';
import { listPublishedCourses } from '$lib/server/desk/courses.js';
import { db } from '$lib/server/db/index.js';
import { event, standing, decklist } from '$lib/server/db/schema.js';
import { asc, gte, desc, and, or, eq, isNull } from 'drizzle-orm';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { playerKey as getPlayerKey } from '$lib/server/players/key.js';
import { topByCircuit } from '$lib/server/players/circuitLeaders.js';
import { calculateDerivedStats, compareStandings } from '$lib/players/standings.js';

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

	// Each circuit's top ten, for the homepage circuit pop-outs.
	const circuitLeaders = topByCircuit(standingRows, 10);

	return {
		top8,
		topByCircuit: circuitLeaders,
		playerCount: uniquePlayers.size,
		availableSeasons: ['all', ...[...seasonSet].sort().reverse()],
		availableCircuits: ['all', ...[...circuitSet].sort()]
	};
}

function fetchAllStandings() {
	return cached(
		'standings:all',
		() => db.select().from(standing).orderBy(desc(standing.totalPoints)),
		{ tags: ['standings'] }
	);
}

/**
 * Default homepage view (no filter) — read a tiny pre-aggregated cache
 * instead of pulling the full standings table into the request and
 * iterating it in memory. Cache misses still do the full aggregation,
 * but cache hits return a small object.
 */
function fetchHomeStandingsAggregates() {
	return cached(
		'standings:home:aggregates:v3',
		async () => {
			const rows = await fetchAllStandings();
			return aggregateStandings(rows);
		},
		{ tags: ['standings'], mem: 15 }
	);
}

async function fetchFilteredStandings(season, circuit) {
	const rows = await fetchAllStandings();
	return aggregateStandings(rows, { season, circuit });
}

async function fetchArticles() {
	// Homepage feeds — Desk entries only. The list helper sorts by
	// publishedAt DESC and applies the public-visibility filter. 16 is
	// enough to fill the latest release, the Articles mosaic (1 + 3 + 4)
	// and the video rows in Watch.
	try {
		return await listPublishedEntries({ limit: 16 });
	} catch (error) {
		console.error('Error fetching Desk entries:', error);
		return [];
	}
}

async function fetchCourses() {
	// Academy section — published Desk courses. Returns [] (and the page
	// falls back to its placeholder catalog) until the first course is
	// published.
	try {
		return await listPublishedCourses({ limit: 4 });
	} catch (error) {
		console.error('Error fetching Desk courses:', error);
		return [];
	}
}

function fetchUpcomingEvents() {
	const now = new Date();
	return withTimeout(
		cached(
			'events:upcoming:12',
			() =>
				db
					.select()
					.from(event)
					.where(
						and(gte(event.eventDate, now), or(eq(event.status, 'upcoming'), isNull(event.status)))
					)
					.orderBy(asc(event.eventDate))
					.limit(12),
			{ tags: ['events'], ttl: CACHE_TTL.FIVE_MINUTES }
		),
		10000,
		[]
	);
}

function fetchFeaturedDecklists() {
	return withTimeout(
		cached(
			'decklists:featured:3',
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
			{ tags: ['decklists', 'events'] }
		),
		10000,
		[]
	);
}

/** The Studio's newest pieces of every kind (the cards carry covers and stills). */
async function fetchRecentVods() {
	try {
		return await latest({ limit: 12 });
	} catch (err) {
		console.warn('Could not fetch Studio media:', err.message);
		return [];
	}
}

export async function load({ setHeaders, url }) {
	const standingsSeason = url.searchParams.get('standings_season') || 'all';
	const standingsCircuit = url.searchParams.get('standings_circuit') || 'all';
	const isDefaultFilters = standingsSeason === 'all' && standingsCircuit === 'all';

	try {
		// All independent lookups run in parallel — cache hits resolve in one
		// round-trip instead of stacking 8 sequential awaits.
		const [articles, upcomingEvents, standingsData, featuredDecklists, recentVods, courses] =
			await Promise.all([
				fetchArticles(),
				fetchUpcomingEvents(),
				isDefaultFilters
					? fetchHomeStandingsAggregates()
					: fetchFilteredStandings(standingsSeason, standingsCircuit),
				fetchFeaturedDecklists(),
				fetchRecentVods(),
				fetchCourses()
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
			// Short edge cache so a newly published entry appears on the
			// homepage within a minute. Redis is busted immediately by the
			// entry update path; this bound is for the CDN layer.
			setHeaders({
				'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
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
			standingsByCircuit: standingsData.topByCircuit ?? {},
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
			recentVods,
			courses
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
			recentVods: [],
			courses: []
		};
	}
}
