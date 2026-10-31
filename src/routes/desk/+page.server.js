import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskMedia, user as userTable } from '$lib/server/db/schema.js';
import { alias } from 'drizzle-orm/pg-core';
import { desc, eq, sql } from 'drizzle-orm';
import { canEditEntries, canEditAllEntries, canPublish } from '$lib/server/auth/roles.js';
import { deskReads } from '$lib/server/contentAnalytics/query.js';

/**
 * /desk — the writers' and editors' desk.
 *
 * (Teachers' courses are in the Classroom; the layout sends them there.)
 * Everyone here gets a dashboard of their own
 * work (editors and admins see the whole desk): drafts to continue, scheduled pieces,
 * edits awaiting review, recent publishes and reader numbers.
 *
 * Deliberately light on the database: ONE query for the entries (every
 * panel is derived from it in JS); reader numbers come from the content
 * analytics module (sequential queries, cached). No parallel bursts — the
 * dev pool is small and Supabase's pooler stalls when several fresh
 * connections are opened at once.
 */
export const load = async ({ locals }) => {
	if (!canEditEntries(locals.user)) throw redirect(302, '/');

	// Editors and admins see every writer's work; only admins approve edits.
	const seeAll = canEditAllEntries(locals.user);
	const admin = canPublish(locals.user);
	const thumb = alias(deskMedia, 'thumb');
	const cover = alias(deskMedia, 'cover');

	const rows = await db
		.select({
			id: deskEntry.id,
			slug: deskEntry.slug,
			title: deskEntry.title,
			status: deskEntry.status,
			accessMode: deskEntry.accessMode,
			updatedAt: deskEntry.updatedAt,
			publishedAt: deskEntry.publishedAt,
			scheduledFor: deskEntry.scheduledFor,
			draftUpdatedAt: deskEntry.draftUpdatedAt,
			readTime: deskEntry.readTime,
			videoProvider: deskEntry.videoProvider,
			excerpt: deskEntry.excerpt,
			thumbUrl: thumb.url,
			// the smallest resized copy when there is one; these are thumbnails
			coverUrl: sql`case when ${cover.variantPrefix} is not null
				then replace(${cover.url}, ${cover.storagePath}, ${cover.variantPrefix} || ${cover.variantWidths}[1] || '.webp')
				else ${cover.url} end`,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(deskEntry)
		.leftJoin(userTable, eq(deskEntry.authorId, userTable.id))
		.leftJoin(thumb, eq(deskEntry.thumbnailImageId, thumb.id))
		.leftJoin(cover, eq(deskEntry.coverImageId, cover.id))
		.where(seeAll ? undefined : eq(deskEntry.authorId, locals.user.id))
		.orderBy(desc(deskEntry.updatedAt))
		.limit(500);

	const now = Date.now();
	const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
	const t = (d) => (d ? new Date(d).getTime() : 0);
	// A scheduled entry whose time has passed is live, so count it as published.
	const isLive = (r) =>
		r.status === 'published' || (r.status === 'scheduled' && t(r.scheduledFor) <= now);

	const drafts = rows.filter((r) => r.status === 'draft').slice(0, 6);
	const scheduled = rows
		.filter((r) => r.status === 'scheduled' && t(r.scheduledFor) > now)
		.sort((a, b) => t(a.scheduledFor) - t(b.scheduledFor))
		.slice(0, 5);
	const pending = rows
		.filter((r) => r.draftUpdatedAt)
		.sort((a, b) => t(b.draftUpdatedAt) - t(a.draftUpdatedAt))
		.slice(0, 6);
	const liveRows = rows.filter(isLive);
	const published = liveRows
		.slice()
		.sort((a, b) => t(b.publishedAt || b.scheduledFor) - t(a.publishedAt || a.scheduledFor))
		.slice(0, 5);
	const counts = {
		draft: rows.filter((r) => r.status === 'draft').length,
		scheduled: rows.filter((r) => r.status === 'scheduled' && t(r.scheduledFor) > now).length,
		published: liveRows.length,
		pending: rows.filter((r) => r.draftUpdatedAt).length
	};
	const publishedThisMonth = liveRows.filter(
		(r) => t(r.publishedAt || r.scheduledFor) >= monthStart
	).length;

	// ---- reader numbers (last 30 days) from content analytics ----
	let reads = { total: 0, daily: [], top: [] };
	try {
		const res = await deskReads(
			seeAll ? null : liveRows.map((r) => r.id),
			seeAll ? 'all' : locals.user.id
		);
		if (res.available) reads = { total: res.total, daily: res.daily, top: res.top };
	} catch (err) {
		console.error('desk reader stats failed:', err);
	}

	return {
		firstName: locals.user.firstName || '',
		admin,
		seeAll,
		drafts,
		scheduled,
		pending,
		published,
		counts,
		publishedThisMonth,
		reads
	};
};
