import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

/**
 * Verify a Cloudflare Turnstile token server-side
 * @param {string} token - The cf-turnstile-response token from the client
 * @param {string} [remoteip] - Optional client IP address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyTurnstileToken(token, remoteip) {
	const secretKey = env.TURNSTILE_SECRET_KEY;

	if (!secretKey) {
		if (dev) {
			console.warn('TURNSTILE_SECRET_KEY not configured - skipping CAPTCHA verification');
		}
		return { success: true };
	}

	if (!token) {
		return { success: false, error: 'Please complete the CAPTCHA verification.' };
	}

	try {
		const body = new URLSearchParams();
		body.append('secret', secretKey);
		body.append('response', token);
		if (remoteip) {
			body.append('remoteip', remoteip);
		}

		const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});

		const outcome = await result.json();

		if (outcome.success) {
			return { success: true };
		}

		console.error('Turnstile verification failed:', outcome['error-codes']);
		return {
			success: false,
			error: 'CAPTCHA verification failed. Please try again.'
		};
	} catch (error) {
		console.error('Turnstile verification error:', error);
		if (dev) {
			console.warn('Turnstile verification failed due to network error - allowing in dev mode');
			return { success: true };
		}
		return { success: false, error: 'CAPTCHA verification service unavailable. Please try again.' };
	}
}
