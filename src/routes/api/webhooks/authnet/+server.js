import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { webhookEvent, user as userTable, ticket } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AUTHNET_SIGNATURE_KEY } from '$env/static/private';

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
			console.log('Duplicate webhook received:', eventId);
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
 * Handle subscription events (renewals, cancellations, failures)
 */
async function handleSubscriptionEvent(payload) {
	const subscriptionId = payload.x_subscription_id;
	const email = payload.x_email;
	const responseCode = payload.x_response_code;

	// Response codes:
	// 1 = Approved
	// 2 = Declined
	// 3 = Error
	// 4 = Held for review

	if (responseCode === '1') {
		// Subscription payment successful
		console.log(`Subscription ${subscriptionId} payment successful for ${email}`);

		// Ensure user still has premium role
		const users = await db.select().from(userTable).where(eq(userTable.email, email));
		if (users.length > 0 && users[0].role !== 'premium' && users[0].role !== 'admin') {
			await db.update(userTable)
				.set({ role: 'premium' })
				.where(eq(userTable.email, email));
		}
	} else if (responseCode === '2') {
		// Subscription payment declined
		console.log(`Subscription ${subscriptionId} payment declined for ${email}`);

		// Downgrade user to free tier
		await db.update(userTable)
			.set({ role: 'free' })
			.where(eq(userTable.email, email));
	}
}

/**
 * Handle one-time transaction events
 */
async function handleTransactionEvent(payload) {
	const transactionId = payload.x_trans_id;
	const responseCode = payload.x_response_code;
	const amount = payload.x_amount;

	if (responseCode === '1') {
		console.log(`Transaction ${transactionId} successful: $${amount}`);
		// Transaction was successful - already handled in the purchase endpoint
	} else if (responseCode === '2') {
		console.log(`Transaction ${transactionId} declined`);
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
