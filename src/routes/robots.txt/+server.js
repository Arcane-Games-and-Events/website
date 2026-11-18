import { env } from '$env/dynamic/private';
import { PRIVATE_PREFIXES } from '$lib/seo.js';

/**
 * /robots.txt — search engines and AI assistants may read the public site;
 * accounts, staff tools and the API are off limits. AI crawlers are named
 * so it's plain they're welcome (premium pieces only ever reach them as
 * the same short preview a non-member sees). Points to the sitemap and to
 * /llms.txt.
 */

// Crawlers that build answers for AI assistants and AI search.
const AI_CRAWLERS = [
	'GPTBot',
	'OAI-SearchBot',
	'ChatGPT-User',
	'ClaudeBot',
	'Claude-SearchBot',
	'Claude-User',
	'PerplexityBot',
	'Perplexity-User',
	'Google-Extended',
	'Applebot-Extended',
	'Bingbot',
	'CCBot'
];

export function GET({ url }) {
	// a preview deployment: nothing to index here
	if (env.VERCEL_ENV === 'preview') {
		return new Response('User-agent: *\nDisallow: /\n', {
			headers: { 'content-type': 'text/plain; charset=utf-8' }
		});
	}
	// `/studio/` covers the Studio tool; `/studio$` its front page, without
	// catching the public /studios.
	const rules = [
		...[...PRIVATE_PREFIXES, '/events/*/ticket/', '/library/search'].map((p) => `Disallow: ${p}`),
		'Disallow: /studio$'
	];
	const body = [
		'# AGE: competitive Flesh and Blood. The public site is open to search',
		'# engines and AI assistants; accounts and staff tools are not.',
		`# A guide for AI assistants: ${url.origin}/llms.txt`,
		'',
		'User-agent: *',
		...rules,
		'',
		'# AI assistants and AI search: welcome, under the same rules.',
		...AI_CRAWLERS.map((bot) => `User-agent: ${bot}`),
		'Allow: /',
		...rules,
		'',
		`Sitemap: ${url.origin}/sitemap.xml`,
		''
	].join('\n');
	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
}
