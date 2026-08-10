import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry, user as userTable } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { canEditEntries, isAdmin } from '$lib/server/auth/roles.js';
import { createEntry } from '$lib/server/cms/entries.js';

/**
 * GET /api/cms/entries
 * List entries. Admin sees everything; writers see only entries they authored.
 * Optional `?status=draft|scheduled|published|archived` filter.
 */
export async function GET({ url, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user)) throw error(403, 'Not permitted');

	const status = url.searchParams.get('status');
	const filters = [];
	if (!isAdmin(user)) filters.push(eq(cmsEntry.authorId, user.id));
	if (status) filters.push(eq(cmsEntry.status, status));
	const where = filters.length ? and(...filters) : undefined;

	const rows = await db
		.select({
			id: cmsEntry.id,
			slug: cmsEntry.slug,
			title: cmsEntry.title,
			excerpt: cmsEntry.excerpt,
			status: cmsEntry.status,
			accessMode: cmsEntry.accessMode,
			publishedAt: cmsEntry.publishedAt,
			scheduledFor: cmsEntry.scheduledFor,
			updatedAt: cmsEntry.updatedAt,
			authorId: cmsEntry.authorId,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName,
			source: cmsEntry.source,
			draftUpdatedAt: cmsEntry.draftUpdatedAt
		})
		.from(cmsEntry)
		.leftJoin(userTable, eq(cmsEntry.authorId, userTable.id))
		.where(where)
		.orderBy(desc(cmsEntry.updatedAt));

	return json({ entries: rows });
}

/**
 * POST /api/cms/entries
 * Create a new draft entry, authored by the caller.
 */
export async function POST({ request, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user)) throw error(403, 'Not permitted');

	const body = await request.json().catch(() => ({}));
	const created = await createEntry({
		title: body.title || 'Untitled',
		body: body.body || null,
		authorId: user.id
	});
	if (!created) throw error(500, 'Failed to create entry');
	return json({ entry: created }, { status: 201 });
}
