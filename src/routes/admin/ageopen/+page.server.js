import { seriesOverview } from '$lib/server/ageopen/overview.js';
import { missingStores } from '$lib/server/stores/admin.js';

/** /admin/ageopen — run the AGE Open series from one page. */
export async function load() {
	try {
		return { ready: true, o: await seriesOverview() };
	} catch (err) {
		if (missingStores(err)) return { ready: false };
		throw err;
	}
}
