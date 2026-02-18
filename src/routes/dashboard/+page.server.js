import { redirect } from '@sveltejs/kit';
import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';
import { db } from '$lib/server/db/index.js';
import {
	ticket,
	event,
	standing,
	decklist,
	podcast,
	podcastEpisode,
	vod
} from '$lib/server/db/schema.js';
import { eq, and, desc, gte, or, isNull, asc } from 'drizzle-orm';
import mux from '$lib/server/mux.js';

/**
 * Tiebreaker logic for standings (same as homepage)
 */
function calculateDerivedStats(s) {
	const months = [
		s.januaryPoints || 0,
		s.februaryPoints || 0,
		s.marchPoints || 0,
		s.aprilPoints || 0,
		s.mayPoints || 0,
		s.junePoints || 0,
		s.julyPoints || 0,
		s.augustPoints || 0,
		s.septemberPoints || 0,
		s.octoberPoints || 0,
		s.novemberPoints || 0,
		s.decemberPoints || 0
	];
	return {
		eventsPlayed: months.filter((p) => p > 0).length,
		top8Finishes: months.filter((p) => p >= 15).length
	};
}

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

export async function load({ locals, fetch }) {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const now = new Date();

	// --- User's upcoming tickets ---
	let upcomingTickets = [];
	try {
		upcomingTickets = await db
			.select({
				ticketId: ticket.id,
				ticketCode: ticket.code,
				quantity: ticket.quantity,
				eventId: event.id,
				eventTitle: event.title,
				eventDate: event.eventDate,
				eventLocation: event.location,
				eventFormat: event.format,
				eventCircuit: event.circuit
			})
			.from(ticket)
			.innerJoin(event, eq(ticket.eventId, event.id))
			.where(
				and(
					eq(ticket.userId, locals.user.id),
					eq(ticket.refunded, false),
					gte(event.eventDate, now),
					or(eq(event.status, 'upcoming'), isNull(event.status))
				)
			)
			.orderBy(event.eventDate)
			.limit(3);
	} catch (err) {
		console.warn('Could not fetch tickets:', err.message);
	}

	// --- Player standing ---
	let playerStanding = null;
	if (locals.user.gemId) {
		try {
			const standings = await db
				.select()
				.from(standing)
				.where(eq(standing.gemId, locals.user.gemId))
				.orderBy(desc(standing.totalPoints))
				.limit(1);
			if (standings.length > 0) playerStanding = standings[0];
		} catch (err) {
			console.warn('Could not fetch standing:', err.message);
		}
	}

	// --- Articles from Payload CMS ---
	let articles = [];
	try {
		const posts = await payload.getPosts({ limit: 6, fetch });
		articles = posts
			.map((post) => {
				const coverImage = payload.getOptimizedImage(post.coverImage);
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
				let tags = [];
				if (post.tags && Array.isArray(post.tags)) {
					tags = post.tags
						.filter((tag) => tag && typeof tag === 'object')
						.map((tag) => ({ name: tag.name, slug: tag.slug }));
				}
				const isPremium = isPremiumNow({
					accessMode: post.accessMode,
					publishedAt: post.publishedDate
				});
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
			.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
			.slice(0, 6);
	} catch (err) {
		console.warn('Could not fetch articles:', err.message);
	}

	// --- Recent VODs with Mux thumbnails ---
	let recentVods = [];
	try {
		const vodRows = await db
			.select()
			.from(vod)
			.where(and(eq(vod.isPublished, true), eq(vod.status, 'ready')))
			.orderBy(desc(vod.publishedAt))
			.limit(4);
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

	// --- Latest podcast episode ---
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
			if (episodes.length > 0) latestPodcastEpisode = episodes[0];
		}
	} catch (err) {
		console.warn('Could not fetch podcast:', err.message);
	}

	// --- Featured decklists (1st place, public) ---
	let featuredDecklists = [];
	try {
		featuredDecklists = await db
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
	} catch (err) {
		console.warn('Could not fetch decklists:', err.message);
	}

	// --- Leaderboard (top 5 aggregated) ---
	let leaderboard = [];
	try {
		const allStandings = await db.select().from(standing).orderBy(desc(standing.totalPoints));
		const statsMap = new Map();
		for (const s of allStandings) {
			const key = s.gemId || s.playerName;
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
		const sorted = Array.from(statsMap.values());
		sorted.sort(compareStandings);
		leaderboard = sorted.slice(0, 5).map((p, i) => ({ ...p, rank: i + 1 }));
	} catch (err) {
		console.warn('Could not fetch leaderboard:', err.message);
	}

	// --- Upcoming events (general, for sidebar) ---
	let upcomingEvents = [];
	try {
		upcomingEvents = await db
			.select()
			.from(event)
			.where(and(gte(event.eventDate, now), or(eq(event.status, 'upcoming'), isNull(event.status))))
			.orderBy(asc(event.eventDate))
			.limit(3);
	} catch (err) {
		console.warn('Could not fetch upcoming events:', err.message);
	}

	// --- Recently completed events (for results feed) ---
	let completedEvents = [];
	try {
		completedEvents = await db
			.select()
			.from(event)
			.where(eq(event.status, 'completed'))
			.orderBy(desc(event.closedAt))
			.limit(3);
	} catch (err) {
		console.warn('Could not fetch completed events:', err.message);
	}

	// --- Trending heroes (derived from VODs + decklists) ---
	const heroCount = new Map();
	for (const v of recentVods) {
		if (v.player1Hero) heroCount.set(v.player1Hero, (heroCount.get(v.player1Hero) || 0) + 1);
		if (v.player2Hero) heroCount.set(v.player2Hero, (heroCount.get(v.player2Hero) || 0) + 1);
	}
	for (const d of featuredDecklists) {
		if (d.hero) heroCount.set(d.hero, (heroCount.get(d.hero) || 0) + 1);
	}
	const trendingHeroes = Array.from(heroCount.entries())
		.map(([hero, count]) => ({ hero, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	return {
		user: locals.user,
		upcomingTickets,
		playerStanding,
		articles,
		vods: recentVods,
		latestPodcastEpisode,
		podcastInfo,
		featuredDecklists,
		leaderboard,
		upcomingEvents,
		completedEvents,
		trendingHeroes
	};
}
