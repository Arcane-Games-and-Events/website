import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { podcast, podcastEpisode } from '$lib/server/db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';
import { invalidateCache, CACHE_KEYS } from '$lib/server/redis/index.js';

// The homepage caches "latest podcast + latest episode" under this
// exact key. Every mutation below must bust it or new podcasts/episodes
// take up to 5 min (MEDIUM TTL) to surface on the homepage.
const HOMEPAGE_PODCAST_KEY = `${CACHE_KEYS.PODCASTS}:home:latest`;

export async function load({ locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/podcasts');
	}

	// Fetch podcasts and episodes separately (not in RPC)
	let podcasts = [];
	let podcastEpisodes = [];
	try {
		podcasts = await db.select().from(podcast).orderBy(podcast.sortOrder, podcast.createdAt);

		podcastEpisodes = await db
			.select()
			.from(podcastEpisode)
			.orderBy(desc(podcastEpisode.publishedAt));
	} catch (podcastErr) {
		console.warn('Could not fetch podcasts (table may not exist yet):', podcastErr.message);
	}

	return {
		user: locals.user,
		podcasts,
		podcastEpisodes
	};
}

export const actions = {
	// Create podcast
	createPodcast: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const youtubePlaylistUrl = formData.get('youtubePlaylistUrl')?.toString().trim();

		if (!name) {
			return fail(400, { error: 'Podcast name is required' });
		}

		try {
			const [newPodcast] = await db
				.insert(podcast)
				.values({
					name,
					description: description || null,
					youtubePlaylistUrl: youtubePlaylistUrl || null,
					createdBy: locals.user.id
				})
				.returning();

			await invalidateCache(HOMEPAGE_PODCAST_KEY);
			return { success: true, podcast: newPodcast };
		} catch (err) {
			console.error('Error creating podcast:', err);
			return fail(500, { error: 'Failed to create podcast' });
		}
	},

	// Update podcast
	updatePodcast: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const podcastId = formData.get('podcastId')?.toString();
		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const youtubePlaylistUrl = formData.get('youtubePlaylistUrl')?.toString().trim();
		const isActive = formData.get('isActive') === 'true';

		if (!podcastId || !name) {
			return fail(400, { error: 'Podcast ID and name are required' });
		}

		try {
			const [updated] = await db
				.update(podcast)
				.set({
					name,
					description: description || null,
					youtubePlaylistUrl: youtubePlaylistUrl || null,
					isActive,
					updatedAt: new Date()
				})
				.where(eq(podcast.id, podcastId))
				.returning();

			await invalidateCache(HOMEPAGE_PODCAST_KEY);
			return { success: true, podcast: updated };
		} catch (err) {
			console.error('Error updating podcast:', err);
			return fail(500, { error: 'Failed to update podcast' });
		}
	},

	// Delete podcast
	deletePodcast: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const podcastId = formData.get('podcastId')?.toString();

		if (!podcastId) {
			return fail(400, { error: 'Podcast ID is required' });
		}

		try {
			await db.delete(podcast).where(eq(podcast.id, podcastId));
			await invalidateCache(HOMEPAGE_PODCAST_KEY);
			return { success: true };
		} catch (err) {
			console.error('Error deleting podcast:', err);
			return fail(500, { error: 'Failed to delete podcast' });
		}
	},

	// Create podcast episode
	createPodcastEpisode: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const podcastId = formData.get('podcastId')?.toString();
		const youtubeUrl = formData.get('youtubeUrl')?.toString().trim();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const guest = formData.get('guest')?.toString().trim();
		const season = formData.get('season')?.toString();
		const episode = formData.get('episode')?.toString();
		const publishedAt = formData.get('publishedAt')?.toString();
		const thumbnailUrl = formData.get('thumbnailUrl')?.toString().trim();
		const duration = formData.get('duration')?.toString().trim();

		if (!podcastId || !youtubeUrl || !title) {
			return fail(400, { error: 'Podcast ID, YouTube URL, and title are required' });
		}

		// Extract video ID from YouTube URL
		let youtubeVideoId = null;
		try {
			const url = new URL(youtubeUrl);
			if (url.hostname.includes('youtube.com')) {
				youtubeVideoId = url.searchParams.get('v');
			} else if (url.hostname.includes('youtu.be')) {
				youtubeVideoId = url.pathname.slice(1);
			}
		} catch {
			// Invalid URL, continue without video ID
		}

		try {
			const [newEpisode] = await db
				.insert(podcastEpisode)
				.values({
					podcastId,
					youtubeUrl,
					youtubeVideoId,
					title,
					description: description || null,
					guest: guest || null,
					season: season ? parseInt(season) : null,
					episode: episode ? parseInt(episode) : null,
					publishedAt: publishedAt ? new Date(publishedAt) : null,
					thumbnailUrl: thumbnailUrl || null,
					duration: duration || null,
					createdBy: locals.user.id
				})
				.returning();

			await invalidateCache(HOMEPAGE_PODCAST_KEY);
			return { success: true, episode: newEpisode };
		} catch (err) {
			console.error('Error creating podcast episode:', err);
			return fail(500, { error: 'Failed to create podcast episode' });
		}
	},

	// Update podcast episode
	updatePodcastEpisode: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const episodeId = formData.get('episodeId')?.toString();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const guest = formData.get('guest')?.toString().trim();
		const season = formData.get('season')?.toString();
		const episode = formData.get('episode')?.toString();
		const publishedAt = formData.get('publishedAt')?.toString();
		const isPublished = formData.get('isPublished') === 'true';

		if (!episodeId || !title) {
			return fail(400, { error: 'Episode ID and title are required' });
		}

		try {
			const [updated] = await db
				.update(podcastEpisode)
				.set({
					title,
					description: description || null,
					guest: guest || null,
					season: season ? parseInt(season) : null,
					episode: episode ? parseInt(episode) : null,
					publishedAt: publishedAt ? new Date(publishedAt) : null,
					isPublished,
					updatedAt: new Date()
				})
				.where(eq(podcastEpisode.id, episodeId))
				.returning();

			await invalidateCache(HOMEPAGE_PODCAST_KEY);
			return { success: true, episode: updated };
		} catch (err) {
			console.error('Error updating podcast episode:', err);
			return fail(500, { error: 'Failed to update podcast episode' });
		}
	},

	// Delete podcast episode
	deletePodcastEpisode: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const episodeId = formData.get('episodeId')?.toString();

		if (!episodeId) {
			return fail(400, { error: 'Episode ID is required' });
		}

		try {
			await db.delete(podcastEpisode).where(eq(podcastEpisode.id, episodeId));
			await invalidateCache(HOMEPAGE_PODCAST_KEY);
			return { success: true };
		} catch (err) {
			console.error('Error deleting podcast episode:', err);
			return fail(500, { error: 'Failed to delete podcast episode' });
		}
	},

	// Sync episodes from YouTube playlist
	syncPlaylist: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const podcastId = formData.get('podcastId')?.toString();

		if (!podcastId) {
			return fail(400, { error: 'Podcast ID is required' });
		}

		// Get podcast with playlist URL
		const [podcastData] = await db.select().from(podcast).where(eq(podcast.id, podcastId)).limit(1);

		if (!podcastData?.youtubePlaylistUrl) {
			return fail(400, { error: 'Podcast has no YouTube playlist URL' });
		}

		// Extract playlist ID
		let playlistId = null;
		try {
			const url = new URL(podcastData.youtubePlaylistUrl);
			playlistId = url.searchParams.get('list');
		} catch {
			return fail(400, { error: 'Invalid YouTube playlist URL' });
		}

		if (!playlistId) {
			return fail(400, { error: 'Could not extract playlist ID from URL' });
		}

		const apiKey = env.YOUTUBE_API_KEY;
		if (!apiKey) {
			return fail(500, { error: 'YouTube API key not configured' });
		}

		try {
			// Fetch all playlist items (paginated)
			const allItems = [];
			let nextPageToken = null;

			do {
				const params = new URLSearchParams({
					part: 'snippet,contentDetails',
					playlistId,
					maxResults: '50',
					key: apiKey
				});
				if (nextPageToken) params.set('pageToken', nextPageToken);

				const response = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?${params}`
				);

				if (!response.ok) {
					const err = await response.json();
					console.error('YouTube API error:', err);
					return fail(500, {
						error: `YouTube API error: ${err.error?.message || 'Unknown error'}`
					});
				}

				const data = await response.json();
				allItems.push(...(data.items || []));
				nextPageToken = data.nextPageToken || null;
			} while (nextPageToken);

			if (allItems.length === 0) {
				return { success: true, syncResult: { created: 0, skipped: 0, total: 0 } };
			}

			// Get existing episode video IDs for this podcast
			const existingEpisodes = await db
				.select({ youtubeVideoId: podcastEpisode.youtubeVideoId })
				.from(podcastEpisode)
				.where(eq(podcastEpisode.podcastId, podcastId));

			const existingVideoIds = new Set(
				existingEpisodes.map((e) => e.youtubeVideoId).filter(Boolean)
			);

			// Filter to only new videos
			const newItems = allItems.filter((item) => {
				const videoId = item.contentDetails?.videoId;
				// Skip private/deleted videos
				if (item.snippet?.title === 'Private video' || item.snippet?.title === 'Deleted video')
					return false;
				return videoId && !existingVideoIds.has(videoId);
			});

			if (newItems.length === 0) {
				return {
					success: true,
					syncResult: { created: 0, skipped: allItems.length, total: allItems.length }
				};
			}

			// Fetch video details (duration) in batches of 50
			const videoIds = newItems.map((item) => item.contentDetails.videoId);
			const videoDurations = new Map();

			for (let i = 0; i < videoIds.length; i += 50) {
				const batch = videoIds.slice(i, i + 50);
				const detailParams = new URLSearchParams({
					part: 'contentDetails',
					id: batch.join(','),
					key: apiKey
				});

				const detailResponse = await fetch(
					`https://www.googleapis.com/youtube/v3/videos?${detailParams}`
				);

				if (detailResponse.ok) {
					const detailData = await detailResponse.json();
					for (const video of detailData.items || []) {
						// Parse ISO 8601 duration (PT1H23M45S)
						const iso = video.contentDetails?.duration || '';
						const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
						if (match) {
							const h = parseInt(match[1] || '0');
							const m = parseInt(match[2] || '0');
							const s = parseInt(match[3] || '0');
							if (h > 0) {
								videoDurations.set(
									video.id,
									`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
								);
							} else {
								videoDurations.set(video.id, `${m}:${s.toString().padStart(2, '0')}`);
							}
						}
					}
				}
			}

			// Insert new episodes
			const episodesToInsert = newItems.map((item, index) => {
				const videoId = item.contentDetails.videoId;
				const snippet = item.snippet;
				const thumbnailUrl =
					snippet.thumbnails?.maxres?.url ||
					snippet.thumbnails?.high?.url ||
					snippet.thumbnails?.medium?.url ||
					`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

				return {
					podcastId,
					youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
					youtubeVideoId: videoId,
					title: snippet.title,
					description: snippet.description || null,
					thumbnailUrl,
					publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
					duration: videoDurations.get(videoId) || null,
					createdBy: locals.user.id
				};
			});

			await db.insert(podcastEpisode).values(episodesToInsert);

			await invalidateCache(HOMEPAGE_PODCAST_KEY);
			return {
				success: true,
				syncResult: {
					created: episodesToInsert.length,
					skipped: allItems.length - newItems.length,
					total: allItems.length
				}
			};
		} catch (err) {
			console.error('Error syncing playlist:', err);
			return fail(500, { error: 'Failed to sync playlist: ' + err.message });
		}
	},

	// Fetch YouTube video metadata
	fetchYouTubeMetadata: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const youtubeUrl = formData.get('youtubeUrl')?.toString().trim();

		if (!youtubeUrl) {
			return fail(400, { error: 'YouTube URL is required' });
		}

		// Extract video ID
		let videoId = null;
		try {
			const url = new URL(youtubeUrl);
			if (url.hostname.includes('youtube.com')) {
				videoId = url.searchParams.get('v');
			} else if (url.hostname.includes('youtu.be')) {
				videoId = url.pathname.slice(1);
			}
		} catch {
			return fail(400, { error: 'Invalid YouTube URL' });
		}

		if (!videoId) {
			return fail(400, { error: 'Could not extract video ID from URL' });
		}

		try {
			// Use YouTube oEmbed API (no API key needed)
			const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
			const response = await fetch(oembedUrl);

			if (!response.ok) {
				throw new Error('Video not found');
			}

			const oembedData = await response.json();

			// Get high-quality thumbnail
			const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

			return {
				success: true,
				metadata: {
					videoId,
					title: oembedData.title,
					thumbnailUrl,
					authorName: oembedData.author_name
				}
			};
		} catch (err) {
			console.error('Error fetching YouTube metadata:', err);
			return fail(500, {
				error: 'Failed to fetch video metadata. Make sure the URL is a valid public YouTube video.'
			});
		}
	}
};
