import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Send a password reset email
 * @param {string} email - Recipient email
 * @param {string} resetUrl - Full URL to reset password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPasswordResetEmail(email, resetUrl) {
	if (!resend) {
		if (dev) {
			console.warn('RESEND_API_KEY not configured - password reset email not sent');
			console.log('Reset URL (dev mode):', resetUrl);
		}
		return { success: true }; // Allow flow to continue in dev
	}

	try {
		await resend.emails.send({
			from: env.EMAIL_FROM || 'AGE <noreply@arcanegamesandevents.com>',
			to: email,
			subject: 'Reset Your Password - AGE',
			html: `
				<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
					<h1 style="color: #1a1a2e;">Reset Your Password</h1>
					<p>You requested a password reset for your AGE account.</p>
					<p>Click the button below to reset your password. This link will expire in 1 hour.</p>
					<a href="${resetUrl}" style="display: inline-block; background-color: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
						Reset Password
					</a>
					<p style="color: #666; font-size: 14px;">
						If you didn't request this, you can safely ignore this email.
					</p>
					<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
					<p style="color: #999; font-size: 12px;">
						AGE - Arcane Games and Events
					</p>
				</div>
			`
		});
		return { success: true };
	} catch (error) {
		console.error('Failed to send password reset email:', error);
		return { success: false, error: 'Failed to send email' };
	}
}

/**
 * Add email to Resend Audience for newsletter
 * @param {string} email - Email to add to audience
 * @returns {Promise<{success: boolean, contactId?: string, error?: string}>}
 */
export async function addToNewsletterAudience(email) {
	if (!resend) {
		if (dev) console.warn('RESEND_API_KEY not configured - skipping Resend audience sync');
		return { success: true, contactId: null };
	}

	const audienceId = env.RESEND_AUDIENCE_ID;
	if (!audienceId) {
		if (dev) console.warn('RESEND_AUDIENCE_ID not configured - skipping Resend audience sync');
		return { success: true, contactId: null };
	}

	try {
		const contact = await resend.contacts.create({
			email,
			audienceId,
			unsubscribed: false
		});
		return { success: true, contactId: contact.data?.id };
	} catch (error) {
		console.error('Failed to add to Resend audience:', error);
		// Don't fail the subscription if Resend sync fails
		return { success: false, error: error.message };
	}
}

/**
 * Send a payment failed notification email
 * @param {string} email - Recipient email
 * @param {Object} options - Additional options
 * @param {Date} options.gracePeriodEnd - When the grace period ends
 * @param {string} options.updatePaymentUrl - URL to update payment method
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPaymentFailedEmail(email, { gracePeriodEnd, updatePaymentUrl }) {
	if (!resend) {
		if (dev) {
			console.warn('RESEND_API_KEY not configured - payment failed email not sent');
		}
		return { success: true };
	}

	const formattedDate = gracePeriodEnd.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	try {
		await resend.emails.send({
			from: env.EMAIL_FROM || 'AGE <noreply@arcanegamesandevents.com>',
			to: email,
			subject: 'Action Required: Payment Failed - AGE',
			html: `
				<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
					<h1 style="color: #dc2626;">Payment Failed</h1>
					<p>We were unable to process your subscription payment for AGE Premium.</p>
					<p>To avoid any interruption to your premium access, please update your payment method before <strong>${formattedDate}</strong>.</p>
					<a href="${updatePaymentUrl}" style="display: inline-block; background-color: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
						Update Payment Method
					</a>
					<p style="color: #666; font-size: 14px;">
						If you believe this is an error or need assistance, please contact us at support@arcanegamesandevents.com.
					</p>
					<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
					<p style="color: #999; font-size: 12px;">
						AGE - Arcane Games and Events
					</p>
				</div>
			`
		});
		return { success: true };
	} catch (error) {
		console.error('Failed to send payment failed email:', error);
		return { success: false, error: 'Failed to send email' };
	}
}
