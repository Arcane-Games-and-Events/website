import { getLatestStream, getUpcomingStreams, getPastBroadcasts } from '$lib/server/youtube.js';

export async function load({ locals }) {
	// Fetch stream data in parallel
	const [latestStreamResult, upcomingStreams, pastBroadcasts] = await Promise.all([
		getLatestStream(),
		getUpcomingStreams(3),
		getPastBroadcasts(6)
	]);

	return {
		user: locals.user,
		latestStream: latestStreamResult.video,
		streamType: latestStreamResult.type, // 'live', 'upcoming', or 'completed'
		upcomingStreams,
		pastBroadcasts
	};
}
