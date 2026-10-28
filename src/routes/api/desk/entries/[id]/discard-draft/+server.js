import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canPublish } from '$lib/server/auth/roles.js';
import { discardEntryDraft } from '$lib/server/desk/entries.js';

/**
 * POST /api/desk/entries/[id]/discard-draft
 * Wipe the staged draft_* fields without applying them. Admin only.
 */
export async function POST({ params, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canPublish(user)) throw error(403, 'Only an admin can discard changes');

	const [row] = await db.select().from(deskEntry).where(eq(deskEntry.id, params.id)).limit(1);
	if (!row) throw error(404, 'Entry not found');

	const updated = await discardEntryDraft(params.id);
	return json({ entry: updated });
}
