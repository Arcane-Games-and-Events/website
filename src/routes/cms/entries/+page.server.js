import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry, user as userTable } from '$lib/server/db/schema.js';
import { eq, desc, and, isNotNull, sql } from 'drizzle-orm';
import { canEditEntries, isAdmin } from '$lib/server/auth/roles.js';

export async function load({ locals, url }) {
	if (!canEditEntries(locals.user)) throw redirect(302, '/cms');

	const status = url.searchParams.get('status') || null;

	const scope = [];
	if (!isAdmin(locals.user)) scope.push(eq(cmsEntry.authorId, locals.user.id));

	const filters = [...scope];
	// "pending" is synthetic: entries with a non-null draftUpdatedAt (edits
	// waiting for admin approval). Every other status filter passes through.
	if (status === 'pending') {
		filters.push(isNotNull(cmsEntry.draftUpdatedAt));
	} else if (status) {
		filters.push(eq(cmsEntry.status, status));
	}

	// Total pending count (regardless of active filter) so the chip can badge.
	const [{ count: pendingCount }] = await db
		.select({ count: sql`COUNT(*)::int` })
		.from(cmsEntry)
		.where(
			scope.length
				? and(...scope, isNotNull(cmsEntry.draftUpdatedAt))
				: isNotNull(cmsEntry.draftUpdatedAt)
		);

	const entries = await db
		.select({
			id: cmsEntry.id,
			slug: cmsEntry.slug,
			title: cmsEntry.title,
			status: cmsEntry.status,
			accessMode: cmsEntry.accessMode,
			updatedAt: cmsEntry.updatedAt,
			publishedAt: cmsEntry.publishedAt,
			scheduledFor: cmsEntry.scheduledFor,
			source: cmsEntry.source,
			draftUpdatedAt: cmsEntry.draftUpdatedAt,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(cmsEntry)
		.leftJoin(userTable, eq(cmsEntry.authorId, userTable.id))
		.where(filters.length ? and(...filters) : undefined)
		.orderBy(desc(cmsEntry.updatedAt));

	return { entries, statusFilter: status, pendingCount: pendingCount || 0 };
}
