import { error } from '@sveltejs/kit';
import { showPage } from '$lib/server/studio/public.js';

/** /studios/shows/[slug] — a podcast or interview series and its episodes. */
export async function load({ params, setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
		vary: 'Cookie'
	});
	const page = await showPage(params.slug);
	if (!page) throw error(404, 'Show not found');
	return page;
}
