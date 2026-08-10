import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canPublish } from '$lib/server/auth/roles.js';
import { approveEntryDraft } from '$lib/server/cms/entries.js';

/**
 * POST /api/cms/entries/[id]/approve-draft
 * Copy the staged draft_* fields onto the live columns. Admin only.
 */
export async function POST({ params, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canPublish(user)) throw error(403, 'Only an admin can approve changes');

	const [row] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, params.id)).limit(1);
	if (!row) throw error(404, 'Entry not found');

	const updated = await approveEntryDraft(params.id, user);
	return json({ entry: updated });
}
