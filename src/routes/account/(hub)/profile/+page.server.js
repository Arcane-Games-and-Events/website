import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { bump } from '$lib/server/cache/index.js';

export const actions = {
	updateProfile: async ({ request, locals }) => {
		const formData = await request.formData();
		const firstName = formData.get('firstName');
		const lastName = formData.get('lastName');
		const gemId = formData.get('gemId');
		if (
			typeof firstName !== 'string' ||
			typeof lastName !== 'string' ||
			!firstName.trim() ||
			!lastName.trim()
		) {
			return fail(400, { error: 'First name and last name are required.' });
		}
		try {
			await db
				.update(user)
				.set({
					firstName: firstName.trim().slice(0, 60),
					lastName: lastName.trim().slice(0, 60),
					gemId: typeof gemId === 'string' && gemId.trim() ? gemId.trim().slice(0, 40) : null
				})
				.where(eq(user.id, locals.user.id));
			await bump(`user:${locals.user.id}`);
			return { success: true, message: 'Profile updated.' };
		} catch (err) {
			console.error('Error updating profile:', err);
			return fail(500, { error: 'Failed to update profile. Please try again.' });
		}
	}
};
