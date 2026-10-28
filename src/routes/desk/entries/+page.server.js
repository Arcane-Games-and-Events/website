import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskMedia, user as userTable } from '$lib/server/db/schema.js';
import { alias } from 'drizzle-orm/pg-core';
import { eq, desc, and, isNotNull, sql } from 'drizzle-orm';
import { canEditEntries, canEditAllEntries } from '$lib/server/auth/roles.js';

export async function load({ locals, url }) {
	if (!canEditEntries(locals.user)) throw redirect(302, '/desk');

	const status = url.searchParams.get('status') || null;

	const scope = [];
	// Writers see only their own entries; editors and admins see everything.
	if (!canEditAllEntries(locals.user)) scope.push(eq(deskEntry.authorId, locals.user.id));

	const filters = [...scope];
	// "pending" is synthetic: entries with a non-null draftUpdatedAt (edits
	// waiting for admin approval). Every other status filter passes through.
	if (status === 'pending') {
		filters.push(isNotNull(deskEntry.draftUpdatedAt));
	} else if (status) {
		filters.push(eq(deskEntry.status, status));
	}

	// Total pending count (regardless of active filter) so the chip can badge.
	const [{ count: pendingCount }] = await db
		.select({ count: sql`COUNT(*)::int` })
		.from(deskEntry)
		.where(
			scope.length
				? and(...scope, isNotNull(deskEntry.draftUpdatedAt))
				: isNotNull(deskEntry.draftUpdatedAt)
		);

	// Per-status counts for the filter tabs (same author scope, no filter).
	const statusRows = await db
		.select({ status: deskEntry.status, n: sql`COUNT(*)::int` })
		.from(deskEntry)
		.where(scope.length ? and(...scope) : undefined)
		.groupBy(deskEntry.status);
	const counts = Object.fromEntries(statusRows.map((r) => [r.status, r.n]));
	counts.all = statusRows.reduce((sum, r) => sum + r.n, 0);

	const thumb = alias(deskMedia, 'thumb');
	const cover = alias(deskMedia, 'cover');
	const entries = await db
		.select({
			id: deskEntry.id,
			slug: deskEntry.slug,
			title: deskEntry.title,
			status: deskEntry.status,
			accessMode: deskEntry.accessMode,
			updatedAt: deskEntry.updatedAt,
			publishedAt: deskEntry.publishedAt,
			scheduledFor: deskEntry.scheduledFor,
			source: deskEntry.source,
			draftUpdatedAt: deskEntry.draftUpdatedAt,
			videoProvider: deskEntry.videoProvider,
			readTime: deskEntry.readTime,
			thumbUrl: thumb.url,
			coverUrl: cover.url,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(deskEntry)
		.leftJoin(userTable, eq(deskEntry.authorId, userTable.id))
		.leftJoin(thumb, eq(deskEntry.thumbnailImageId, thumb.id))
		.leftJoin(cover, eq(deskEntry.coverImageId, cover.id))
		.where(filters.length ? and(...filters) : undefined)
		.orderBy(desc(deskEntry.updatedAt));

	return { entries, statusFilter: status, pendingCount: pendingCount || 0, counts };
}
