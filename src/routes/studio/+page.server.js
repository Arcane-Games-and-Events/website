import { studioHome } from '$lib/server/studio/list.js';
import { networkSummary } from '$lib/server/studio/network.js';

/** /studio — the production board. */
export async function load({ depends }) {
	depends('studio:media');
	depends('studio:network');
	const [home, network] = await Promise.all([studioHome(), networkSummary()]);
	return { home, network };
}
