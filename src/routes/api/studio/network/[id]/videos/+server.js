import { error } from '@sveltejs/kit';
import { body, requireStudio, respond } from '$lib/server/studio/http.js';
import { addVideoByLink, getChannel, orderFeatured } from '$lib/server/studio/network.js';

async function channelOf(locals, id) {
	const user = requireStudio(locals);
	const channel = await getChannel(id);
	if (!channel) throw error(404, 'Creator not found');
	return { user, channel };
}

/** POST { url }: add one of this creator's videos by its link, featured. */
export async function POST({ locals, params, request }) {
	const { user, channel } = await channelOf(locals, params.id);
	const { url } = await body(request);
	return respond(async () => ({ video: await addVideoByLink(user, channel, url) }), 201);
}

/** PUT { order: [videoId, …] }: the featured videos' order on the creator's page. */
export async function PUT({ locals, params, request }) {
	const { channel } = await channelOf(locals, params.id);
	const { order } = await body(request);
	return respond(async () => {
		await orderFeatured(channel, order);
		return { ok: true };
	});
}
