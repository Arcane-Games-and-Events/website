import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load({ locals }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/account');
	}

	return {
		user: locals.user
	};
}

export const actions = {
	toggleTheme: async ({ locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			// Toggle theme: dark -> light, light -> dark
			const newTheme = locals.user.theme === 'dark' ? 'light' : 'dark';

			// Update database
			await db
				.update(user)
				.set({ theme: newTheme })
				.where(eq(user.id, locals.user.id));

			return { success: true, theme: newTheme };
		} catch (err) {
			console.error('Error updating theme:', err);
			return fail(500, { error: 'Failed to update theme' });
		}
	}
};
