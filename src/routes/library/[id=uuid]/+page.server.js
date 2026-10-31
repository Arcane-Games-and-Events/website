import { redirect } from '@sveltejs/kit';

/** A bonus match's page moved to AGE Studios (2026-10-30). */
export function load({ params }) {
	throw redirect(301, `/studios/${params.id}`);
}
