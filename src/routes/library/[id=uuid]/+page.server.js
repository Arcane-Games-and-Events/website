import { redirect } from '@sveltejs/kit';

/** An old address for a Studio item: matches play at /library/matches (which sends anything else to AGE Studios). */
export function load({ params }) {
	throw redirect(301, `/library/matches/${params.id}`);
}
