import { llmsText } from '$lib/server/seo/llms.js';

/** /llms.txt — AGE in plain Markdown for AI assistants (see $lib/server/seo/llms.js). */
export async function GET({ url }) {
	return new Response(await llmsText(url.origin), {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
		}
	});
}
