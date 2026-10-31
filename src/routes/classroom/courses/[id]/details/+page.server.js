import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskMedia } from '$lib/server/db/schema.js';
import { toLibraryItem } from '$lib/server/media/library.js';
import { videoOf } from '$lib/server/video/mux.js';
import { withThumb } from '$lib/server/video/list.js';

async function mediaItem(id) {
	if (!id) return null;
	const [row] = await db.select().from(deskMedia).where(eq(deskMedia.id, id)).limit(1);
	return row ? toLibraryItem(row) : null;
}

/** A course's details: words, price, images and the optional trailer. */
export const load = async ({ parent }) => {
	const { course } = await parent();
	const [cover, thumbnail, trailer] = await Promise.all([
		mediaItem(course.coverImageId),
		mediaItem(course.thumbnailImageId),
		withThumb(videoOf('trailer', course))
	]);
	return { cover, thumbnail, trailer };
};
