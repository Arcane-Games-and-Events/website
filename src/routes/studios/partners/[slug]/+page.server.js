import { error } from '@sveltejs/kit';
import { creatorPage } from '$lib/server/studio/public.js';

/** /studios/partners/[slug] — one creator and the videos AGE features from them. */
export async function load({ params, setHeaders }) {
	const page = await creatorPage(params.slug);
	if (!page) throw error(404, 'Creator not found');
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' });
	return page;
}
