import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { auth } from '$lib/server/lucia.js';
import { eq } from 'drizzle-orm';

/**
 * Cancel a premium subscription
 */
export async function POST({ locals }) {
	console.log('=== CANCEL SUBSCRIPTION ENDPOINT CALLED ===');

	try {
		// Ensure user is logged in
		const currentUser = locals.user;
		console.log('Current user:', currentUser?.email, 'Role:', currentUser?.role);

		if (!currentUser) {
			return json({ error: 'You must be logged in to cancel' }, { status: 401 });
		}

		// Check if user has a subscription
		if (!currentUser.subscriptionId) {
			return json({ error: 'No active subscription found' }, { status: 400 });
		}

		console.log('Cancelling subscription:', currentUser.subscriptionId);

		// Cancel subscription with Authorize.net
		try {
			const result = await authnet.cancelSubscription(currentUser.subscriptionId);
			console.log('Authorize.net cancellation response:', result);

			if (result.success) {
				console.log('Subscription cancelled successfully in Authorize.net');

				// Update user role to free and remove subscription ID
				await db.update(userTable)
					.set({
						role: 'free',
						subscriptionId: null
					})
					.where(eq(userTable.id, currentUser.id));

				console.log('User downgraded to free and subscription ID removed');

				// Invalidate current session and create new one with updated role
				if (locals.session) {
					await auth.invalidateSession(locals.session.id);
					console.log('Old session invalidated');
				}

				// Create new session with updated user data
				const newSession = await auth.createSession(currentUser.id, {});
				const sessionCookie = auth.createSessionCookie(newSession.id);

				console.log('New session created with free role');

				return json(
					{
						success: true,
						message: 'Subscription cancelled successfully'
					},
					{
						headers: {
							'Set-Cookie': sessionCookie.serialize()
						}
					}
				);
			} else {
				console.error('Authorize.net cancellation failed');
				return json({ error: 'Cancellation failed' }, { status: 500 });
			}
		} catch (authError) {
			console.error('Authorize.net API error:', authError);
			return json({ error: `Cancellation error: ${authError.message}` }, { status: 500 });
		}
	} catch (err) {
		console.error('Cancellation error:', err);
		return json({ error: err.message || 'Cancellation failed' }, { status: 500 });
	}
}
