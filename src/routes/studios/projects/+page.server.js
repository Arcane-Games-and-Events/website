import { publicProjects } from '$lib/server/studio/projects.js';
import { PROJECT_TYPES } from '$lib/studio/projects.js';

/** /studios/projects — every project, or one kind (?type=stats). */
export async function load({ url, setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' });
	const type = PROJECT_TYPES.includes(url.searchParams.get('type') ?? '')
		? url.searchParams.get('type')
		: '';
	// Every kind's count comes from the full list, so the chart never empties.
	const all = await publicProjects();
	return {
		type,
		projects: type ? all.filter((p) => p.type === type) : all,
		counts: Object.fromEntries(
			PROJECT_TYPES.map((t) => [t, all.filter((p) => p.type === t).length])
		),
		total: all.length
	};
}
