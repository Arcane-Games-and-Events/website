import { requireStudio, respond } from '$lib/server/studio/http.js';
import { getChannel, syncChannel } from '$lib/server/studio/network.js';
import { error } from '@sveltejs/kit';

/** POST: pull this creator's newest uploads in now. */
export async function POST({ locals, params }) {
	requireStudio(locals);
	const channel = await getChannel(params.id);
	if (!channel) throw error(404, 'Creator not found');
	return respond(async () => ({ sync: await syncChannel(channel) }));
}
