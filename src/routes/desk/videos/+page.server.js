import { redirect } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';
import { listHeroNames } from '$lib/server/cards/heroes.js';
import { areasFor, listGameplay } from '$lib/server/video/list.js';
import { videoOverview } from '$lib/server/contentAnalytics/video.js';
import { parseRange } from '$lib/server/contentAnalytics/query.js';
import { muxAreaData } from '$lib/server/video/muxData.js';

/** /desk/videos — bonus gameplay: the list, or its analytics (?view=analytics). */
export async function load({ locals, url }) {
	const areas = areasFor(locals.user);
	if (!areas.gameplay) throw redirect(302, '/desk/videos/courses');

	const vods = await listGameplay();
	const analytics = url.searchParams.get('view') === 'analytics';
	if (analytics) {
		const days = parseRange(url.searchParams.get('days'));
		const [report, mux] = [
			await videoOverview('gameplay', days),
			await muxAreaData(
				vods.map((v) => v.video.assetId),
				days
			)
		];
		return { vods, analytics: { days, report, mux } };
	}

	const events = await db
		.select({
			id: event.id,
			title: event.title,
			circuit: event.circuit,
			eventDate: event.eventDate
		})
		.from(event)
		.orderBy(desc(event.eventDate));
	return { vods, events, heroes: listHeroNames(), analytics: null };
}
