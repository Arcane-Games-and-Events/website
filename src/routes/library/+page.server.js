import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';
import { db } from '$lib/server/db/index.js';
import { vod, event } from '$lib/server/db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getMuxThumbnailToken } from '$lib/server/mux.js';

export async function load({ setHeaders }) {
	// Cache articles list for 5 minutes, allow stale for 1 hour while revalidating
	// Vary by Cookie ensures sidebar updates properly after login/logout
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
		vary: 'Cookie'
	});

	// ============ Articles (Payload CMS) ============
	let articles = [];
	try {
		const posts = await getCachedOrFetch(
			`${CACHE_KEYS.ARTICLES}:all`,
			() => payload.getPosts(),
			CACHE_TTL.LONG
		);

		articles = posts.map((post) => {
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
					.map((tag) => {
						if (typeof tag === 'object') {
							return { name: tag.name, slug: tag.slug };
						}
						return null;
					})
					.filter(Boolean);
			}

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
				isPremium: isPremiumNow({
					accessMode: post.accessMode,
					publishedAt: post.publishedDate
				})
			};
		});
	} catch (error) {
		console.error('Error fetching articles:', error);
	}

	// ============ VODs (bonus match films from /studios) ============
	let vods = [];
	let vodTotal = 0;
	try {
		const baseConditions = [eq(vod.isPublished, true), eq(vod.status, 'ready')];

		// Left-join the event for circuit + month context so cards can show
		// "AGE Open · Los Angeles · January" style metadata.
		const [countResult, recentVods] = await Promise.all([
			db
				.select({ count: sql`count(*)::int` })
				.from(vod)
				.where(and(...baseConditions)),
			db
				.select({
					id: vod.id,
					muxPlaybackId: vod.muxPlaybackId,
					title: vod.title,
					description: vod.description,
					duration: vod.duration,
					thumbnail: vod.thumbnail,
					player1Name: vod.player1Name,
					player1Hero: vod.player1Hero,
					player2Name: vod.player2Name,
					player2Hero: vod.player2Hero,
					isPremium: vod.isPremium,
					publishedAt: vod.publishedAt,
					eventCircuit: event.circuit,
					eventMonth: event.month,
					eventTitle: event.title
				})
				.from(vod)
				.leftJoin(event, eq(vod.eventId, event.id))
				.where(and(...baseConditions))
				.orderBy(desc(vod.publishedAt))
				.limit(6)
		]);

		vodTotal = countResult[0]?.count || 0;

		// Sign Mux thumbnail tokens via the cached helper (12h Redis cache
		// under `mux:thumbnail:{playbackId}` — one sign per playbackId per
		// half-day, not per request). Failure on a single VOD is silent;
		// the card falls back to the stored thumbnail.
		vods = await Promise.all(
			recentVods.map(async (v) => {
				if (!v.muxPlaybackId) return v;
				const token = await getMuxThumbnailToken(v.muxPlaybackId);
				return token ? { ...v, thumbnailToken: token } : v;
			})
		);
	} catch (err) {
		console.warn('Could not fetch VODs:', err.message);
	}

	return {
		articles,
		vods,
		vodTotal
	};
}
