import { listItems } from '$lib/server/studio/list.js';
import { videoOverview } from '$lib/server/contentAnalytics/video.js';
import { parseRange } from '$lib/server/contentAnalytics/query.js';
import { muxAreaData } from '$lib/server/video/muxData.js';

const AREAS = ['studio', 'gameplay', 'podcast', 'interview', 'video'];

/** /studio/analytics?kind=…&days=… — how the Studio's media is doing, all of it or one kind. */
export async function load({ url }) {
	const asked = url.searchParams.get('kind');
	const area = AREAS.includes(asked) ? asked : 'studio';
	const days = parseRange(url.searchParams.get('days'));
	const items = (await listItems()).filter((i) => area === 'studio' || i.kind === area);
	const report = await videoOverview(area, days);
	const mux = await muxAreaData(
		items.map((i) => i.video.assetId),
		days
	);
	return {
		area,
		days,
		report,
		mux,
		names: Object.fromEntries(
			items.map((i) => [
				`vod:${i.id}`,
				{ title: i.title, href: `/studio/media/${i.id}/analytics`, assetId: i.video.assetId }
			])
		)
	};
}
