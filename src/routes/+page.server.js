import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';
import { db } from '$lib/server/db/index.js';
import { event, seasonStanding } from '$lib/server/db/schema.js';
import { asc, gte, desc } from 'drizzle-orm';

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

	const eventsPlayed = monthlyPoints.filter(p => p > 0).length;
	const top8Finishes = monthlyPoints.filter(p => p >= 15).length;

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

export async function load({ setHeaders, url }) {
	// Cache homepage data for 5 minutes, allow stale for 1 hour while revalidating
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
	});

	// Get filter params for standings
	const standingsSeason = url.searchParams.get('standings_season') || 'all';
	const standingsCircuit = url.searchParams.get('standings_circuit') || 'all';

	// Available seasons and circuits for filters
	const availableSeasons = ['all', '2025', '2024', '2023'];
	const availableCircuits = ['all', 'Los Angeles', 'New England', 'St. Louis'];

	try {
		// Fetch latest 3 articles from Payload CMS
		const posts = await payload.getPosts({ limit: 3 });

		const articles = posts.map((post) => {
			// Extract cover image URL
			let coverImageUrl = null;
			if (post.coverImage && typeof post.coverImage === 'object') {
				coverImageUrl = payload.getAbsoluteUrl(post.coverImage.url);
			}

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

			return {
				slug: post.slug,
				title: post.title,
				excerpt: post.excerpt,
				publishedAt: post.publishedDate,
				accessMode: post.accessMode,
				coverImage: coverImageUrl,
				author,
				readTime: post.readTime || null,
				isPremium: isPremiumNow({
					accessMode: post.accessMode,
					publishedAt: post.publishedDate
				})
			};
		})
		// Sort by published date (newest first)
		.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
		.slice(0, 3);

		// Fetch upcoming events (limit to 3)
		const now = new Date();
		const upcomingEvents = await db
			.select()
			.from(event)
			.where(gte(event.eventDate, now))
			.orderBy(asc(event.eventDate))
			.limit(3);

		// Fetch standings for homepage sidebar with optional filtering
		const allStandings = await db
			.select()
			.from(seasonStanding)
			.orderBy(desc(seasonStanding.totalPoints));

		// Filter standings based on selected season and circuit
		let filteredStandings = allStandings;
		if (standingsSeason !== 'all') {
			filteredStandings = filteredStandings.filter(s => s.season === standingsSeason);
		}
		if (standingsCircuit !== 'all') {
			filteredStandings = filteredStandings.filter(s => s.circuit === standingsCircuit);
		}

		// Aggregate stats by gemId/playerName (for career view or filtered view)
		const statsMap = new Map();
		for (const standing of filteredStandings) {
			const key = standing.gemId || standing.playerName;
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
			uniquePlayers.add(standing.gemId || standing.playerName);
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
			}
		};
	} catch (error) {
		console.error('Error fetching data for homepage:', error);
		return {
			articles: [],
			events: [],
			standings: [],
			standingsFilters: {
				season: 'all',
				circuit: 'all',
				availableSeasons: ['all', '2025', '2024', '2023'],
				availableCircuits: ['all', 'Los Angeles', 'New England', 'St. Louis']
			},
			seriesStats: {
				totalPlayers: 0,
				totalEvents: 24,
				prizePool: 30000
			}
		};
	}
}
