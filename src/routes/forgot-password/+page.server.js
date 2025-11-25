import { db } from '$lib/server/db';
import { user, passwordResetToken } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { sendPasswordResetEmail } from '$lib/server/email';
import { sha256 } from 'oslo/crypto';
import { encodeHex } from 'oslo/encoding';
import { generateIdFromEntropySize } from 'lucia';

export async function load({ locals }) {
	// If already logged in, redirect to account
	if (locals.user) {
		return { redirect: '/account' };
	}
	return {};
}

export const actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();
		const email = form.get('email');

		if (typeof email !== 'string' || !email.includes('@')) {
			return fail(400, { error: 'Please enter a valid email address' });
		}

		// Find user by email
		const [existingUser] = await db.select().from(user).where(eq(user.email, email.toLowerCase()));

		// Always show success message to prevent email enumeration
		if (!existingUser) {
			return { success: true };
		}

		// Delete any existing tokens for this user
		await db.delete(passwordResetToken).where(eq(passwordResetToken.userId, existingUser.id));

		// Generate a secure token
		const token = generateIdFromEntropySize(25); // 40 character token
		const tokenHash = encodeHex(await sha256(new TextEncoder().encode(token)));

		// Store hashed token (expires in 1 hour)
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
		await db.insert(passwordResetToken).values({
			id: tokenHash,
			userId: existingUser.id,
			expiresAt
		});

		// Build reset URL
		const resetUrl = `${url.origin}/reset-password?token=${token}`;

		// Send email
		const result = await sendPasswordResetEmail(existingUser.email, resetUrl);
		if (!result.success) {
			return fail(500, { error: 'Failed to send reset email. Please try again.' });
		}

		return { success: true };
	}
};
