// src/routes/login/+page.server.js
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

		if (typeof email !== 'string' || typeof password !== 'string') {
			return fail(400, { error: 'Invalid input' });
		}

		const [u] = await db.select().from(user).where(eq(user.email, email));
		if (!u || !u.hashedPassword) {
			return fail(400, { error: 'Invalid email or password' });
		}

		const ok = await new Argon2id().verify(u.hashedPassword, password);
		if (!ok) {
			return fail(400, { error: 'Invalid email or password' });
		}

		const session = await auth.createSession(u.id, {});
		const cookie = auth.createSessionCookie(session.id); // ← pass session.id
		cookies.set(cookie.name, cookie.value, { ...cookie.attributes, path: '/' });

		throw redirect(302, '/');
	}
};
