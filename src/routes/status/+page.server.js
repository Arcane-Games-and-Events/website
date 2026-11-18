import { statusPage } from '$lib/server/status/index.js';

/** /status — public: how each part of AGE is running, and any incidents. */
export async function load({ setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' });
	return { status: await statusPage() };
}
