import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';
import { db } from '$lib/server/db/index.js';
import { event, standing, decklist, podcast, podcastEpisode, vod } from '$lib/server/db/schema.js';
import { asc, gte, desc, and, or, eq, isNull, sql } from 'drizzle-orm';
import mux from '$lib/server/mux.js';
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

export async function load({ setHeaders, url, locals }) {
	// Get filter params for standings
	const standingsSeason = url.searchParams.get('standings_season') || 'all';
	const standingsCircuit = url.searchParams.get('standings_circuit') || 'all';

	// Fetch articles with Redis caching (15 minute TTL for CMS content)
	let articles = [];
	try {
		const posts = await getCachedOrFetch(
			`${CACHE_KEYS.ARTICLES}:latest:12`,
			() => payload.getPosts({ limit: 12 }),
			CACHE_TTL.LONG // 15 minutes for articles
		);
		articles = posts
			.map((post) => {
				// Extract optimized cover image with srcset
				const coverImage = payload.getOptimizedImage(post.coverImage);

				// Extract author information
				let author = null;
				if (post.author && typeof post.author === 'object') {
					let profilePictureUrl = null;
					if (post.author.profilePicture && typeof post.author.profilePicture === 'object') {
						profilePictureUrl = payload.getAbsoluteUrl(post.author.profilePicture.url);
					}

					author = {
						name: post.author.name,
						slug: post.author.slug,
						profilePicture: profilePictureUrl
					};
				}

				// Extract tags
				let tags = [];
				if (post.tags && Array.isArray(post.tags)) {
					tags = post.tags
						.filter((tag) => tag && typeof tag === 'object')
						.map((tag) => ({
							name: tag.name,
							slug: tag.slug
						}));
				}

				// Check if article is currently premium-gated
				const isPremium = isPremiumNow({
					accessMode: post.accessMode,
					publishedAt: post.publishedDate
				});

				// Check if article was originally premium but is now free (premium window expired)
				const isFreeNow =
					(post.accessMode === 'Premium' || post.accessMode === 'premium') && !isPremium;

				return {
					slug: post.slug,
					title: post.title,
					excerpt: post.excerpt,
					publishedAt: post.publishedDate,
					accessMode: post.accessMode,
					coverImage,
					author,
					tags,
					readTime: post.readTime || null,
					isPremium,
					isFreeNow
				};
			})
			// Sort by published date (newest first)
			.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
			.slice(0, 12);
	} catch (error) {
		console.error('Error fetching articles from Payload CMS:', error);
		// Articles will remain empty array - page continues to load
	}

	try {
		// Helper to add timeout to promises
		const withTimeout = (promise, ms, fallback) =>
			Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

		// Fetch upcoming events with Redis caching (1 minute TTL - events change more frequently)
		// Only show events that are: upcoming in the future AND not completed/cancelled
		const now = new Date();
		const upcomingEvents = await withTimeout(
			getCachedOrFetch(
				`${CACHE_KEYS.EVENTS}:upcoming:3`,
				async () => {
					const events = await db
						.select()
						.from(event)
						.where(
							and(
								gte(event.eventDate, now),
								or(
									eq(event.status, 'upcoming'),
									isNull(event.status) // Handle legacy events without status
								)
							)
						)
						.orderBy(asc(event.eventDate))
						.limit(3);
					return events;
				},
				CACHE_TTL.SHORT // 1 minute for upcoming events
			),
			10000, // 10 second timeout
			[] // fallback to empty array
		);

		// Fetch standings for homepage sidebar with Redis caching (5 minute TTL)
		const allStandings = await withTimeout(
			getCachedOrFetch(
				`${CACHE_KEYS.STANDINGS}:all`,
				() => db.select().from(standing).orderBy(desc(standing.totalPoints)),
				CACHE_TTL.MEDIUM
			),
			10000, // 10 second timeout
			[] // fallback to empty array
		);

		// Extract unique seasons and circuits from standings data (dynamic filters)
		const uniqueSeasons = [...new Set(allStandings.map((s) => s.season))]
			.filter(Boolean)
			.sort()
			.reverse();
		const uniqueCircuits = [...new Set(allStandings.map((s) => s.circuit))].filter(Boolean).sort();
		const availableSeasons = ['all', ...uniqueSeasons];
		const availableCircuits = ['all', ...uniqueCircuits];

		// Filter standings based on selected season and circuit
		let filteredStandings = allStandings;
		if (standingsSeason !== 'all') {
			filteredStandings = filteredStandings.filter((s) => s.season === standingsSeason);
		}
		if (standingsCircuit !== 'all') {
			filteredStandings = filteredStandings.filter((s) => s.circuit === standingsCircuit);
		}

		// Aggregate stats by player identity (for career view or filtered view).
		// Standings without a GEM ID stay as separate entries — same name does
		// not imply same player.
		const statsMap = new Map();
		for (const standing of filteredStandings) {
			const key = getPlayerKey(standing);
			if (!statsMap.has(key)) {
				statsMap.set(key, {
					gemId: standing.gemId,
					playerName: standing.playerName,
					totalPoints: 0,
					matchesWon: 0,
					matchesPlayed: 0,
					eventsPlayed: 0,
					top8Finishes: 0
				});
			}
			const derived = calculateDerivedStats(standing);
			const stats = statsMap.get(key);
			stats.totalPoints += standing.totalPoints || 0;
			stats.matchesWon += standing.matchesWon || 0;
			stats.matchesPlayed += standing.matchesPlayed || 0;
			stats.eventsPlayed += derived.eventsPlayed;
			stats.top8Finishes += derived.top8Finishes;
		}

		// Sort and take top 8 for homepage
		const aggregatedStats = Array.from(statsMap.values());
		aggregatedStats.sort(compareStandings);
		const topStandings = aggregatedStats.slice(0, 8).map((player, index) => ({
			...player,
			rank: index + 1
		}));

		// Calculate total unique players across all standings (for series stats)
		const uniquePlayers = new Set();
		for (const standing of allStandings) {
			uniquePlayers.add(getPlayerKey(standing));
		}

		// Fetch featured decklists (last 3 winning decklists) with Redis caching
		const featuredDecklists = await withTimeout(
			getCachedOrFetch(
				`${CACHE_KEYS.DECKLISTS || 'decklists'}:featured:3`,
				async () => {
					const decklists = await db
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
						.limit(3);
					return decklists;
				},
				CACHE_TTL.MEDIUM // 5 minutes for decklists
			),
			10000, // 10 second timeout
			[] // fallback to empty array
		);

		// Fetch latest Cardboard & Beyond podcast episode
		let latestPodcastEpisode = null;
		let podcastInfo = null;
		try {
			const activePodcasts = await db
				.select()
				.from(podcast)
				.where(eq(podcast.isActive, true))
				.orderBy(podcast.sortOrder, podcast.createdAt)
				.limit(1);

			if (activePodcasts.length > 0) {
				podcastInfo = activePodcasts[0];
				const episodes = await db
					.select()
					.from(podcastEpisode)
					.where(
						and(eq(podcastEpisode.podcastId, podcastInfo.id), eq(podcastEpisode.isPublished, true))
					)
					.orderBy(desc(podcastEpisode.publishedAt))
					.limit(1);

				if (episodes.length > 0) {
					latestPodcastEpisode = episodes[0];
				}
			}
		} catch (err) {
			console.warn('Could not fetch podcast data:', err.message);
		}

		// Fetch latest 3 published VODs for homepage preview
		let recentVods = [];
		try {
			const baseConditions = [eq(vod.isPublished, true), eq(vod.status, 'ready')];
			const vodRows = await db
				.select()
				.from(vod)
				.where(and(...baseConditions))
				.orderBy(desc(vod.publishedAt))
				.limit(3);

			recentVods = await Promise.all(
				vodRows.map(async (v) => {
					if (!v.muxPlaybackId) return v;
					try {
						const token = await mux.jwt.signPlaybackId(v.muxPlaybackId, {
							type: 'thumbnail',
							expiration: '24h'
						});
						return { ...v, thumbnailToken: token };
					} catch {
						return v;
					}
				})
			);
		} catch (err) {
			console.warn('Could not fetch VODs:', err.message);
		}

		// IMPORTANT: Only use public caching for anonymous users
		// Logged-in users must get private responses to prevent user data leaking between sessions
		if (locals.user) {
			// Logged-in users: never cache publicly (prevents session data leaking to other users)
			setHeaders({
				'cache-control': 'private, no-cache, no-store, must-revalidate',
				vary: 'Cookie'
			});
		} else if (articles.length > 0) {
			// Anonymous users with articles: cache at CDN level
			// Vary by Cookie ensures logged-in users get fresh responses after login
			setHeaders({
				'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
				vary: 'Cookie'
			});
		} else {
			// Anonymous users without articles: don't cache error state
			setHeaders({
				'cache-control': 'private, no-cache, no-store, must-revalidate',
				vary: 'Cookie'
			});
		}

		return {
			articles,
			events: upcomingEvents,
			standings: topStandings,
			standingsFilters: {
				season: standingsSeason,
				circuit: standingsCircuit,
				availableSeasons,
				availableCircuits
			},
			seriesStats: {
				totalPlayers: uniquePlayers.size,
				totalEvents: 24, // Total AGE Open events
				prizePool: 30000 // 2026 prize pool
			},
			featuredDecklists,
			latestPodcastEpisode,
			podcastInfo,
			recentVods
		};
	} catch (error) {
		console.error('Error fetching data for homepage:', error);
		// Don't cache error responses
		setHeaders({
			'cache-control': 'private, no-cache, no-store, must-revalidate'
		});
		return {
			articles,
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
