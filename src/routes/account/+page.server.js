import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/account');
	}

	return {
		user: locals.user
	};
}
