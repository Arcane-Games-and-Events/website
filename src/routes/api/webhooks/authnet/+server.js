import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { webhookEvent, user as userTable, ticket } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AUTHNET_SIGNATURE_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { sendPaymentFailedEmail } from '$lib/server/email.js';

/**
 * Webhook handler for Authorize.net Silent Post URL
 * https://developer.authorize.net/api/reference/features/webhooks.html
 */
export async function POST({ request }) {
	try {
		const formData = await request.formData();
		const payload = Object.fromEntries(formData);

		// Verify webhook signature if available
		const signature = request.headers.get('x-anet-signature');
		if (signature && AUTHNET_SIGNATURE_KEY) {
			const isValid = verifySignature(signature, JSON.stringify(payload), AUTHNET_SIGNATURE_KEY);
			if (!isValid) {
				console.error('Invalid Authorize.net webhook signature');
				return json({ error: 'Invalid signature' }, { status: 401 });
			}
		}

		// Extract event details
		const eventType = payload.x_subscription_id ? 'subscription' : 'transaction';
		const eventId = payload.x_trans_id || payload.x_subscription_id;

		// Check for duplicate webhook (idempotency)
		const existing = await db.select().from(webhookEvent).where(eq(webhookEvent.id, eventId));
		if (existing.length > 0) {
			return json({ received: true });
		}

		// Record webhook event
		await db.insert(webhookEvent).values({
			id: eventId,
			provider: 'authnet',
		});

		// Handle different event types
		if (eventType === 'subscription') {
			await handleSubscriptionEvent(payload);
		} else if (eventType === 'transaction') {
			await handleTransactionEvent(payload);
		}

		return json({ received: true });
	} catch (err) {
		console.error('Webhook processing error:', err);
		return json({ error: 'Webhook processing failed' }, { status: 500 });
	}
}

/**
 * Calculate the next billing date based on subscription type
 */
function calculateNextBillingDate(currentDate, subscriptionType) {
	const nextDate = new Date(currentDate);
	if (subscriptionType === 'yearly') {
		nextDate.setFullYear(nextDate.getFullYear() + 1);
	} else if (subscriptionType === 'weekly_test') {
		// For testing: 7-day interval (minimum allowed by Authorize.net)
		nextDate.setDate(nextDate.getDate() + 7);
	} else {
		// Default: monthly
		nextDate.setMonth(nextDate.getMonth() + 1);
	}
	return nextDate;
}

/**
 * Handle subscription events (renewals, cancellations, failures)
 */
async function handleSubscriptionEvent(payload) {
	const subscriptionId = payload.x_subscription_id;
	const email = payload.x_email;
	const responseCode = payload.x_response_code;
	const subscriptionPayNum = payload.x_subscription_paynum; // Payment number in sequence

	// Response codes:
	// 1 = Approved
	// 2 = Declined
	// 3 = Error
	// 4 = Held for review

	// Find user by subscriptionId first (more reliable), fallback to email
	let users = await db.select().from(userTable).where(eq(userTable.subscriptionId, subscriptionId));
	if (users.length === 0 && email) {
		users = await db.select().from(userTable).where(eq(userTable.email, email));
	}

	if (users.length === 0) {
		console.error(`No user found for subscription ${subscriptionId} or email ${email}`);
		return;
	}

	const user = users[0];

	if (responseCode === '1') {
		// Subscription payment successful
		// Calculate next billing date
		const now = new Date();
		const nextBillingDate = calculateNextBillingDate(now, user.subscriptionType || 'monthly');

		// Update user: ensure premium role, update billing date, clear any failed status
		await db.update(userTable)
			.set({
				role: 'premium',
				subscriptionStatus: 'active',
				nextBillingDate,
				// Clear any previous end date if they were in grace period
				subscriptionEndDate: null
			})
			.where(eq(userTable.id, user.id));

	} else if (responseCode === '2' || responseCode === '3') {
		// Subscription payment declined or error
		// Set status to payment_failed - give them a grace period
		// Don't immediately downgrade, allow them to update payment method
		const gracePeriodEnd = new Date();
		gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7 day grace period

		await db.update(userTable)
			.set({
				subscriptionStatus: 'payment_failed',
				subscriptionEndDate: gracePeriodEnd
			})
			.where(eq(userTable.id, user.id));

		// Send email notification to user about failed payment
		const baseUrl = env.PUBLIC_BASE_URL || 'https://www.age.events';
		await sendPaymentFailedEmail(user.email, {
			gracePeriodEnd,
			updatePaymentUrl: `${baseUrl}/account/billing`
		});

	} else if (responseCode === '4') {
		// Held for review - don't change anything yet
	}
}

/**
 * Handle one-time transaction events
 */
async function handleTransactionEvent(payload) {
	const responseCode = payload.x_response_code;

	if (responseCode === '1') {
		// Transaction was successful - already handled in the purchase endpoint
	} else if (responseCode === '2') {
		// Mark any associated tickets/entitlements as voided
		// This would require tracking transaction IDs in the order meta
	}
}

/**
 * Verify Authorize.net webhook signature
 */
function verifySignature(signature, payload, signatureKey) {
	try {
		// Authorize.net uses HMAC-SHA512
		const [algo, hash] = signature.split('=');
		if (algo !== 'sha512') return false;

		const expectedHash = crypto
			.createHmac('sha512', signatureKey)
			.update(payload)
			.digest('hex')
			.toUpperCase();

		return hash.toUpperCase() === expectedHash;
	} catch (err) {
		console.error('Signature verification error:', err);
		return false;
	}
}
