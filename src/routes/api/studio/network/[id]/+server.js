import { error } from '@sveltejs/kit';
import { body, requireStudio, respond } from '$lib/server/studio/http.js';
import { deleteChannel, getChannel, updateChannel } from '$lib/server/studio/network.js';

async function channelOf(locals, id) {
	requireStudio(locals);
	const channel = await getChannel(id);
	if (!channel) throw error(404, 'Creator not found');
	return channel;
}

/** PATCH { name?, slug?, kind?, description?, coverImageId?, isActive?, sortOrder? } */
export async function PATCH({ locals, params, request }) {
	const channel = await channelOf(locals, params.id);
	const input = await body(request);
	return respond(async () => ({ channel: await updateChannel(channel, input) }));
}

/** DELETE: the creator and every video of theirs leave the site. */
export async function DELETE({ locals, params }) {
	const channel = await channelOf(locals, params.id);
	return respond(async () => {
		await deleteChannel(channel);
		return { ok: true };
	});
}
