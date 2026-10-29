import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';

export const actions = {
	changePassword: async ({ request, locals }) => {
		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword');
		const newPassword = formData.get('newPassword');
		const confirmPassword = formData.get('confirmPassword');
		if (
			typeof currentPassword !== 'string' ||
			typeof newPassword !== 'string' ||
			typeof confirmPassword !== 'string' ||
			!currentPassword ||
			!newPassword ||
			!confirmPassword
		) {
			return fail(400, { error: 'All password fields are required.' });
		}
		if (newPassword.length < 8)
			return fail(400, { error: 'New password must be at least 8 characters.' });
		if (newPassword !== confirmPassword) return fail(400, { error: 'New passwords do not match.' });
		try {
			const [row] = await db
				.select({ hashedPassword: user.hashedPassword })
				.from(user)
				.where(eq(user.id, locals.user.id))
				.limit(1);
			if (!row?.hashedPassword) return fail(400, { error: 'Unable to verify current password.' });
			const argon2id = new Argon2id();
			if (!(await argon2id.verify(row.hashedPassword, currentPassword)))
				return fail(400, { error: 'Current password is incorrect.' });
			await db
				.update(user)
				.set({ hashedPassword: await argon2id.hash(newPassword) })
				.where(eq(user.id, locals.user.id));
			return { success: true, message: 'Password changed.' };
		} catch (err) {
			console.error('Error changing password:', err);
			return fail(500, { error: 'Failed to change password. Please try again.' });
		}
	}
};
