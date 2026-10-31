import { error } from '@sveltejs/kit';
import { body, requireStudio, respond } from '$lib/server/studio/http.js';
import { deleteShow, getShow, updateShow } from '$lib/server/studio/shows.js';

async function showOf(locals, id) {
	requireStudio(locals);
	const show = await getShow(id);
	if (!show) throw error(404, 'Show not found');
	return show;
}

/** PATCH { name?, slug?, kind?, host?, description?, coverImageId?, isActive?, sortOrder? } */
export async function PATCH({ locals, params, request }) {
	const show = await showOf(locals, params.id);
	const input = await body(request);
	return respond(async () => ({ show: await updateShow(show, input) }));
}

/** DELETE: only a show with no episodes. */
export async function DELETE({ locals, params }) {
	const show = await showOf(locals, params.id);
	return respond(async () => {
		await deleteShow(show);
		return { ok: true };
	});
}
