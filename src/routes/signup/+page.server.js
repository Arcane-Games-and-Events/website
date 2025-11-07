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
		const email = form.get('email');
		const password = form.get('password');

		if (typeof email !== 'string' || typeof password !== 'string' || password.length < 6) {
			return fail(400, { error: 'Invalid input' });
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
			email,
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
