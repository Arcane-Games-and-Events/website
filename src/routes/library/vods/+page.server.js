import { redirect } from '@sveltejs/kit';

/** The old bonus gameplay archive: matches now live at /library/matches. */
export function load({ url }) {
	throw redirect(301, `/library/matches${url.search}`);
}
