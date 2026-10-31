import { body, requireStudio, respond } from '$lib/server/studio/http.js';
import { createShow, listShows } from '$lib/server/studio/shows.js';

/** GET: every show. POST { name, kind, host?, description?, coverImageId? }: a new show. */
export async function GET({ locals }) {
	requireStudio(locals);
	return respond(async () => ({ shows: await listShows() }));
}

export async function POST({ locals, request }) {
	const user = requireStudio(locals);
	const input = await body(request);
	return respond(async () => ({ show: await createShow(user, input) }), 201);
}
