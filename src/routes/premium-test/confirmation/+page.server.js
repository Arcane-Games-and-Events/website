import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	// Only allow in development
	if (!dev) {
		throw redirect(302, '/');
	}

	return {
		user: locals.user
	};
}
