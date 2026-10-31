/**
 * Small helpers for the Studio's API routes: who may use it, and turning a
 * VideoError into the response SvelteKit expects.
 */
import { error, json } from '@sveltejs/kit';
import { canUseStudio } from '$lib/server/auth/roles.js';
import { VideoError } from '$lib/server/video/mux.js';

export function requireStudio(locals) {
	if (!locals.user) throw error(401, 'Sign in first.');
	if (!canUseStudio(locals.user)) throw error(403, 'Only the Studio’s people can do that.');
	return locals.user;
}

export async function respond(fn, status = 200) {
	try {
		return json(await fn(), { status });
	} catch (err) {
		if (err instanceof VideoError) return json({ message: err.message }, { status: err.status });
		throw err;
	}
}

export const body = (request) => request.json().catch(() => ({}));
