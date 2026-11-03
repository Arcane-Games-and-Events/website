import { redirect } from '@sveltejs/kit';

/**
 * Course videos now live with their course: the trailer on its Details tab,
 * each lesson's video in its topic, and viewing numbers on its Analytics tab.
 */
export const load = () => {
	throw redirect(301, '/classroom');
};
