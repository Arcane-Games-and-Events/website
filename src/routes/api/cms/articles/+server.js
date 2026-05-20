import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsArticle, user as userTable } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { requireCmsAccess, userHasAnyRole } from '$lib/server/guards.js';
import { createArticle } from '$lib/server/cms/articles.js';

/**
 * GET /api/cms/articles
 * List articles. Admin sees everything; writers see their own.
 * Supports `?status=draft|scheduled|published|archived` filter.
 */
export async function GET({ url, locals }) {
	const user = requireCmsAccess(locals);
	const status = url.searchParams.get('status');

	const filters = [];
	if (!userHasAnyRole(user, 'admin')) filters.push(eq(cmsArticle.authorId, user.id));
	if (status) filters.push(eq(cmsArticle.status, status));

	const where = filters.length ? and(...filters) : undefined;

	const rows = await db
		.select({
			id: cmsArticle.id,
			slug: cmsArticle.slug,
			title: cmsArticle.title,
			excerpt: cmsArticle.excerpt,
			status: cmsArticle.status,
			accessMode: cmsArticle.accessMode,
			publishedAt: cmsArticle.publishedAt,
			scheduledFor: cmsArticle.scheduledFor,
			updatedAt: cmsArticle.updatedAt,
			authorId: cmsArticle.authorId,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName,
			source: cmsArticle.source
		})
		.from(cmsArticle)
		.leftJoin(userTable, eq(cmsArticle.authorId, userTable.id))
		.where(where)
		.orderBy(desc(cmsArticle.updatedAt));

	return json({ articles: rows });
}

/**
 * POST /api/cms/articles
 * Create a new draft. Returns the new article id + slug.
 */
export async function POST({ request, locals }) {
	const user = requireCmsAccess(locals);
	const body = await request.json().catch(() => ({}));

	const created = await createArticle({
		title: body.title || 'Untitled',
		body: body.body || null,
		authorId: user.id
	});

	if (!created) throw error(500, 'Failed to create article');
	return json({ article: created }, { status: 201 });
}
