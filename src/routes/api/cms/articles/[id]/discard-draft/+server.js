import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsArticle } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireCmsAccess, userHasAnyRole } from '$lib/server/guards.js';
import { discardArticleDraft } from '$lib/server/cms/articles.js';

/**
 * POST /api/cms/articles/[id]/discard-draft
 * Wipe the staged draft_* fields without applying them. Admin only.
 */
export async function POST({ params, locals }) {
	const user = requireCmsAccess(locals);
	if (!userHasAnyRole(user, 'admin')) throw error(403, 'Only an admin can discard changes');

	const [row] = await db.select().from(cmsArticle).where(eq(cmsArticle.id, params.id)).limit(1);
	if (!row) throw error(404, 'Article not found');

	const updated = await discardArticleDraft(params.id);
	return json({ article: updated });
}
