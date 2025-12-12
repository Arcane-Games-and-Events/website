import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const user = locals.user;

	// Must be logged in and have premium role
	if (!user) {
		throw redirect(302, '/login');
	}

	// Must have just subscribed (have active subscription)
	if (user.role !== 'premium' && user.role !== 'admin') {
		throw redirect(302, '/premium');
	}

	return {
		user: {
			email: user.email,
			subscriptionType: user.subscriptionType,
			subscriptionStartDate: user.subscriptionStartDate,
			nextBillingDate: user.nextBillingDate
		}
	};
}
