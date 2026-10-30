import { json, error } from '@sveltejs/kit';
import { canEditEntries } from '$lib/server/auth/roles.js';
import { findOrCreateTag, listTags, TagError } from '$lib/server/desk/tags.js';

/**
 * GET /api/desk/tags
 *   Every tag, A to Z, with how many entries use it.
 *
 * POST /api/desk/tags  { name }
 *   The tag with that name, made first if it doesn't exist. 201 when new.
 *   Then PATCH the entry with { tagId } to file it there.
 */
export async function GET({ locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!canEditEntries(locals.user)) throw error(403, 'Not permitted');
	return json({ tags: await listTags() });
}

export async function POST({ request, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!canEditEntries(locals.user)) throw error(403, 'Not permitted');
	const body = await request.json().catch(() => ({}));
	try {
		const { tag, created } = await findOrCreateTag(body.name);
		return json({ tag }, { status: created ? 201 : 200 });
	} catch (err) {
		if (err instanceof TagError) throw error(err.status, err.message);
		throw err;
	}
}
