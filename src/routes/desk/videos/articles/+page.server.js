import { redirect } from '@sveltejs/kit';
import { areasFor, listArticleVideos } from '$lib/server/video/list.js';
import { videoOverview } from '$lib/server/contentAnalytics/video.js';
import { parseRange } from '$lib/server/contentAnalytics/query.js';
import { muxAreaData } from '$lib/server/video/muxData.js';

/** /desk/videos/articles — each entry's uploaded video, or their analytics. */
export async function load({ locals, url }) {
	if (!areasFor(locals.user).articles) throw redirect(302, '/desk');
	const entries = await listArticleVideos();
	if (url.searchParams.get('view') === 'analytics') {
		const days = parseRange(url.searchParams.get('days'));
		const report = await videoOverview('articles', days);
		const mux = await muxAreaData(
			entries.map((e) => e.video.assetId),
			days
		);
		return { entries, analytics: { days, report, mux } };
	}
	return { entries, analytics: null };
}
