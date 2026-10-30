/**
 * Desk entry server helpers — slug generation, save with revision snapshot,
 * read-time calculation, draft-buffer routing.
 *
 * Used by both the entry API endpoints and the Desk editor pages.
 *
 * Draft-buffer semantics:
 *   - Draft or archived entries: edits go straight to the live columns.
 *   - Published or scheduled entries: content edits (title, excerpt, body,
 *     cover, thumbnail, video slot) are staged in `draft_*` columns and only
 *     become public when an admin calls `approveEntryDraft`. Slug, tag,
 *     access mode, author, and status transitions always go live.
 */
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskRevision } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { calculateReadTime, lexicalToText } from '$lib/desk/render/lexical-utils.js';
import { bump } from '$lib/server/cache/index.js';
import { titleToSlug, withSuffix } from '$lib/desk/slug.js';
import { setEntryTag } from '$lib/server/desk/tags.js';

const isPublic = (status) => status === 'published' || status === 'scheduled';

// --- slug helpers -----------------------------------------------------------

export { titleToSlug };

/**
 * `desired`, or `desired-2`, `-3`… if another entry already has it. Always
 * within SLUG_MAX characters.
 */
export async function findFreeSlug(desired, excludeId = null) {
	const base = titleToSlug(desired) || 'untitled';
	let candidate = base;
	let n = 2;
	while (await isSlugTaken(candidate, excludeId)) {
		candidate = withSuffix(base, n);
		n++;
	}
	return candidate;
}

async function isSlugTaken(slug, excludeId) {
	const rows = await db
		.select({ id: deskEntry.id })
		.from(deskEntry)
		.where(
			excludeId
				? sql`${deskEntry.slug} = ${slug} AND ${deskEntry.id} != ${excludeId}`
				: eq(deskEntry.slug, slug)
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
		.insert(deskEntry)
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
		await db.insert(deskRevision).values({
			entityType: 'entry',
			entityId: row.id,
			body,
			savedBy: input.authorId
		});
	}
	if (isPublic(row.status)) await bump('entries');
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
// the replaced image stays in the writer's image library.
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
 * reassign, tag, access mode, and video-slot changes always go live.
 *
 * @param {string} id
 * @param {object} patch - any subset of editable fields
 * @param {{ id: string }} actor - user performing the edit (for revision attribution)
 */
export async function updateEntry(id, patch, actor) {
	const [existing] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
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
	// effect immediately; the replaced image stays in the image library.
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

	// Explicit publishedAt override (admin-gated up-stack). Lets an admin
	// backdate an entry to sit in the library at a specific chronological
	// slot, or bump a future date to preview ordering. `null` clears it.
	if ('publishedAt' in patch) {
		updates.publishedAt = patch.publishedAt ? new Date(patch.publishedAt) : null;
	}

	if (touchedDraft) {
		updates.draftUpdatedAt = new Date();
		updates.draftUpdatedBy = actor?.id || null;
	}

	await db.update(deskEntry).set(updates).where(eq(deskEntry.id, id));

	// Tag — always live, like access mode. The caller has checked it exists.
	const tagChanged = 'tagId' in patch ? await setEntryTag(id, patch.tagId || null) : false;

	// Revision snapshot — only when body actually changed AND is non-null
	// (the schema requires deskRevision.body NOT NULL).
	if (patch.body !== undefined && patch.body !== null) {
		await db.insert(deskRevision).values({
			entityType: 'entry',
			entityId: id,
			body: patch.body,
			savedBy: actor?.id || null
		});
	}

	// Visitors only see public entries, and text edits on those go into the
	// draft buffer. So the cached lists change only when a live column
	// (status, slug, cover, video, access, author, dates) changes on an entry
	// that is public before or after the edit. Draft autosaves don't bump.
	const liveChange =
		tagChanged ||
		Object.keys(updates).some((key) => key !== 'updatedAt' && !key.startsWith('draft'));
	if (liveChange && (isPublic(existing.status) || isPublic(updates.status))) {
		await bump('entries');
	}

	const [updated] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
	return updated;
}

// --- draft approval + discard -----------------------------------------------

/**
 * Push buffered draft_* fields onto the live columns. No-op if the draft
 * buffer is empty. Clears the buffer once copied.
 */
/**
 * Approve the draft buffer.
 *
 * @param {string} id - entry id
 * @param {any}    actor - user performing the action (revision attribution)
 * @param {object} [opts]
 * @param {'draft' | null} [opts.asStatus] - optional status override.
 *   When set to 'draft', the entry is unpublished as part of the approve
 *   (accept the edits into the canonical content but hide from readers).
 *   When null / undefined, the status stays whatever it was.
 */
export async function approveEntryDraft(id, actor, opts = {}) {
	const [existing] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
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
	// so old drafts don't get stuck.
	if (existing.draftCoverImageId != null) updates.coverImageId = existing.draftCoverImageId;
	if (existing.draftThumbnailImageId != null) {
		updates.thumbnailImageId = existing.draftThumbnailImageId;
	}

	// Optional status override — "Approve as draft" applies the buffered
	// content AND sets status='draft', so an admin can accept a writer's
	// edits without making the entry (still) public. Clearing scheduledFor
	// too so an entry doesn't sit half-scheduled after going back to draft.
	if (opts.asStatus === 'draft' && existing.status !== 'draft') {
		updates.status = 'draft';
		updates.scheduledFor = null;
	}

	await db.update(deskEntry).set(updates).where(eq(deskEntry.id, id));

	// Snapshot the just-approved body so revision history is faithful.
	if (existing.draftBody != null) {
		await db.insert(deskRevision).values({
			entityType: 'entry',
			entityId: id,
			body: existing.draftBody,
			savedBy: actor?.id || null
		});
	}

	// Images the draft replaced stay in the image library.

	// Approving a draft flips what visitors see — buffered text became live.
	await bump('entries');

	const [updated] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
	return updated;
}

/**
 * Discard buffered draft_* fields without applying them. Live columns unchanged.
 * Draft-side images stay in the image library.
 */
export async function discardEntryDraft(id) {
	const [existing] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
	if (!existing) return null;

	// Draft images that never went live stay in the image library.

	await db
		.update(deskEntry)
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
		.where(eq(deskEntry.id, id));

	const [updated] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
	return updated;
}
