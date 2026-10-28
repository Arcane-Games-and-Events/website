import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskMedia, user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditEntries, isAdmin, canEditEntry } from '$lib/server/auth/roles.js';

export async function load({ params, locals }) {
	if (!canEditEntries(locals.user)) throw redirect(302, '/desk');

	const [entry] = await db.select().from(deskEntry).where(eq(deskEntry.id, params.id)).limit(1);
	if (!entry) throw error(404, 'Entry not found');
	if (!canEditEntry(locals.user, entry.authorId)) throw error(403, 'Forbidden');

	// Resolve cover + thumbnail media + author user so the sidebar can
	// show all three without an extra client round-trip. Draft-buffered
	// versions win when the entry has pending edits.
	const editingCoverId = entry.draftCoverImageId || entry.coverImageId;
	const editingThumbnailId = entry.draftThumbnailImageId || entry.thumbnailImageId;

	const [coverImage, thumbnailImage, author] = await Promise.all([
		editingCoverId
			? db
					.select()
					.from(deskMedia)
					.where(eq(deskMedia.id, editingCoverId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null),
		editingThumbnailId
			? db
					.select()
					.from(deskMedia)
					.where(eq(deskMedia.id, editingThumbnailId))
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
