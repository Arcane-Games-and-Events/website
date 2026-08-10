import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry, cmsMedia } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditEntries, isAdmin, ownsOrAdmin } from '$lib/server/auth/roles.js';

export async function load({ params, locals }) {
	if (!canEditEntries(locals.user)) throw redirect(302, '/cms');

	const [entry] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, params.id)).limit(1);
	if (!entry) throw error(404, 'Entry not found');
	if (!ownsOrAdmin(locals.user, entry.authorId)) throw error(403, 'Forbidden');

	// Resolve the cover the editor should display: draft cover if buffered,
	// otherwise the live cover.
	const editingCoverId = entry.draftCoverImageId || entry.coverImageId;
	let coverImage = null;
	if (editingCoverId) {
		const [m] = await db.select().from(cmsMedia).where(eq(cmsMedia.id, editingCoverId)).limit(1);
		coverImage = m || null;
	}

	return {
		entry,
		coverImage,
		isAdmin: isAdmin(locals.user)
	};
}
