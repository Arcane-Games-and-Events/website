import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canApproveEdits, canPublish } from '$lib/server/auth/roles.js';
import { approveEntryDraft } from '$lib/server/desk/entries.js';

/**
 * POST /api/desk/entries/[id]/approve-draft
 * Put a writer's pending changes live. Editors and admins; approving as a
 * draft (which also unpublishes the piece) is admin-only, like publishing.
 */
export async function POST({ params, request, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canApproveEdits(user)) throw error(403, 'Only an editor or admin can approve changes');

	const [row] = await db.select().from(deskEntry).where(eq(deskEntry.id, params.id)).limit(1);
	if (!row) throw error(404, 'Entry not found');

	// Optional body: { asStatus: 'draft' } accepts the edits AND unpublishes
	// the entry in one action. Anything else keeps the current status.
	const body = await request.json().catch(() => ({}));
	const opts = body?.asStatus === 'draft' ? { asStatus: 'draft' } : {};
	if (opts.asStatus && !canPublish(user)) throw error(403, 'Only an admin can unpublish');

	const updated = await approveEntryDraft(params.id, user, opts);
	return json({ entry: updated });
}
