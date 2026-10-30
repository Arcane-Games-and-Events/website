/**
 * Desk entry server helpers — slug generation, save with revision snapshot,
 * read-time calculation, draft-buffer routing.
 *
 * Used by both the entry API endpoints and the Desk editor pages.
 *
 * Draft-buffer semantics:
 *   - Draft or archived entries: edits go straight to the live columns.
 *   - Published or scheduled entries: every edit waits for an editor or admin
 *     (`approveEntryDraft`), who may approve their own. Text waits in the
 *     `draft_*` columns; the web address, access, tag, cover, thumbnail and
 *     video wait in `draft_meta`. Author and status changes always go live.
 */
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskEntryTag, deskRevision } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { calculateReadTime, lexicalToText } from '$lib/desk/render/lexical-utils.js';
import { bump } from '$lib/server/cache/index.js';
import { titleToSlug, withSuffix } from '$lib/desk/slug.js';
import { setEntryTag } from '$lib/server/desk/tags.js';
import { assetUses, cancelMuxUpload, deleteAsset } from '$lib/server/video/mux.js';

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

/**
 * Whether an edit to this entry waits for approval: every change to a live
 * (published or scheduled) piece does, whoever makes it, so another editor
 * or admin can review it. Editors and admins can approve, their own
 * changes included. Drafts save straight through.
 * @param {any} existing
 * @param {any} [_actor] - kept for callers; the rule is the same for everyone
 */
export function holdsForApproval(existing, _actor) {
	return isPublic(existing.status);
}

/** Key-order-insensitive JSON, so two copies of the same document compare equal. */
function canonical(v) {
	if (Array.isArray(v)) return v.map(canonical);
	if (v && typeof v === 'object') {
		return Object.fromEntries(
			Object.keys(v)
				.sort()
				.map((k) => [k, canonical(v[k])])
		);
	}
	return v;
}
/** Whether two Lexical bodies are the same document. */
export function sameDoc(a, b) {
	return JSON.stringify(canonical(a ?? null)) === JSON.stringify(canonical(b ?? null));
}

/** The live fields a pending change can hold, besides the text. */
export const PENDING_KEYS = ['slug', 'accessMode', 'tagId', 'coverImageId', 'thumbnailImageId'];

/** The entry's video slot as one object (the shape draft_meta.video holds). */
export function videoSlotOf(row) {
	const slot = { provider: row.videoProvider ?? null };
	for (const f of VIDEO_FIELDS) if (f !== 'videoProvider') slot[f] = row[f] ?? null;
	return slot;
}

// Text fields that route into draft_* on a held edit.
const CONTENT_FIELDS = [
	{ patch: 'title', draft: 'draftTitle', live: 'title' },
	{ patch: 'excerpt', draft: 'draftExcerpt', live: 'excerpt' }
];

// Video-slot fields. On a held edit they're kept together in
// draft_meta.video; uploads to Mux go there too ($lib/server/video/mux.js).
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
 * Edits to a published or scheduled entry wait for an editor or admin (see
 * `holdsForApproval`): the text goes into `draft_*`, and the web address,
 * access, tag, cover, thumbnail and video into `draft_meta`. Status and
 * author always go live (gated up-stack).
 *
 * @param {string} id
 * @param {object} patch - any subset of editable fields
 * @param {{ id: string }} actor - user performing the edit (for revision attribution)
 */
