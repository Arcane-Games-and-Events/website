import { redirect } from '@sveltejs/kit';

/** Bonus gameplay moved to the Desk. */
export function load() {
	throw redirect(301, '/desk/videos');
}
