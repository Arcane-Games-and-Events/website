import { redirect } from '@sveltejs/kit';

/** Guide refunds are handled in the Classroom now (Classroom → Refunds). */
export function load() {
	throw redirect(301, '/classroom/refunds');
}