export async function updateEntry(id, patch, actor) {
	const [existing] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
	if (!existing) throw new Error('Entry not found');

	const updates = { updatedAt: new Date() };
	const buffering = holdsForApproval(existing, actor);
	let touchedDraft = false;

	// Pending non-text changes (draft_meta). A value equal to the live one
	// isn't a change, and setting a field back to its live value withdraws
	// the pending change.
	const meta = { ...(existing.draftMeta || {}) };
	let metaChanged = false;
	const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
	function hold(key, value, liveValue) {
		if (same(value, liveValue)) {
			if (key in meta) {
				delete meta[key];
				metaChanged = true;
			}
		} else if (!(key in meta) || !same(meta[key], value)) {
			meta[key] = value;
			metaChanged = true;
		}
	}

	// Web address. A held change is cleaned now and made unique on approval.
	if (typeof patch.slug === 'string') {
		const clean = titleToSlug(patch.slug) || existing.slug;
		if (buffering) hold('slug', clean, existing.slug);
		else if (clean !== existing.slug) updates.slug = await findFreeSlug(clean, id);
	}

	// Title / excerpt — routed by buffering flag. A held value equal to the
	// live one isn't a change (autosave sends every field), and clears any
	// pending edit of that field.
	for (const { patch: p, draft, live } of CONTENT_FIELDS) {
		if (!(p in patch)) continue;
		const val = patch[p];
		if (!buffering) updates[live] = val;
		else if ((val ?? '') === (existing[live] ?? '')) {
			if (existing[draft] != null) updates[draft] = null;
		} else {
			updates[draft] = val;
			touchedDraft = true;
		}
	}

	// Cover, thumbnail, access — held like the text.
	for (const key of ['coverImageId', 'thumbnailImageId', 'accessMode']) {
		if (!(key in patch)) continue;
		if (buffering) hold(key, patch[key] ?? null, existing[key]);
		else updates[key] = patch[key];
	}
	// Tag (a join row) — held, or set straight away below.
	if ('tagId' in patch && buffering) {
		const [live] = await db
			.select({ tagId: deskEntryTag.tagId })
			.from(deskEntryTag)
			.where(eq(deskEntryTag.entryId, id))
			.limit(1);
		hold('tagId', patch.tagId || null, live?.tagId ?? null);
	}

	// Body + derived read time.
	if (patch.body !== undefined) {
		const rt = patch.body ? calculateReadTime(patch.body) : existing.readTime;
		if (buffering && sameDoc(patch.body, existing.body)) {
			if (existing.draftBody != null) {
				updates.draftBody = null;
				updates.draftReadTime = null;
			}
		} else if (buffering) {
			updates.draftBody = patch.body;
			updates.draftReadTime = rt;
			touchedDraft = true;
		} else {
			updates.body = patch.body;
			updates.readTime = rt;
		}
	}

	// Video slot (a YouTube link, or clearing it). Held as one whole slot.
	const videoKeys = VIDEO_FIELDS.filter((f) => f in patch);
	if (videoKeys.length) {
		if (buffering) {
			const live = videoSlotOf(existing);
			const slot = { ...(meta.video ?? live) };
			for (const f of videoKeys) {
				if (f === 'videoProvider') slot.provider = patch[f];
				else slot[f] = patch[f];
			}
			hold('video', slot, live);
		} else {
			for (const f of videoKeys) updates[f] = patch[f];
		}
	}

	// Author — editors and admins only (checked up-stack), never held.
	if ('authorId' in patch) updates.authorId = patch.authorId;

	if (metaChanged) {
		updates.draftMeta = Object.keys(meta).length ? meta : null;
		touchedDraft = true;
	}
	if (buffering) {
		const textPending = ['draftTitle', 'draftExcerpt', 'draftBody'].some(
			(k) => (k in updates ? updates[k] : existing[k]) != null
		);
		if (!textPending && Object.keys(meta).length === 0) {
			// Nothing left waiting: the piece is no longer pending.
			touchedDraft = false;
			updates.draftUpdatedAt = null;
			updates.draftUpdatedBy = null;
		}
	}

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

	// Tag set straight away (not held). The caller has checked it exists.
	const tagChanged =
		'tagId' in patch && !buffering ? await setEntryTag(id, patch.tagId || null) : false;

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
		draftMeta: null,
		draftUpdatedAt: null,
		draftUpdatedBy: null
	};

	// The pending non-text changes.
	const meta = existing.draftMeta || {};
	if ('slug' in meta && meta.slug && meta.slug !== existing.slug) {
		updates.slug = await findFreeSlug(meta.slug, id);
	}
	if ('accessMode' in meta) updates.accessMode = meta.accessMode;
	if ('coverImageId' in meta) updates.coverImageId = meta.coverImageId;
	if ('thumbnailImageId' in meta) updates.thumbnailImageId = meta.thumbnailImageId;
	let replacedAsset = null;
	if (meta.video) {
		const v = meta.video;
		updates.videoProvider = v.provider ?? null;
		for (const f of VIDEO_FIELDS) if (f !== 'videoProvider') updates[f] = v[f] ?? null;
		if (existing.muxAssetId && existing.muxAssetId !== updates.muxAssetId) {
			replacedAsset = existing.muxAssetId;
		}
	}

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
	if ('tagId' in meta) await setEntryTag(id, meta.tagId || null);
	// The live video the approved change replaced or removed leaves Mux.
	if (replacedAsset && (await assetUses(replacedAsset)) === 0) {
		await deleteAsset(replacedAsset).catch((err) =>
			console.warn('[entries] could not delete replaced video', replacedAsset, err?.message)
		);
	}

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
			draftMeta: null,
			draftUpdatedAt: null,
			draftUpdatedBy: null
		})
		.where(eq(deskEntry.id, id));

	// A pending uploaded video that never went live leaves Mux.
	const pendingVideo = existing.draftMeta?.video;
	if (pendingVideo?.muxUploadId && pendingVideo.videoStatus === 'waiting') {
		await cancelMuxUpload(pendingVideo.muxUploadId);
	}
	const asset = pendingVideo?.muxAssetId;
	if (asset && asset !== existing.muxAssetId && (await assetUses(asset)) === 0) {
		await deleteAsset(asset).catch((err) =>
			console.warn('[entries] could not delete discarded video', asset, err?.message)
		);
	}

	const [updated] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
	return updated;
}
