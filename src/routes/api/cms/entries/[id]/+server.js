import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditEntries, isAdmin, ownsOrAdmin } from '$lib/server/auth/roles.js';
import { updateEntry } from '$lib/server/cms/entries.js';

async function loadEntry(id) {
	const [row] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, id)).limit(1);
	return row || null;
}

/**
 * GET /api/cms/entries/[id]
 * Return the full entry (with body) if the caller can edit it.
 */
export async function GET({ params, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user)) throw error(403, 'Not permitted');

	const entry = await loadEntry(params.id);
	if (!entry) throw error(404, 'Entry not found');
	if (!ownsOrAdmin(user, entry.authorId)) throw error(403, 'Forbidden');
	return json({ entry });
}

/**
 * PATCH /api/cms/entries/[id]
 * Apply a partial update. Used by both autosave (body only) and explicit form
 * saves (metadata, status transitions, video slot).
 */
export async function PATCH({ params, request, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user)) throw error(403, 'Not permitted');

	const entry = await loadEntry(params.id);
	if (!entry) throw error(404, 'Entry not found');
	if (!ownsOrAdmin(user, entry.authorId)) throw error(403, 'Forbidden');

	const patch = await request.json().catch(() => ({}));
	const admin = isAdmin(user);

	if (patch.status === 'published' && !admin) {
		throw error(403, 'Only an admin can publish');
	}
	if (patch.status === 'scheduled' && !admin) {
		throw error(403, 'Only an admin can schedule entries');
	}
	if ('authorId' in patch && patch.authorId !== entry.authorId && !admin) {
		throw error(403, 'Only an admin can change the author');
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
 * DELETE /api/cms/entries/[id]
 * Hard delete — only allowed while status is 'draft', unless admin.
 */
export async function DELETE({ params, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user)) throw error(403, 'Not permitted');

	const entry = await loadEntry(params.id);
	if (!entry) throw error(404, 'Entry not found');
	if (!ownsOrAdmin(user, entry.authorId)) throw error(403, 'Forbidden');
	if (entry.status !== 'draft' && !isAdmin(user)) {
		throw error(400, 'Only draft entries can be deleted. Archive instead.');
	}

	await db.delete(cmsEntry).where(eq(cmsEntry.id, params.id));
	return json({ ok: true });
}
