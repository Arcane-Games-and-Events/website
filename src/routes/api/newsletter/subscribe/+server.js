import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { newsletterSubscriber } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { addToNewsletterAudience } from '$lib/server/email.js';

export async function POST({ request }) {
	try {
		const { email } = await request.json();

		// Validate email format
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return json({ error: 'Please enter a valid email address' }, { status: 400 });
		}

		const normalizedEmail = email.toLowerCase().trim();

		// Check if already subscribed
		const existing = await db
			.select()
			.from(newsletterSubscriber)
			.where(eq(newsletterSubscriber.email, normalizedEmail))
			.limit(1);

		if (existing.length > 0) {
			if (existing[0].status === 'active') {
				// Already subscribed - return success (don't reveal subscription status)
				return json({ success: true, message: 'Thanks for subscribing!' });
			}

			// Resubscribe previously unsubscribed user
			await db
				.update(newsletterSubscriber)
				.set({
					status: 'active',
					unsubscribedAt: null,
					subscribedAt: new Date()
				})
				.where(eq(newsletterSubscriber.email, normalizedEmail));

			// Re-add to Resend Audience
			await addToNewsletterAudience(normalizedEmail);

			return json({ success: true, message: 'Welcome back! You have been resubscribed.' });
		}

		// Add to Resend Audience first
		const audienceResult = await addToNewsletterAudience(normalizedEmail);

		// Insert new subscriber into database
		await db.insert(newsletterSubscriber).values({
			email: normalizedEmail,
			resendContactId: audienceResult.contactId || null,
			source: 'website'
		});

		return json({ success: true, message: 'Thanks for subscribing!' });
	} catch (error) {
		console.error('Newsletter subscribe error:', error);
		return json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
	}
}
