import { redirect } from '@sveltejs/kit';

/** /events/[code] has no page of its own: the event lives at /ageopen/[code]. */
export function load({ params }) {
	throw redirect(301, `/ageopen/${encodeURIComponent(params.eventId)}`);
}
