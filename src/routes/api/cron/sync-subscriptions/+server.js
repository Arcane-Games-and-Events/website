import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { eq, isNotNull, and, ne } from 'drizzle-orm';
import { CRON_SECRET } from '$env/static/private';

/**
 * Sync subscription statuses from Authorize.net
 *
 * This endpoint polls Authorize.net for the current status of all active subscriptions
 * and updates the local database accordingly. Use as a backup to webhooks.
 *
 * Can be called by:
 * - Vercel Cron (daily)
 * - Manual trigger for debugging
 *
 * Security: Requires CRON_SECRET header or admin user
 */
export async function GET({ request, locals }) {
	// Verify authorization
	const authHeader = request.headers.get('authorization');
	const isValidCronSecret = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
	const isAdmin = locals.user?.role === 'admin';

	if (!isValidCronSecret && !isAdmin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Get all users with active subscriptions
		const usersWithSubscriptions = await db
			.select()
			.from(userTable)
			.where(
				and(
					isNotNull(userTable.subscriptionId),
					ne(userTable.subscriptionStatus, 'expired')
				)
			);

		const results = {
			checked: 0,
			updated: 0,
			errors: [],
			details: []
		};

		for (const user of usersWithSubscriptions) {
			results.checked++;

			try {
				// Get subscription status from Authorize.net
				const subStatus = await authnet.getSubscriptionStatus(user.subscriptionId);
				const authnetStatus = subStatus.status?.toLowerCase();

				// Map Authorize.net status to our status
				let newStatus = user.subscriptionStatus;
				let shouldUpdate = false;

				// Authorize.net statuses: active, expired, suspended, cancelled, terminated
				if (authnetStatus === 'active' && user.subscriptionStatus !== 'active') {
					// Subscription is active in Authorize.net but not locally
					newStatus = 'active';
					shouldUpdate = true;
				} else if (authnetStatus === 'expired' || authnetStatus === 'terminated') {
					// Subscription has ended
					newStatus = 'expired';
					shouldUpdate = true;
				} else if (authnetStatus === 'cancelled' && user.subscriptionStatus !== 'cancelled') {
					// Subscription was cancelled
					newStatus = 'cancelled';
					shouldUpdate = true;
				} else if (authnetStatus === 'suspended' && user.subscriptionStatus !== 'payment_failed') {
					// Subscription is suspended (payment issues)
					newStatus = 'payment_failed';
					shouldUpdate = true;
				}

				if (shouldUpdate) {
					// Get full subscription details to check for recent transactions
					const subDetails = await authnet.getSubscription(user.subscriptionId);

					// Calculate next billing date based on latest transaction
					let nextBillingDate = user.nextBillingDate;
					if (subDetails.transactions && subDetails.transactions.length > 0) {
						// Sort by payNum descending to get the most recent
						const sortedTx = [...subDetails.transactions].sort((a, b) => b.payNum - a.payNum);
						const latestTx = sortedTx[0];

						// If there's a successful transaction, update billing date
						if (latestTx.response === '1') {
							const txDate = new Date(latestTx.submitTimeUTC);
							// Calculate next billing based on subscription type
							if (user.subscriptionType === 'yearly') {
								nextBillingDate = new Date(txDate);
								nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
							} else if (user.subscriptionType === 'weekly_test') {
								nextBillingDate = new Date(txDate);
								nextBillingDate.setDate(nextBillingDate.getDate() + 7);
							} else {
								nextBillingDate = new Date(txDate);
								nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
							}
						}
					}

					// Update user
					const updateData = {
						subscriptionStatus: newStatus
					};

					// Update role based on status
					if (newStatus === 'expired' || newStatus === 'cancelled') {
						// Check if past end date
						const now = new Date();
						if (user.subscriptionEndDate && now >= new Date(user.subscriptionEndDate)) {
							updateData.role = 'user';
						}
					} else if (newStatus === 'active') {
						updateData.role = 'premium';
						updateData.subscriptionEndDate = null;
						if (nextBillingDate) {
							updateData.nextBillingDate = nextBillingDate;
						}
					}

					await db.update(userTable)
						.set(updateData)
						.where(eq(userTable.id, user.id));

					results.updated++;
					results.details.push({
						email: user.email,
						oldStatus: user.subscriptionStatus,
						newStatus,
						authnetStatus
					});
				}
			} catch (err) {
				console.error(`Error checking subscription for ${user.email}:`, err.message);
				results.errors.push({
					email: user.email,
					subscriptionId: user.subscriptionId,
					error: err.message
				});
			}
		}

		return json({
			success: true,
			...results
		});
	} catch (err) {
		console.error('Subscription sync error:', err);
		return json({ error: err.message }, { status: 500 });
	}
}

/**
 * POST: Sync a specific user's subscription
 */
export async function POST({ request, locals }) {
	// Only allow admins
	if (locals.user?.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	try {
		const { email, subscriptionId } = await request.json();

		if (!subscriptionId) {
			return json({ error: 'subscriptionId is required' }, { status: 400 });
		}

		// Get subscription details from Authorize.net
		const subDetails = await authnet.getSubscription(subscriptionId);

		return json({
			success: true,
			subscription: subDetails
		});
	} catch (err) {
		console.error('Subscription check error:', err);
		return json({ error: err.message }, { status: 500 });
	}
}
