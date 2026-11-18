// src/routes/login/+page.server.js
import { auth } from '$lib/server/lucia';
import { Argon2id } from 'oslo/password';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { ACCOUNT_LIMITS, clientIp, minutes, overLimit } from '$lib/server/ratelimit.js';
import { safeRedirect } from '$lib/server/redirect.js';

export const actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const form = await request.formData();
		const email = form.get('email');
		const password = form.get('password');
		const rememberMe = form.get('remember-me') === 'on';

		// Get redirect URL from query params (default to home)
		const redirectTo = url.searchParams.get('redirect') || '/';

		if (typeof email !== 'string' || typeof password !== 'string') {
			return fail(400, { error: 'Invalid input' });
		}

		const wait = await overLimit(
			['login:ip', clientIp(getClientAddress), ACCOUNT_LIMITS.loginPerIp],
			['login:email', email.trim().toLowerCase(), ACCOUNT_LIMITS.loginPerEmail]
		);
		if (wait)
			return fail(429, {
				error: `Too many sign-in attempts. Try again in ${minutes(wait)}.`
			});

		const [u] = await db.select().from(user).where(eq(user.email, email));
		if (!u || !u.hashedPassword) {
			return fail(400, { error: 'Invalid email or password' });
		}

		const ok = await new Argon2id().verify(u.hashedPassword, password);
		if (!ok) {
			return fail(400, { error: 'Invalid email or password' });
		}

		const session = await auth.createSession(u.id, {});
		const cookie = auth.createSessionCookie(session.id);

		// Set cookie attributes based on "Remember me" checkbox
		const cookieAttributes = {
			...cookie.attributes,
			path: '/'
		};

		if (rememberMe) {
			// Remember me: Set cookie to expire in 30 days
			cookieAttributes.maxAge = 60 * 60 * 24 * 30; // 30 days in seconds
		} else {
			// Don't remember: Session cookie (expires when browser closes)
			delete cookieAttributes.maxAge;
		}

		cookies.set(cookie.name, cookie.value, cookieAttributes);

		throw redirect(302, safeRedirect(redirectTo));
	}
};
