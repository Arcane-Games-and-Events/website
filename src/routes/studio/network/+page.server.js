import { listChannels } from '$lib/server/studio/network.js';

/** /studio/network — the AGE Network's creators. */
export async function load({ depends }) {
	depends('studio:network');
	return { channels: await listChannels() };
}
