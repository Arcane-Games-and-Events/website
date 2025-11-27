import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Send a password reset email
 * @param {string} email - Recipient email
 * @param {string} resetUrl - Full URL to reset password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPasswordResetEmail(email, resetUrl) {
	if (!resend) {
		console.warn('RESEND_API_KEY not configured - password reset email not sent');
		console.log('Reset URL (dev mode):', resetUrl);
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
