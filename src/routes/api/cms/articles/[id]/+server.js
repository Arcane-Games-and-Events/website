import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsArticle } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireCmsAccess, canEditOwn, userHasAnyRole } from '$lib/server/guards.js';
import { updateArticle } from '$lib/server/cms/articles.js';

async function loadArticle(id) {
	const [row] = await db.select().from(cmsArticle).where(eq(cmsArticle.id, id)).limit(1);
	return row || null;
}

/**
 * GET /api/cms/articles/[id]
 * Returns the full article (including body) if the caller can edit it.
 */
export async function GET({ params, locals }) {
	const user = requireCmsAccess(locals);
	const article = await loadArticle(params.id);
	if (!article) throw error(404, 'Article not found');
	if (!canEditOwn(user, article.authorId)) throw error(403, 'Forbidden');
	return json({ article });
}

/**
 * PATCH /api/cms/articles/[id]
 * Apply a patch — used by both autosave (body only) and explicit form saves.
 */
export async function PATCH({ params, request, locals }) {
	const user = requireCmsAccess(locals);
	const article = await loadArticle(params.id);
	if (!article) throw error(404, 'Article not found');
	if (!canEditOwn(user, article.authorId)) throw error(403, 'Forbidden');

	const patch = await request.json().catch(() => ({}));
	const isAdmin = userHasAnyRole(user, 'admin');

	// Only admins can publish.
	if (patch.status === 'published' && !isAdmin) {
		throw error(403, 'Only an admin can publish');
	}
	// Only admins can schedule (since scheduled articles go live without
	// further review when their time arrives).
	if (patch.status === 'scheduled' && !isAdmin) {
		throw error(403, 'Only an admin can schedule articles');
	}
	// Only admins can reassign authorship.
	if ('authorId' in patch && patch.authorId !== article.authorId && !isAdmin) {
		throw error(403, 'Only an admin can change the author');
	}

	// Sanity-check schedule payload — `scheduledFor` must be a parseable date
	// in the future when status is 'scheduled'.
	if (patch.status === 'scheduled') {
		const when = patch.scheduledFor ? new Date(patch.scheduledFor) : null;
		if (!when || isNaN(when.getTime())) {
			throw error(400, 'scheduledFor is required when scheduling');
		}
		if (when.getTime() <= Date.now()) {
			throw error(400, 'scheduledFor must be in the future');
		}
		// Pass the parsed Date down so the timestamp column gets a Date, not a string.
		patch.scheduledFor = when;
	}

	const updated = await updateArticle(params.id, patch, user);
	return json({ article: updated });
}

/**
 * DELETE /api/cms/articles/[id]
 * Hard delete — only allowed when status is 'draft' (or admin override).
 */
export async function DELETE({ params, locals }) {
	const user = requireCmsAccess(locals);
	const article = await loadArticle(params.id);
	if (!article) throw error(404, 'Article not found');
	if (!canEditOwn(user, article.authorId)) throw error(403, 'Forbidden');
	if (article.status !== 'draft' && !userHasAnyRole(user, 'admin')) {
		throw error(400, 'Only draft articles can be deleted. Archive instead.');
	}

	await db.delete(cmsArticle).where(eq(cmsArticle.id, params.id));
	return json({ ok: true });
}
