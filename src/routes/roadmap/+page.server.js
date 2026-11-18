import { publicRoadmap } from '$lib/server/roadmap.js';

/** /roadmap — public: what AGE is building now, next and later, and what shipped. */
export async function load({ setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
	return { roadmap: await publicRoadmap() };
}
