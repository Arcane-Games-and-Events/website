import { redirect } from '@sveltejs/kit';

/** My courses moved to its own page. */
export function load() {
	throw redirect(301, '/my-courses');
}
