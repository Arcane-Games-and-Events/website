import { json, error } from '@sveltejs/kit';
import { canEditEntries, canEditCourses } from '$lib/server/auth/roles.js';
import { resolveCardImage } from '$lib/server/cards/index.js';

/**
 * GET /api/desk/cards/image?name=Snatch&pitch=r
 *
 * The image a card link shows readers, resolved the same way the article
 * page does (fab_card_lookup, Redis-cached). Used by the editor's card-link
 * preview. Read-only.
 */
export async function GET({ url, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!canEditEntries(locals.user) && !canEditCourses(locals.user)) {
		throw error(403, 'Not permitted');
	}
	const name = (url.searchParams.get('name') || '').trim().slice(0, 120);
	if (!name) throw error(400, 'Missing card name');

	const card = await resolveCardImage({ name, pitch: url.searchParams.get('pitch') || null });
	return json({
		found: card.found,
		name: card.name,
		imageUrl: card.imageUrl,
		fallbackUrl: card.fallbackUrl
	});
}
