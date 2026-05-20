import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsArticle, cmsMedia, user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditOwn, userHasAnyRole } from '$lib/server/guards.js';

export async function load({ params, locals }) {
	if (!userHasAnyRole(locals.user, ['admin', 'writer'])) throw redirect(302, '/cms');

	const [article] = await db
		.select()
		.from(cmsArticle)
		.where(eq(cmsArticle.id, params.id))
		.limit(1);

	if (!article) throw error(404, 'Article not found');
	if (!canEditOwn(locals.user, article.authorId)) throw error(403, 'Forbidden');

	// Resolve the cover that the editor should display. When a draft cover is
	// staged, the editor shows that one; otherwise it shows the live cover.
	const editingCoverId = article.draftCoverImageId || article.coverImageId;
	let coverImage = null;
	if (editingCoverId) {
		const [m] = await db
			.select()
			.from(cmsMedia)
			.where(eq(cmsMedia.id, editingCoverId))
			.limit(1);
		coverImage = m || null;
	}

	// Lightweight info on the current author so the picker shows their name.
	let author = null;
	if (article.authorId) {
		const [a] = await db
			.select({
				id: userTable.id,
				firstName: userTable.firstName,
				lastName: userTable.lastName,
				email: userTable.email
			})
			.from(userTable)
			.where(eq(userTable.id, article.authorId))
			.limit(1);
		author = a || null;
	}

	return {
		article,
		coverImage,
		author,
		isAdmin: userHasAnyRole(locals.user, 'admin')
	};
}
