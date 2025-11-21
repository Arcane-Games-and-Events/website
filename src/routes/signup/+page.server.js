// src/routes/signup/+page.server.js
import { auth } from '$lib/server/lucia';
import { Argon2id } from 'oslo/password';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const firstName = form.get('firstName');
		const lastName = form.get('lastName');
		const email = form.get('email');
		const gemId = form.get('gemId');
		const password = form.get('password');

		// Validate required fields
		if (
			typeof firstName !== 'string' ||
			typeof lastName !== 'string' ||
			typeof email !== 'string' ||
			typeof password !== 'string' ||
			firstName.trim() === '' ||
			lastName.trim() === '' ||
			password.length < 6
		) {
			return fail(400, { error: 'Invalid input. Please fill in all required fields.' });
		}

		const [exists] = await db.select().from(user).where(eq(user.email, email));
		if (exists) {
			return fail(400, { error: 'User already exists' });
		}

		const hashedPassword = await new Argon2id().hash(password);

		// create user
		const id = crypto.randomUUID();
		await db.insert(user).values({
			id,
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			email,
			gemId: gemId && typeof gemId === 'string' && gemId.trim() !== '' ? gemId.trim() : null,
			hashedPassword,
			role: 'free'
		});

		// create session + set cookie
		const session = await auth.createSession(id, {});
		const cookie = auth.createSessionCookie(session.id); // ← pass session.id
		cookies.set(cookie.name, cookie.value, { ...cookie.attributes, path: '/' });

		throw redirect(302, '/');
	}
};
