/**
 * CMS entry server helpers — slug generation, save with revision snapshot,
 * read-time calculation, draft-buffer routing.
 *
 * Used by both the entry API endpoints and the CMS editor pages.
 *
 * Draft-buffer semantics:
 *   - Draft or archived entries: edits go straight to the live columns.
 *   - Published or scheduled entries: content edits (title, excerpt, body,
 *     cover, thumbnail, video slot) are staged in `draft_*` columns and only
 *     become public when an admin calls `approveEntryDraft`. Slug, access
 *     mode, author, and status transitions always go live.
 */
import { db } from '$lib/server/db/index.js';
import { cmsEntry, cmsRevision } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { calculateReadTime, lexicalToText } from '$lib/cms/render/lexical-utils.js';
import { deleteMediaWithGuard } from '$lib/server/cms/media.js';

// --- slug helpers -----------------------------------------------------------

export function titleToSlug(title) {
	return String(title || '')
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export async function findFreeSlug(desired, excludeId = null) {
	let base = desired || 'untitled';
	let candidate = base;
	let n = 2;
	while (await isSlugTaken(candidate, excludeId)) {
		candidate = `${base}-${n}`;
		n++;
	}
	return candidate;
}

async function isSlugTaken(slug, excludeId) {
	const rows = await db
		.select({ id: cmsEntry.id })
		.from(cmsEntry)
		.where(
			excludeId
				? sql`${cmsEntry.slug} = ${slug} AND ${cmsEntry.id} != ${excludeId}`
				: eq(cmsEntry.slug, slug)
		)
		.limit(1);
	return rows.length > 0;
}

export function deriveExcerpt(body, maxWords = 30) {
	const text = lexicalToText(body);
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length <= maxWords) return text.trim();
	return words.slice(0, maxWords).join(' ').trim() + '…';
}

// --- create -----------------------------------------------------------------

/**
 * Create a new entry and seed an initial revision (only when body is non-null).
 *
 * @param {object} input - { title, slug?, body?, excerpt?, accessMode?, coverImageId?, thumbnailImageId?, authorId, status? }
 * @returns the created row
 */
export async function createEntry(input) {
	const slug = await findFreeSlug(input.slug || titleToSlug(input.title) || 'untitled');
	const body = input.body || null;
	const readTime = body ? calculateReadTime(body) : null;

	const [row] = await db
		.insert(cmsEntry)
		.values({
			slug,
			title: input.title || 'Untitled',
			excerpt: input.excerpt || (body ? deriveExcerpt(body) : null),
			coverImageId: input.coverImageId || null,
			thumbnailImageId: input.thumbnailImageId || null,
			body,
			readTime,
			accessMode: input.accessMode || 'free',
			status: input.status || 'draft',
			authorId: input.authorId,
			source: 'custom',
			updatedAt: new Date()
		})
		.returning();

	if (body) {
		await db.insert(cmsRevision).values({
			entityType: 'entry',
			entityId: row.id,
			body,
			savedBy: input.authorId
		});
	}
	return row;
}

// --- update -----------------------------------------------------------------

function shouldBufferEdits(existing) {
	return existing.status === 'published' || existing.status === 'scheduled';
}

// Text fields that route into draft_* on live entries — buffering these
// is where admin sign-off actually matters (a wrong title / excerpt / body
// misleads readers). Image changes are handled separately below: they
// always go live, so the writer's chosen artwork is what visitors see and
// the client-side deleteMedia call cleans up the replaced file immediately.
const CONTENT_FIELDS = [
	{ patch: 'title', draft: 'draftTitle', live: 'title' },
	{ patch: 'excerpt', draft: 'draftExcerpt', live: 'excerpt' }
];

// Video-slot fields — always go live for now. If a writer swaps the video on
// a published entry, the swap is immediate (public players will pick it up on
// next request). Buffering video swaps behind draft approval adds complexity
// (two full Mux+YouTube column sets on the draft side) that isn't worth it
// until we have a real problem it solves.
const VIDEO_FIELDS = [
	'videoProvider',
	'muxUploadId',
	'muxAssetId',
	'muxPlaybackId',
	'videoStatus',
	'videoDuration',
	'videoAspectRatio',
	'youtubeUrl',
	'youtubeVideoId',
	'youtubeTitle',
	'youtubeThumbnailUrl',
	'youtubeDuration'
];

