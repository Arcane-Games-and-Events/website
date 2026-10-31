import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { canEditEntries, canEditCourses } from '$lib/server/auth/roles.js';
import { extractYouTubeVideoId, parseIso8601Duration } from '$lib/server/video/youtube.js';

/**
 * POST /api/desk/youtube/preview
 *
 * Given a YouTube URL, extracts the video ID and fetches the video's title,
 * thumbnail, and duration so the editor can preview the embed before saving
 * it. Returns the normalized shape the entry + lesson `youtube_*` columns
 * expect — the client PATCHes this straight onto the row.
 *
 * Metadata source: YouTube Data API v3 when `YOUTUBE_API_KEY` is set (gives
 * us title + thumbnail + duration in one call). Falls back to oEmbed (title
 * + thumbnail, no duration) when the API key isn't configured — the picker
 * still works, duration stays null.
 *
 * Request body: { url: string }
 * Response:     { youtubeUrl, youtubeVideoId, youtubeTitle,
 *                 youtubeThumbnailUrl, youtubeDuration }
 */
export async function POST({ request, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user) && !canEditCourses(user)) {
		throw error(403, 'Not permitted');
	}

	const { url } = await request.json().catch(() => ({}));
	if (!url || typeof url !== 'string') {
		throw error(400, 'Body must be { url }');
	}

	const videoId = extractYouTubeVideoId(url);
	if (!videoId) {
		throw error(400, "Couldn't find a YouTube video ID in that URL");
	}

	let title = null;
	let thumbnailUrl = null;
	let duration = null;

	// Prefer the Data API when we have a key — one call for everything,
	// including duration. Fall through to oEmbed on any failure.
	if (env.YOUTUBE_API_KEY) {
		try {
			const apiRes = await fetch(
				`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}&key=${env.YOUTUBE_API_KEY}`
			);
			if (apiRes.ok) {
				const body = await apiRes.json();
				const item = body?.items?.[0];
				if (item) {
					title = item.snippet?.title || null;
					thumbnailUrl =
						item.snippet?.thumbnails?.maxres?.url ||
						item.snippet?.thumbnails?.high?.url ||
						item.snippet?.thumbnails?.medium?.url ||
						`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
					duration = parseIso8601Duration(item.contentDetails?.duration);
				}
			}
		} catch (err) {
			console.warn('[youtube/preview] Data API call failed, falling back to oEmbed:', err?.message);
		}
	}

	// oEmbed fallback for title + thumbnail. No auth required, no duration.
	if (!title) {
		try {
			const oembedRes = await fetch(
				`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
			);
			if (oembedRes.ok) {
				const body = await oembedRes.json();
				title = body?.title || null;
				thumbnailUrl = body?.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
			}
		} catch (err) {
			console.warn('[youtube/preview] oEmbed fetch failed:', err?.message);
		}
	}

	// Final thumbnail fallback — YouTube's static hqdefault always resolves.
	if (!thumbnailUrl) thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

	return json({
		youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
		youtubeVideoId: videoId,
		youtubeTitle: title,
		youtubeThumbnailUrl: thumbnailUrl,
		youtubeDuration: duration
	});
}
