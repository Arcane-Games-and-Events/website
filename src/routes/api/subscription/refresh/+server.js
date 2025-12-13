import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Refresh subscription information from Authorize.net
 *
 * This is a user-facing backup in case webhooks and polling fail.
 * Logged-in users can call this to sync their subscription status.
 */
export async function POST({ locals }) {
	const currentUser = locals.user;

	if (!currentUser) {
		return json({ error: 'You must be logged in' }, { status: 401 });
	}

	if (!currentUser.subscriptionId) {
		return json({ error: 'No active subscription found' }, { status: 400 });
	}

	try {
		// Get subscription status from Authorize.net
		const subStatus = await authnet.getSubscriptionStatus(currentUser.subscriptionId);
		const authnetStatus = subStatus.status?.toLowerCase();

		// Get full subscription details for transaction history
		const subDetails = await authnet.getSubscription(currentUser.subscriptionId);

		// Determine new status based on Authorize.net response
		let newStatus = currentUser.subscriptionStatus;
		let shouldUpdate = false;

		// Map Authorize.net statuses to our statuses
		if (authnetStatus === 'active' && currentUser.subscriptionStatus !== 'active') {
			newStatus = 'active';
			shouldUpdate = true;
		} else if (authnetStatus === 'expired' || authnetStatus === 'terminated') {
			newStatus = 'expired';
			shouldUpdate = true;
		} else if (authnetStatus === 'cancelled' && currentUser.subscriptionStatus !== 'cancelled') {
			newStatus = 'cancelled';
			shouldUpdate = true;
		} else if (
			authnetStatus === 'suspended' &&
			currentUser.subscriptionStatus !== 'payment_failed'
		) {
			newStatus = 'payment_failed';
			shouldUpdate = true;
		}

		// Calculate next billing date from transaction history
		let nextBillingDate = currentUser.nextBillingDate;
		let billingDateChanged = false;
		if (subDetails.transactions && subDetails.transactions.length > 0) {
			// Sort by payNum descending to get the most recent
			const sortedTx = [...subDetails.transactions].sort((a, b) => b.payNum - a.payNum);
			const latestTx = sortedTx[0];

			// If there's a successful transaction, calculate next billing
			// Response from ARB transactions is text like "This transaction has been approved."
			const isApproved =
				latestTx.response === '1' ||
				latestTx.response === 1 ||
				(typeof latestTx.response === 'string' &&
					latestTx.response.toLowerCase().includes('approved'));

			if (isApproved) {
				const txDate = new Date(latestTx.submitTimeUTC);

				// Calculate next billing based on subscription type
				if (currentUser.subscriptionType === 'yearly') {
					nextBillingDate = new Date(txDate);
					nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
				} else if (currentUser.subscriptionType === 'weekly_test') {
					nextBillingDate = new Date(txDate);
					nextBillingDate.setDate(nextBillingDate.getDate() + 7);
				} else {
					// Monthly
					nextBillingDate = new Date(txDate);
					nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
				}

				// Check if the billing date is different
				if (currentUser.nextBillingDate) {
					const currentNext = new Date(currentUser.nextBillingDate);
					if (Math.abs(nextBillingDate.getTime() - currentNext.getTime()) > 1000 * 60 * 60) {
						// More than 1 hour difference
						billingDateChanged = true;
						shouldUpdate = true;
					}
				} else {
					billingDateChanged = true;
					shouldUpdate = true;
				}
			}
		}

		// Update if needed
		if (shouldUpdate) {
			const updateData = {};

			// Only update status if it changed
			if (newStatus !== currentUser.subscriptionStatus) {
				updateData.subscriptionStatus = newStatus;
			}

			// Update role based on status
			if (newStatus === 'expired' || newStatus === 'cancelled') {
				const now = new Date();
				if (currentUser.subscriptionEndDate && now >= new Date(currentUser.subscriptionEndDate)) {
					updateData.role = 'user';
				}
			} else if (newStatus === 'active') {
				updateData.role = 'premium';
				updateData.subscriptionEndDate = null;
			}

			// Always update billing date if it changed
			if (billingDateChanged && nextBillingDate) {
				updateData.nextBillingDate = nextBillingDate;
			}

			await db.update(userTable).set(updateData).where(eq(userTable.id, currentUser.id));

			return json({
				success: true,
				updated: true,
				status: newStatus,
				nextBillingDate: nextBillingDate?.toISOString(),
				message: 'Subscription information updated'
			});
		}

		return json({
			success: true,
			updated: false,
			status: currentUser.subscriptionStatus,
			nextBillingDate: currentUser.nextBillingDate,
			message: 'Subscription information is already up to date'
		});
	} catch (err) {
		console.error('[Subscription Refresh] Error:', err);
		return json({ error: 'Failed to refresh subscription information' }, { status: 500 });
	}
}
