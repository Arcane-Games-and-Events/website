import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { vod } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { videoPage } from '$lib/server/video/page.js';

/**
 * /studio/media/[id]/analytics — one item's numbers (the shared video
 * analytics page). A bonus match's are in the Desk, beside the match.
 */
export async function load(event) {
	const [row] = await db
		.select({ kind: vod.kind })
		.from(vod)
		.where(eq(vod.id, event.params.id))
		.limit(1);
	if (row?.kind === 'gameplay') throw redirect(302, `/desk/matches/${event.params.id}/analytics`);
	return videoPage({ ...event, params: { target: 'vod', id: event.params.id } });
}
