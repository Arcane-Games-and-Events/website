import { YOUTUBE_API_KEY } from '$env/static/private';

const CHANNEL_ID = 'UC8wNJqCM_VT-LAfMDkUPLJg';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Fallback video ID - latest livestream from the channel
const FALLBACK_VIDEO_ID = 'aXYo0W_VobE';

/**
 * Fetch the latest stream - prioritizes scheduled/upcoming streams, then falls back to completed livestreams
 * @returns {Promise<{video: object|null, type: 'live'|'upcoming'|'completed'|null, error: string|null}>}
 */
export async function getLatestStream() {
	if (!YOUTUBE_API_KEY) {
		console.warn('YouTube API key not configured, using fallback');
		return {
			video: {
				id: FALLBACK_VIDEO_ID,
				title: 'AGE Tournament Stream',
				description: 'Watch our latest tournament broadcast',
				thumbnail: `https://img.youtube.com/vi/${FALLBACK_VIDEO_ID}/maxresdefault.jpg`,
				publishedAt: null,
				channelTitle: 'Arcane Games and Events'
			},
			type: 'completed',
			error: null
		};
	}

	try {
		// First, check for upcoming/scheduled streams
		const upcomingStream = await searchStreams('upcoming');
		if (upcomingStream) {
			return { video: upcomingStream, type: 'upcoming', error: null };
		}

		// Next, check for currently live streams
		const liveStream = await searchStreams('live');
		if (liveStream) {
			return { video: liveStream, type: 'live', error: null };
		}

		// Finally, fall back to the most recent completed livestream
		const completedStream = await searchStreams('completed');
		if (completedStream) {
			return { video: completedStream, type: 'completed', error: null };
		}

		// If API returns nothing, use hardcoded fallback
		return {
			video: {
				id: FALLBACK_VIDEO_ID,
				title: 'AGE Tournament Stream',
				description: 'Watch our latest tournament broadcast',
				thumbnail: `https://img.youtube.com/vi/${FALLBACK_VIDEO_ID}/maxresdefault.jpg`,
				publishedAt: null,
				channelTitle: 'Arcane Games and Events'
			},
			type: 'completed',
			error: null
		};
	} catch (err) {
		console.error('Error fetching YouTube streams:', err);
		// Return fallback on error
		return {
			video: {
				id: FALLBACK_VIDEO_ID,
				title: 'AGE Tournament Stream',
				description: 'Watch our latest tournament broadcast',
				thumbnail: `https://img.youtube.com/vi/${FALLBACK_VIDEO_ID}/maxresdefault.jpg`,
				publishedAt: null,
				channelTitle: 'Arcane Games and Events'
			},
			type: 'completed',
			error: err.message
		};
	}
}

/**
 * Search for streams by event type (live broadcasts only)
 * @param {'live'|'upcoming'|'completed'} eventType
 * @returns {Promise<object|null>}
 */
async function searchStreams(eventType) {
	const params = new URLSearchParams({
		part: 'snippet',
		channelId: CHANNEL_ID,
		type: 'video',
		eventType,
		maxResults: '1',
		order: 'date',
		key: YOUTUBE_API_KEY
	});

	const response = await fetch(`${BASE_URL}/search?${params}`);

	if (!response.ok) {
		const error = await response.json();
		console.error(`YouTube API error for eventType ${eventType}:`, error);
		return null;
	}

	const data = await response.json();

	if (data.items && data.items.length > 0) {
		const item = data.items[0];
		return {
			id: item.id.videoId,
			title: item.snippet.title,
			description: item.snippet.description,
			thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
			publishedAt: item.snippet.publishedAt,
			channelTitle: item.snippet.channelTitle
		};
	}

	return null;
}

/**
 * Get upcoming scheduled streams (for a schedule section)
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<object[]>}
 */
export async function getUpcomingStreams(maxResults = 5) {
	if (!YOUTUBE_API_KEY) {
		return [];
	}

	try {
		const params = new URLSearchParams({
			part: 'snippet',
			channelId: CHANNEL_ID,
			type: 'video',
			eventType: 'upcoming',
			maxResults: String(maxResults),
			order: 'date',
			key: YOUTUBE_API_KEY
		});

		const response = await fetch(`${BASE_URL}/search?${params}`);

		if (!response.ok) {
			return [];
		}

		const data = await response.json();

		return (data.items || []).map((item) => ({
			id: item.id.videoId,
			title: item.snippet.title,
			description: item.snippet.description,
			thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
			publishedAt: item.snippet.publishedAt,
			channelTitle: item.snippet.channelTitle
		}));
	} catch (err) {
		console.error('Error fetching upcoming streams:', err);
		return [];
	}
}

/**
 * Get recent completed livestreams (past broadcasts)
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<object[]>}
 */
export async function getPastBroadcasts(maxResults = 6) {
	if (!YOUTUBE_API_KEY) {
		return [];
	}

	try {
		const params = new URLSearchParams({
			part: 'snippet',
			channelId: CHANNEL_ID,
			type: 'video',
			eventType: 'completed',
			maxResults: String(maxResults),
			order: 'date',
			key: YOUTUBE_API_KEY
		});

		const response = await fetch(`${BASE_URL}/search?${params}`);

		if (!response.ok) {
			return [];
		}

		const data = await response.json();

		return (data.items || []).map((item) => ({
			id: item.id.videoId,
			title: item.snippet.title,
			description: item.snippet.description,
			thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
			publishedAt: item.snippet.publishedAt,
			channelTitle: item.snippet.channelTitle
		}));
	} catch (err) {
		console.error('Error fetching past broadcasts:', err);
		return [];
	}
}
