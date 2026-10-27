import { redirect } from '@sveltejs/kit';

/**
 * The CMS moved to /desk. Old links and bookmarks (/cms, /cms/entries/…,
 * /cms/analytics?range=7) land on the same page under /desk.
 */
export function GET({ params, url }) {
	const rest = params.path ? `/${params.path}` : '';
	throw redirect(308, `/desk${rest}${url.search}`);
}
