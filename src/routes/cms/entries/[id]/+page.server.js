import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry, cmsMedia, user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditEntries, isAdmin, ownsOrAdmin } from '$lib/server/auth/roles.js';

export async function load({ params, locals }) {
	if (!canEditEntries(locals.user)) throw redirect(302, '/cms');

	const [entry] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, params.id)).limit(1);
	if (!entry) throw error(404, 'Entry not found');
	if (!ownsOrAdmin(locals.user, entry.authorId)) throw error(403, 'Forbidden');

	// Resolve cover + thumbnail media + author user so the sidebar can
	// show all three without an extra client round-trip. Draft-buffered
	// versions win when the entry has pending edits.
	const editingCoverId = entry.draftCoverImageId || entry.coverImageId;
	const editingThumbnailId = entry.draftThumbnailImageId || entry.thumbnailImageId;

	const [coverImage, thumbnailImage, author] = await Promise.all([
		editingCoverId
			? db
					.select()
					.from(cmsMedia)
					.where(eq(cmsMedia.id, editingCoverId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null),
		editingThumbnailId
			? db
					.select()
					.from(cmsMedia)
					.where(eq(cmsMedia.id, editingThumbnailId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null),
		entry.authorId
			? db
					.select({
						id: userTable.id,
						firstName: userTable.firstName,
						lastName: userTable.lastName,
						email: userTable.email
					})
					.from(userTable)
					.where(eq(userTable.id, entry.authorId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null)
	]);

	return {
		entry,
		coverImage,
		thumbnailImage,
		author,
		isAdmin: isAdmin(locals.user)
	};
}
