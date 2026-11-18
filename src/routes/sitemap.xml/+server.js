import { publicPages } from '$lib/server/seo/pages.js';

const esc = (s) =>
	String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** /sitemap.xml — every public page, for search engines and AI crawlers. */
export async function GET({ url }) {
	const pages = await publicPages();
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		pages
			.map(
				(p) =>
					`<url><loc>${esc(url.origin + p.path)}</loc>` +
					(p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : '') +
					(p.changefreq ? `<changefreq>${p.changefreq}</changefreq>` : '') +
					(p.priority != null ? `<priority>${p.priority.toFixed(1)}</priority>` : '') +
					'</url>'
			)
			.join('\n') +
		'\n</urlset>\n';
	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
		}
	});
}
