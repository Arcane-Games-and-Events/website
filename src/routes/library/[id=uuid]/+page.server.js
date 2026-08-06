import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { vod } from '$lib/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import mux, { getMuxThumbnailToken } from '$lib/server/mux.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';

export async function load({ params, locals }) {
	// Cache the shared read side: the VOD row itself + the ranked
	// related-VOD list. The paywall/playback token signing sits OUTSIDE
	// this cache because it depends on the viewer's premium status; the
	// thumbnail token signing routes through `getMuxThumbnailToken` which
	// has its own 12h Redis cache.
	const cached = await getCachedOrFetch(
		`${CACHE_KEYS.VODS}:viewer:${params.id}`,
		async () => {
			const [vodItem] = await db.select().from(vod).where(eq(vod.id, params.id)).limit(1);

			if (!vodItem || !vodItem.isPublished || vodItem.status !== 'ready') {
				return { vodItem: null, relatedVods: [] };
			}

			let relatedVods = [];
			try {
				const conditions = [eq(vod.isPublished, true), eq(vod.status, 'ready')];

				const rows = await db
					.select()
					.from(vod)
					.where(and(...conditions))
					.orderBy(desc(vod.publishedAt))
					.limit(7);

				const vodPlayers = [vodItem.player1Name, vodItem.player2Name].filter(Boolean);
				relatedVods = rows
					.filter((v) => v.id !== vodItem.id)
					.sort((a, b) => {
						const aPlayers = [a.player1Name, a.player2Name].filter(Boolean);
						const bPlayers = [b.player1Name, b.player2Name].filter(Boolean);
						const aPlayerOverlap = aPlayers.filter((p) => vodPlayers.includes(p)).length;
						const bPlayerOverlap = bPlayers.filter((p) => vodPlayers.includes(p)).length;
						const aScore =
							aPlayerOverlap * 2 + (a.eventId && a.eventId === vodItem.eventId ? 3 : 0);
						const bScore =
							bPlayerOverlap * 2 + (b.eventId && b.eventId === vodItem.eventId ? 3 : 0);
						return bScore - aScore;
					})
					.slice(0, 4);
			} catch (err) {
				console.warn('Could not fetch related VODs:', err.message);
			}

			return { vodItem, relatedVods };
		},
		CACHE_TTL.MEDIUM
	);

	const vodItem = cached?.vodItem;
	if (!vodItem) {
		throw error(404, 'VOD not found');
	}

	const user = locals.user;
	const canWatch = !vodItem.isPremium || userHasPremiumAccess(user);

	// Playback tokens include the 'video' scope and authorize actual
	// watching, so they're signed fresh per request and NEVER cached
	// server-side. Cheap: one Mux JWT sign call.
	let tokens = null;
	if (canWatch && vodItem.muxPlaybackId) {
		try {
			tokens = await mux.jwt.signPlaybackId(vodItem.muxPlaybackId, {
				type: ['video', 'thumbnail', 'storyboard'],
				expiration: '24h'
			});
		} catch (err) {
			console.error('Error signing Mux playback tokens:', err);
		}
	}

	// Thumbnail tokens (for related-VOD cards and the paywall blur) all
	// route through the cached helper — same signature reused for ~12h.
	const relatedVods = await Promise.all(
		(cached.relatedVods || []).map(async (v) => {
			if (!v.muxPlaybackId) return v;
			const token = await getMuxThumbnailToken(v.muxPlaybackId);
			return token ? { ...v, thumbnailToken: token } : v;
		})
	);

	let vodThumbnailToken = null;
	if (!canWatch && vodItem.muxPlaybackId) {
		vodThumbnailToken = await getMuxThumbnailToken(vodItem.muxPlaybackId);
	}

	return {
		user,
		vod: vodItem,
		canWatch,
		tokens,
		vodThumbnailToken,
		relatedVods
	};
}
