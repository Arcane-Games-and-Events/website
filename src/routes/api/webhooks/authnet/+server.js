import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { webhookEvent, user as userTable, ticket, memberReferral } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { env } from '$env/dynamic/private';
import { sendPaymentFailedEmail } from '$lib/server/email.js';
import { authnet } from '$lib/server/authnet/client.js';

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
		if (signature && env.AUTHNET_SIGNATURE_KEY) {
			const isValid = verifySignature(
				signature,
				JSON.stringify(payload),
				env.AUTHNET_SIGNATURE_KEY
			);
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
			provider: 'authnet'
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
		await db
			.update(userTable)
			.set({
				role: 'premium',
				subscriptionStatus: 'active',
				nextBillingDate,
				// Clear any previous end date if they were in grace period
				subscriptionEndDate: null
			})
			.where(eq(userTable.id, user.id));

		// Member referral reward: when a member-referred user pays for their second
		// period, the referrer earns one free month. The deferred ARB's first
		// successful charge is what counts as "they subscribed for the next month."
		try {
			await processMemberReferralReward(user);
		} catch (err) {
			// Never let a reward failure block the renewal acknowledgement
			console.error('Member referral reward processing failed:', err);
		}
	} else if (responseCode === '2' || responseCode === '3') {
		// Subscription payment declined or error
		// Set status to payment_failed - give them a grace period
		// Don't immediately downgrade, allow them to update payment method
		const gracePeriodEnd = new Date();
		gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7 day grace period

		await db
			.update(userTable)
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
 * If `referredUser` was signed up via a member referral code and this is their
 * first successful ARB renewal, deliver the comp month to the referrer by
 * pushing the referrer's next ARB charge date out by one month.
 *
 * Only fires once per referral (status=pending → reward_applied).
 */
async function processMemberReferralReward(referredUser) {
	const [pending] = await db
		.select()
		.from(memberReferral)
		.where(
			and(
				eq(memberReferral.referredUserId, referredUser.id),
				eq(memberReferral.status, 'pending')
			)
		)
		.limit(1);

	if (!pending) return;

	// Look up the referrer to get their subscription details
	const [referrer] = await db
		.select()
		.from(userTable)
		.where(eq(userTable.id, pending.referrerUserId))
		.limit(1);

	if (!referrer) {
		// Referrer was deleted — mark referral cancelled and bail
		await db
			.update(memberReferral)
			.set({ status: 'cancelled' })
			.where(eq(memberReferral.id, pending.id));
		return;
	}

	// Mark earned regardless of whether we can apply (so admin can see history)
	await db
		.update(memberReferral)
		.set({ status: 'reward_earned', rewardEarnedAt: new Date() })
		.where(eq(memberReferral.id, pending.id));

	// Only deliver the comp month if the referrer has an active subscription
	if (
		referrer.subscriptionStatus !== 'active' ||
		!referrer.subscriptionId ||
		!referrer.nextBillingDate
	) {
		// Reward stays at 'reward_earned' — admin can manually apply later if user resubscribes
		return;
	}

	// Push next billing date out by one month
	const newNext = new Date(referrer.nextBillingDate);
	newNext.setMonth(newNext.getMonth() + 1);
	const newStartStr = newNext.toISOString().split('T')[0];

	try {
		await authnet.updateSubscriptionStartDate({
			subscriptionId: referrer.subscriptionId,
			startDate: newStartStr
		});

		await db
			.update(userTable)
			.set({ nextBillingDate: newNext })
			.where(eq(userTable.id, referrer.id));

		await db
			.update(memberReferral)
			.set({ status: 'reward_applied', rewardAppliedAt: new Date() })
			.where(eq(memberReferral.id, pending.id));

		console.log(
			`Member referral reward applied: referrer ${referrer.id} next bill pushed to ${newStartStr}`
		);
	} catch (err) {
		console.error(
			`Failed to update Authorize.net subscription for referrer ${referrer.id}:`,
			err
		);
		// Status stays at 'reward_earned' — can be retried manually
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
