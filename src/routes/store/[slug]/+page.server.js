import { seasonDashboard, storeOwedCents } from '$lib/server/stores/portal.js';

/** /store/[slug] — the season dashboard: the store's eight Opens and the AGE season. */
export async function load({ parent }) {
	const { where } = await parent();
	const [season, owedCents] = await Promise.all([
		seasonDashboard(where),
		storeOwedCents(where.store.id)
	]);
	return { dash: season, owedCents };
}
