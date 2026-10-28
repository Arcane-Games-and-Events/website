import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry, user as userTable } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { canEditEntries, canEditAllEntries } from '$lib/server/auth/roles.js';
import { createEntry } from '$lib/server/desk/entries.js';

/**
 * GET /api/desk/entries
 * List entries. Admin sees everything; writers see only entries they authored.
 * Optional `?status=draft|scheduled|published|archived` filter.
 */
export async function GET({ url, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user)) throw error(403, 'Not permitted');

	const status = url.searchParams.get('status');
	const filters = [];
	if (!canEditAllEntries(user)) filters.push(eq(deskEntry.authorId, user.id));
	if (status) filters.push(eq(deskEntry.status, status));
	const where = filters.length ? and(...filters) : undefined;

	const rows = await db
		.select({
			id: deskEntry.id,
			slug: deskEntry.slug,
			title: deskEntry.title,
			excerpt: deskEntry.excerpt,
			status: deskEntry.status,
			accessMode: deskEntry.accessMode,
			publishedAt: deskEntry.publishedAt,
			scheduledFor: deskEntry.scheduledFor,
			updatedAt: deskEntry.updatedAt,
			authorId: deskEntry.authorId,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName,
			source: deskEntry.source,
			draftUpdatedAt: deskEntry.draftUpdatedAt
		})
		.from(deskEntry)
		.leftJoin(userTable, eq(deskEntry.authorId, userTable.id))
		.where(where)
		.orderBy(desc(deskEntry.updatedAt));

	return json({ entries: rows });
}

/**
 * POST /api/desk/entries
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
