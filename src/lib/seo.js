/**
 * What the site tells search engines and AI assistants about itself:
 * names, the default picture, and the structured data (schema.org JSON-LD)
 * pages share. Used by Seo.svelte, the sitemap, robots.txt and llms.txt.
 */

export const SITE = {
	name: 'AGE',
	legalName: 'Arcane Games and Events',
	description:
		'Independent, member-supported competitive Flesh and Blood: strategy articles and videos, the AGE Open Series in Los Angeles, New England and St. Louis, the AGE Academy and AGE Studios.',
	logo: '/logo.svg',
	image: '/banner/articles-banner.webp'
};

/** An absolute address on this site. */
export const abs = (origin, path) =>
	!path
		? undefined
		: /^https?:\/\//.test(path)
			? path
			: `${origin}${path.startsWith('/') ? '' : '/'}${path}`;

/** JSON for a <script type="application/ld+json">, safe to drop into HTML. */
export const ldJson = (data) =>
	JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/** Seconds as an ISO 8601 duration (PT1H2M3S), for videos. */
export function isoDuration(seconds) {
	const s = Math.max(0, Math.round(Number(seconds) || 0));
	if (!s) return undefined;
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const r = s % 60;
	return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${r || (!h && !m) ? `${r}S` : ''}`;
}

/** Plain text, trimmed to a description's length at a word. */
export function describe(text, max = 160) {
	const t = String(text || '')
		.replace(/\s+/g, ' ')
		.trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export const organization = (origin) => ({
	'@type': 'Organization',
	'@id': `${origin}/#organization`,
	name: SITE.legalName,
	alternateName: SITE.name,
	url: `${origin}/`,
	logo: abs(origin, SITE.logo),
	description: SITE.description
});

export const website = (origin) => ({
	'@type': 'WebSite',
	'@id': `${origin}/#website`,
	name: SITE.name,
	alternateName: SITE.legalName,
	url: `${origin}/`,
	publisher: { '@id': `${origin}/#organization` },
	potentialAction: {
		'@type': 'SearchAction',
		target: {
			'@type': 'EntryPoint',
			urlTemplate: `${origin}/library/search?q={search_term_string}`
		},
		'query-input': 'required name=search_term_string'
	}
});

/**
 * A breadcrumb trail, home first.
 * @param {string} origin
 * @param {[string, string][]} items - [name, path]
 */
export const breadcrumbs = (origin, items) => ({
	'@type': 'BreadcrumbList',
	itemListElement: [['AGE', '/'], ...items].map(([name, path], i) => ({
		'@type': 'ListItem',
		position: i + 1,
		name,
		item: abs(origin, path)
	}))
});

/**
 * Paths that are private (accounts, staff tools) or not worth indexing.
 * robots.txt keeps crawlers out of the private ones; every page under them
 * also says noindex, in case one is linked from elsewhere.
 */
export const PRIVATE_PREFIXES = [
	'/admin',
	'/desk',
	'/classroom',
	'/studio/',
	'/staff',
	'/store',
	'/account',
	'/api/',
	'/cms',
	'/partner',
	'/my-courses',
	'/contact/t/',
	'/academy/cart',
	'/premium/confirmation',
	'/login',
	'/signup',
	'/logout',
	'/forgot-password',
	'/reset-password'
];

/** Whether a path shouldn't be indexed. */
export const isPrivatePath = (path) =>
	path === '/studio' ||
	PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`)) ||
	/^\/events\/[^/]+\/ticket\//.test(path) ||
	path.startsWith('/library/search');
