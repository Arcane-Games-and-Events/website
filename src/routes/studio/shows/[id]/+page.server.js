import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskMedia } from '$lib/server/db/schema.js';
import { toLibraryItem } from '$lib/server/media/library.js';
import { getShow } from '$lib/server/studio/shows.js';
import { listItems, stageOf } from '$lib/server/studio/list.js';

/** /studio/shows/[id] — one show: its details and its episodes. */
export async function load({ params, depends }) {
	depends('studio:shows');
	const show = await getShow(params.id);
	if (!show) throw error(404, 'Show not found');
	const [coverRow] = show.coverImageId
		? await db.select().from(deskMedia).where(eq(deskMedia.id, show.coverImageId)).limit(1)
		: [];
	const episodes = (await listItems())
		.filter((i) => i.showId === show.id)
		.map((i) => ({ ...i, stage: stageOf(i) }))
		.sort(
			(a, b) =>
				(b.season ?? 0) - (a.season ?? 0) ||
				(b.episodeNumber ?? 0) - (a.episodeNumber ?? 0) ||
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
	return { show, cover: coverRow ? toLibraryItem(coverRow) : null, episodes };
}