/**
 * Update an entry. Every non-null-body patch also writes a `cms_revision`
 * snapshot so history is faithful even when edits are buffered.
 *
 * For published or scheduled entries, content edits (title, excerpt, body,
 * cover, thumbnail) route into `draft_*`. Status changes, slug edits, author
 * reassign, access mode, and video-slot changes always go live.
 *
 * @param {string} id
 * @param {object} patch - any subset of editable fields
 * @param {{ id: string }} actor - user performing the edit (for revision attribution)
 */
export async function updateEntry(id, patch, actor) {
	const [existing] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, id)).limit(1);
	if (!existing) throw new Error('Entry not found');

	const updates = { updatedAt: new Date() };
	const buffering = shouldBufferEdits(existing);
	let touchedDraft = false;

	// Slug always goes live: buffering it would let two versions of the same
	// entry claim the same URL, and admins are the only ones with permission
	// to change it anyway (enforced up-stack).
	if (typeof patch.slug === 'string' && patch.slug !== existing.slug) {
		updates.slug = await findFreeSlug(titleToSlug(patch.slug) || existing.slug, id);
	}

	// Title / excerpt — routed by buffering flag.
	for (const { patch: p, draft, live } of CONTENT_FIELDS) {
		if (!(p in patch)) continue;
		const val = patch[p];
		if (buffering) {
			updates[draft] = val;
			touchedDraft = true;
		} else {
			updates[live] = val;
		}
	}

	// Cover + thumbnail — always live, never buffered. Image swaps take
	// effect immediately so the client-side deleteMedia call can clean up
	// the replaced file right after this update completes.
	if ('coverImageId' in patch) updates.coverImageId = patch.coverImageId;
	if ('thumbnailImageId' in patch) updates.thumbnailImageId = patch.thumbnailImageId;

	// Body + derived read time.
	if (patch.body !== undefined) {
		const rt = patch.body ? calculateReadTime(patch.body) : existing.readTime;
		if (buffering) {
			updates.draftBody = patch.body;
			updates.draftReadTime = rt;
			touchedDraft = true;
		} else {
			updates.body = patch.body;
			updates.readTime = rt;
		}
	}

	// Video slot — always live.
	for (const f of VIDEO_FIELDS) {
		if (f in patch) updates[f] = patch[f];
	}

	// Access mode + author — always live (admin gating handled up-stack).
	if ('accessMode' in patch) updates.accessMode = patch.accessMode;
	if ('authorId' in patch) updates.authorId = patch.authorId;

	// Status transitions.
	if ('status' in patch) {
		updates.status = patch.status;
		if (patch.status === 'published' && !existing.publishedAt) {
			updates.publishedAt = new Date();
		}
		if (patch.status !== 'scheduled') {
			updates.scheduledFor = null;
		}
	}
	if ('scheduledFor' in patch) updates.scheduledFor = patch.scheduledFor;

	if (touchedDraft) {
		updates.draftUpdatedAt = new Date();
		updates.draftUpdatedBy = actor?.id || null;
	}

	await db.update(cmsEntry).set(updates).where(eq(cmsEntry.id, id));

	// Revision snapshot — only when body actually changed AND is non-null
	// (the schema requires cmsRevision.body NOT NULL).
	if (patch.body !== undefined && patch.body !== null) {
		await db.insert(cmsRevision).values({
			entityType: 'entry',
			entityId: id,
			body: patch.body,
			savedBy: actor?.id || null
		});
	}

	const [updated] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, id)).limit(1);
	return updated;
}

// --- draft approval + discard -----------------------------------------------

/**
 * Push buffered draft_* fields onto the live columns. No-op if the draft
 * buffer is empty. Clears the buffer once copied.
 */
