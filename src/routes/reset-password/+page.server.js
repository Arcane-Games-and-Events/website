import { db } from '$lib/server/db';
import { user, passwordResetToken } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { sha256 } from 'oslo/crypto';
import { encodeHex } from 'oslo/encoding';
import { Argon2id } from 'oslo/password';

export async function load({ url }) {
	const token = url.searchParams.get('token');

	if (!token) {
		return { error: 'Invalid or missing reset token' };
	}

	// Hash the token to compare with stored hash
	const tokenHash = encodeHex(await sha256(new TextEncoder().encode(token)));

	// Find valid token
	const [resetToken] = await db
		.select()
		.from(passwordResetToken)
		.where(
			and(
				eq(passwordResetToken.id, tokenHash),
				gt(passwordResetToken.expiresAt, new Date())
			)
		);

	if (!resetToken) {
		return { error: 'This reset link has expired or is invalid' };
	}

	return { token };
}

export const actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const token = form.get('token');
		const password = form.get('password');
		const confirmPassword = form.get('confirmPassword');

		if (typeof token !== 'string' || !token) {
			return fail(400, { error: 'Invalid reset token' });
		}

		if (typeof password !== 'string' || password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match' });
		}

		// Hash the token to compare with stored hash
		const tokenHash = encodeHex(await sha256(new TextEncoder().encode(token)));

		// Find valid token
		const [resetToken] = await db
			.select()
			.from(passwordResetToken)
			.where(
				and(
					eq(passwordResetToken.id, tokenHash),
					gt(passwordResetToken.expiresAt, new Date())
				)
			);

		if (!resetToken) {
			return fail(400, { error: 'This reset link has expired or is invalid' });
		}

		// Hash the new password
		const hashedPassword = await new Argon2id().hash(password);

		// Update user password
		await db
			.update(user)
			.set({ hashedPassword })
			.where(eq(user.id, resetToken.userId));

		// Delete the used token
		await db.delete(passwordResetToken).where(eq(passwordResetToken.id, tokenHash));

		// Redirect to login with success message
		throw redirect(302, '/login?reset=success');
	}
};
