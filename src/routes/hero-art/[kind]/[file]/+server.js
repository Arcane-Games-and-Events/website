import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { cached } from '$lib/server/cache/index.js';

/**
 * GET /hero-art/still/<slug>.webp, /hero-art/motion/<slug>.av1.mp4|.mp4 —
 * a hero's art, from the `hero-art` bucket in this site's Supabase project
 * (uploaded with scripts/hero-art.mjs). Until a file is there, a still
 * falls back to the old /hero_images picture and motion is a 404, so pages
 * never show a broken image. A file found is remembered for a day; a file
 * not found is asked about again next time.
 */
const FILE = /^[a-z0-9][a-z0-9.-]*\.(webp|webm|mp4)$/;
const KINDS = { still: ['webp'], motion: ['webm', 'mp4'] };

export async function GET({ params, fetch }) {
	const { kind, file } = params;
	const ext = file.split('.').pop();
	if (!KINDS[kind] || !FILE.test(file) || !KINDS[kind].includes(ext)) throw error(404, 'Not found');

	const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
	const url = base ? `${base}/storage/v1/object/public/hero-art/${kind}/${file}` : null;
	// Only a file that's there is remembered (a day); "not there" is never
	// cached, so art shows as soon as it's uploaded.
	const there = url
		? await cached(
				`hero-art:there:v2:${kind}/${file}`,
				async () => {
					try {
						return (await fetch(url, { method: 'HEAD' })).ok || null;
					} catch {
						return null;
					}
				},
				{ ttl: 86400, mem: 3600 }
			)
		: null;

	const to = (location, maxAge) =>
		new Response(null, {
			status: 302,
			headers: { location, 'cache-control': `public, max-age=${maxAge}` }
		});
	if (there) return to(url, 86400);
	if (kind === 'still') return to(`/hero_images/${file}`, 300);
	throw error(404, 'Not found');
}