export async function approveEntryDraft(id, actor) {
	const [existing] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, id)).limit(1);
	if (!existing) throw new Error('Entry not found');
	if (!existing.draftUpdatedAt) return existing; // nothing to approve

	const updates = {
		updatedAt: new Date(),
		draftTitle: null,
		draftExcerpt: null,
		draftBody: null,
		draftCoverImageId: null,
		draftThumbnailImageId: null,
		draftReadTime: null,
		draftUpdatedAt: null,
		draftUpdatedBy: null
	};

	if (existing.draftTitle != null) updates.title = existing.draftTitle;
	// draftExcerpt of null (intentional clear) shouldn't propagate; we treat
	// only non-null draftExcerpts as "the writer set an explicit new value."
	if (existing.draftExcerpt !== null && existing.draftExcerpt !== undefined) {
		updates.excerpt = existing.draftExcerpt;
	}
	if (existing.draftBody != null) {
		updates.body = existing.draftBody;
		updates.readTime = existing.draftReadTime ?? calculateReadTime(existing.draftBody);
	}

	// Legacy: any entry that was already buffered before we stopped
	// buffering image changes will still have draftCoverImageId /
	// draftThumbnailImageId set. Approve should still swap those onto live
	// and clean up the replaced files so old drafts don't get stuck.
	if (existing.draftCoverImageId != null) updates.coverImageId = existing.draftCoverImageId;
	if (existing.draftThumbnailImageId != null) {
		updates.thumbnailImageId = existing.draftThumbnailImageId;
	}
	const orphanedIds = [];
	if (
		existing.draftCoverImageId != null &&
		existing.coverImageId &&
		existing.coverImageId !== existing.draftCoverImageId
	) {
		orphanedIds.push(existing.coverImageId);
	}
	if (
		existing.draftThumbnailImageId != null &&
		existing.thumbnailImageId &&
		existing.thumbnailImageId !== existing.draftThumbnailImageId
	) {
		orphanedIds.push(existing.thumbnailImageId);
	}

	await db.update(cmsEntry).set(updates).where(eq(cmsEntry.id, id));

	// Snapshot the just-approved body so revision history is faithful.
	if (existing.draftBody != null) {
		await db.insert(cmsRevision).values({
			entityType: 'entry',
			entityId: id,
			body: existing.draftBody,
			savedBy: actor?.id || null
		});
	}

	// Clean up the images the draft just replaced — Storage + DB row.
	// The reference guard inside deleteMediaWithGuard is authoritative:
	// if another entry / course still uses the same image, nothing changes.
	for (const orphanedId of orphanedIds) {
		try {
			await deleteMediaWithGuard(orphanedId);
		} catch (err) {
			console.warn(`[approveEntryDraft] media cleanup failed for ${orphanedId}:`, err?.message);
		}
	}

	const [updated] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, id)).limit(1);
	return updated;
}

/**
 * Discard buffered draft_* fields without applying them. Live columns unchanged.
 * Draft-side images (that never made it live) get cleaned up here.
 */
export async function discardEntryDraft(id) {
	const [existing] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, id)).limit(1);
	if (!existing) return null;

	// Draft images the writer uploaded that never made it to the live entry.
	// Captured before we null out the draft columns; deleted after.
	const orphanedIds = [];
	if (
		existing.draftCoverImageId != null &&
		existing.draftCoverImageId !== existing.coverImageId
	) {
		orphanedIds.push(existing.draftCoverImageId);
	}
	if (
		existing.draftThumbnailImageId != null &&
		existing.draftThumbnailImageId !== existing.thumbnailImageId
	) {
		orphanedIds.push(existing.draftThumbnailImageId);
	}

	await db
		.update(cmsEntry)
		.set({
			updatedAt: new Date(),
			draftTitle: null,
			draftExcerpt: null,
			draftBody: null,
			draftCoverImageId: null,
			draftThumbnailImageId: null,
			draftReadTime: null,
			draftUpdatedAt: null,
			draftUpdatedBy: null
		})
		.where(eq(cmsEntry.id, id));

	for (const orphanedId of orphanedIds) {
		try {
			await deleteMediaWithGuard(orphanedId);
		} catch (err) {
			console.warn(
				`[discardEntryDraft] media cleanup failed for ${orphanedId}:`,
				err?.message
			);
		}
	}

	const [updated] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, id)).limit(1);
	return updated;
}
