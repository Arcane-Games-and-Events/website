import { body, requireStudio, respond } from '$lib/server/studio/http.js';
import { addChannel, previewChannel } from '$lib/server/studio/network.js';

/**
 * POST { url, kind?, preview? } — with `preview`, look the channel up and
 * say what it is (and whether it's already in); otherwise add the creator
 * and pull their uploads in.
 */
export async function POST({ locals, request }) {
	const user = requireStudio(locals);
	const input = await body(request);
	if (input.preview) return respond(async () => ({ channel: await previewChannel(input.url) }));
	return respond(async () => addChannel(user, input), 201);
}
