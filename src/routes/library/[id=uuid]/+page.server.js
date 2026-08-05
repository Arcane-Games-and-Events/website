import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { vod } from '$lib/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import mux from '$lib/server/mux.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';

export async function load({ params, locals }) {
	// Load VOD by ID
	const [vodItem] = await db.select().from(vod).where(eq(vod.id, params.id)).limit(1);

	if (!vodItem || !vodItem.isPublished || vodItem.status !== 'ready') {
		throw error(404, 'VOD not found');
	}

	const user = locals.user;
	const canWatch = !vodItem.isPremium || userHasPremiumAccess(user);

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

	// Load related VODs (same category or event, excluding current)
	let relatedVods = [];
	try {
		const conditions = [eq(vod.isPublished, true), eq(vod.status, 'ready')];

		relatedVods = await db
			.select()
			.from(vod)
			.where(and(...conditions))
			.orderBy(desc(vod.publishedAt))
			.limit(7);

		// Filter out current and prioritize same players/event
		const vodPlayers = [vodItem.player1Name, vodItem.player2Name].filter(Boolean);
		relatedVods = relatedVods
			.filter((v) => v.id !== vodItem.id)
			.sort((a, b) => {
				const aPlayers = [a.player1Name, a.player2Name].filter(Boolean);
				const bPlayers = [b.player1Name, b.player2Name].filter(Boolean);
				const aPlayerOverlap = aPlayers.filter((p) => vodPlayers.includes(p)).length;
				const bPlayerOverlap = bPlayers.filter((p) => vodPlayers.includes(p)).length;
				const aScore = aPlayerOverlap * 2 + (a.eventId && a.eventId === vodItem.eventId ? 3 : 0);
				const bScore = bPlayerOverlap * 2 + (b.eventId && b.eventId === vodItem.eventId ? 3 : 0);
				return bScore - aScore;
			})
			.slice(0, 4);
	} catch (err) {
		console.warn('Could not fetch related VODs:', err.message);
	}

	// Sign thumbnail tokens for related VODs and paywall thumbnail
	const relatedWithTokens = await Promise.all(
		relatedVods.map(async (v) => {
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

	// Sign a thumbnail token for paywall background if user can't watch
	let vodThumbnailToken = null;
	if (!canWatch && vodItem.muxPlaybackId) {
		try {
			vodThumbnailToken = await mux.jwt.signPlaybackId(vodItem.muxPlaybackId, {
				type: 'thumbnail',
				expiration: '24h'
			});
		} catch {}
	}

	return {
		user,
		vod: vodItem,
		canWatch,
		tokens,
		vodThumbnailToken,
		relatedVods: relatedWithTokens
	};
}
