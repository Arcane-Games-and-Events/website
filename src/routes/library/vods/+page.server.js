import { redirect } from '@sveltejs/kit';

/** Bonus gameplay moved to AGE Studios (2026-10-30); keep old links and filters working. */
export function load({ url }) {
	throw redirect(301, `/studios/gameplay${url.search}`);
}
