import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canApproveEdits, canEditEntries, isAdmin, canEditEntry } from '$lib/server/auth/roles.js';
import { updateEntry } from '$lib/server/desk/entries.js';
import { bump } from '$lib/server/cache/index.js';
import { canManage, getMediaRow } from '$lib/server/media/library.js';
import { getTag } from '$lib/server/desk/tags.js';

async function loadEntry(id) {
	const [row] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
	return row || null;
}

/**
 * GET /api/desk/entries/[id]
 * Return the full entry (with body) if the caller can edit it.
 */
export async function GET({ params, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user)) throw error(403, 'Not permitted');

	const entry = await loadEntry(params.id);
	if (!entry) throw error(404, 'Entry not found');
	if (!canEditEntry(user, entry.authorId)) throw error(403, 'Forbidden');
	return json({ entry });
}

/**
 * PATCH /api/desk/entries/[id]
 * Apply a partial update. Used by both autosave (body only) and explicit form
 * saves (metadata, status transitions, video slot).
 */
export async function PATCH({ params, request, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user)) throw error(403, 'Not permitted');

	const entry = await loadEntry(params.id);
	if (!entry) throw error(404, 'Entry not found');
	if (!canEditEntry(user, entry.authorId)) throw error(403, 'Forbidden');

	const patch = await request.json().catch(() => ({}));
	const admin = isAdmin(user);

	if (patch.status === 'published' && !admin) {
		throw error(403, 'Only an admin can publish');
	}
	if (patch.status === 'scheduled' && !admin) {
		throw error(403, 'Only an admin can schedule entries');
	}
	if ('authorId' in patch && patch.authorId !== entry.authorId && !canApproveEdits(user)) {
		throw error(403, 'Only an editor or admin can change the author');
	}
	if ('publishedAt' in patch && !admin) {
		throw error(403, 'Only an admin can change the publish date');
	}

	// Covers and thumbnails come from the image library: a writer can only
	// use their own uploads (editors and admins can use anyone's). Keeping
	// the image already on the entry is always allowed.
	for (const key of ['coverImageId', 'thumbnailImageId']) {
		const id = patch[key];
		if (!id || id === entry[key]) continue;
		const media = await getMediaRow(id);
		if (!media) throw error(400, 'That image no longer exists');
		if (!canManage(user, media)) throw error(403, 'That image belongs to someone else');
	}

	// One tag per entry, chosen from the shared list (POST /api/desk/tags
	// makes a new one first). null takes the tag off.
	if ('tagId' in patch) {
		if (patch.tagId !== null && typeof patch.tagId !== 'string') throw error(400, 'Invalid tag');
		if (patch.tagId && !(await getTag(patch.tagId).catch(() => null))) {
			throw error(400, 'That tag no longer exists');
		}
	}

	if (patch.status === 'scheduled') {
		const when = patch.scheduledFor ? new Date(patch.scheduledFor) : null;
		if (!when || isNaN(when.getTime())) {
			throw error(400, 'scheduledFor is required when scheduling');
		}
		if (when.getTime() <= Date.now()) {
			throw error(400, 'scheduledFor must be in the future');
		}
		patch.scheduledFor = when;
	}

	const updated = await updateEntry(params.id, patch, user);
	return json({ entry: updated });
}

/**
 * DELETE /api/desk/entries/[id]
 * Hard delete — only allowed while status is 'draft', unless admin.
 */
export async function DELETE({ params, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user)) throw error(403, 'Not permitted');

	const entry = await loadEntry(params.id);
	if (!entry) throw error(404, 'Entry not found');
	if (!canEditEntry(user, entry.authorId)) throw error(403, 'Forbidden');
	if (entry.status !== 'draft' && !isAdmin(user)) {
		throw error(400, 'Only draft entries can be deleted. Archive instead.');
	}

	await db.delete(deskEntry).where(eq(deskEntry.id, params.id));
	if (entry.status !== 'draft') await bump('entries');
	return json({ ok: true });
}
