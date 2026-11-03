import { parseRange } from '$lib/server/contentAnalytics/query.js';
import { courseAnalytics } from '$lib/server/courses/analytics.js';
import { courseVideos } from '$lib/server/video/list.js';
import { muxAreaData } from '$lib/server/video/muxData.js';

/**
 * One course's analytics, with viewing numbers from Mux for its trailer and
 * lesson videos (lesson pages' own visits come from AGE's tracker). The
 * course layout already checked access.
 */
export const load = async ({ params, parent, url }) => {
	await parent();
	const days = parseRange(url.searchParams.get('days'));
	const [report, cv] = await Promise.all([
		courseAnalytics(params.id, days),
		courseVideos(params.id).catch(() => null)
	]);
	const rows = [];
	if (cv?.trailer?.assetId)
		rows.push({
			key: `trailer:${params.id}`,
			title: 'Trailer',
			href: `/classroom/videos/trailer/${params.id}`,
			assetId: cv.trailer.assetId
		});
	for (const m of cv?.modules ?? [])
		for (const l of m.lessons)
			if (l.video.assetId)
				rows.push({
					key: `lesson:${l.id}`,
					title: l.title,
					href: `/classroom/videos/lesson/${l.id}`,
					assetId: l.video.assetId
				});
	return {
		report,
		videos: rows.length
			? {
					days,
					rows,
					mux: await muxAreaData(
						rows.map((r) => r.assetId),
						days
					)
				}
			: null
	};
};
