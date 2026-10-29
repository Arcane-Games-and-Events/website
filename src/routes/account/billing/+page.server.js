import { redirect } from '@sveltejs/kit';

/** Older emails link here. */
export function load() {
	throw redirect(301, '/account/membership');
}
