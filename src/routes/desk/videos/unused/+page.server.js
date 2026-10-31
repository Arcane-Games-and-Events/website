import { redirect } from '@sveltejs/kit';
import { canDeleteUnused, canSeeUnused, listUnusedAssets } from '$lib/server/video/mux.js';
import { getMuxThumbnailToken } from '$lib/server/mux.js';

/**
 * /desk/videos/unused — Mux assets no gameplay, article, lesson or trailer
 * uses (old re-uploads, abandoned uploads). Admins only. Deleting is only
 * offered on the live site: dev shares the Mux account, so every live video
 * would look unused from here.
 */
export async function load({ locals }) {
	if (!canSeeUnused(locals.user)) throw redirect(302, '/desk');
	const assets = await listUnusedAssets();
	for (const a of assets) {
		a.thumbToken = a.playbackId ? await getMuxThumbnailToken(a.playbackId).catch(() => null) : null;
	}
	return { assets, canDelete: canDeleteUnused() };
}
