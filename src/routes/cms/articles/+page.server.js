import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsArticle, user as userTable } from '$lib/server/db/schema.js';
import { eq, desc, and, isNotNull, sql } from 'drizzle-orm';
import { userHasAnyRole } from '$lib/server/guards.js';

export async function load({ locals, url }) {
	// /cms layout enforces auth + base CMS access. Writer/Admin gating only.
	if (!userHasAnyRole(locals.user, ['admin', 'writer'])) {
		throw redirect(302, '/cms');
	}

	const status = url.searchParams.get('status') || null;

	// Base scope filter (writers see only their own articles).
	const scope = [];
	if (!userHasAnyRole(locals.user, 'admin'))
		scope.push(eq(cmsArticle.authorId, locals.user.id));

	const filters = [...scope];
	// "pending" is a synthetic status that means "has unapproved edits", not a
	// value of cms_article.status itself. Other status values pass through.
	if (status === 'pending') {
		filters.push(isNotNull(cmsArticle.draftUpdatedAt));
	} else if (status) {
		filters.push(eq(cmsArticle.status, status));
	}

	// Total pending count (always — even when not filtering by it) so the
	// chip can show a badge that draws admin attention.
	const [{ count: pendingCount }] = await db
		.select({ count: sql`COUNT(*)::int` })
		.from(cmsArticle)
		.where(
			scope.length
				? and(...scope, isNotNull(cmsArticle.draftUpdatedAt))
				: isNotNull(cmsArticle.draftUpdatedAt)
		);

	const articles = await db
		.select({
			id: cmsArticle.id,
			slug: cmsArticle.slug,
			title: cmsArticle.title,
			status: cmsArticle.status,
			accessMode: cmsArticle.accessMode,
			updatedAt: cmsArticle.updatedAt,
			publishedAt: cmsArticle.publishedAt,
			scheduledFor: cmsArticle.scheduledFor,
			source: cmsArticle.source,
			draftUpdatedAt: cmsArticle.draftUpdatedAt,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(cmsArticle)
		.leftJoin(userTable, eq(cmsArticle.authorId, userTable.id))
		.where(filters.length ? and(...filters) : undefined)
		.orderBy(desc(cmsArticle.updatedAt));

	return { articles, statusFilter: status, pendingCount: pendingCount || 0 };
}
