import { redirect } from '@sveltejs/kit';

/** Course images now live with their course (picked from its Details and topics). */
export const load = () => {
	throw redirect(301, '/classroom');
};
