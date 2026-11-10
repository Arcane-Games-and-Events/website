import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifyTurnstileToken } from '$lib/server/turnstile.js';
import { hit } from '$lib/server/ratelimit.js';
import { isMissingTable } from '$lib/server/contentAnalytics/collect.js';
import {
	memberThreads,
	startThread,
	threadsByTokens,
	validateNew
} from '$lib/server/contact/inbox.js';
import { guestTokens, rememberToken } from '$lib/server/contact/guest.js';
import { isTopic } from '$lib/contact/topics.js';

/**
 * /contact: write to AGE. Replies come back on the site: in the account's
 * Messages for signed-in people, on a private link for guests.
 */
export async function load({ locals, cookies, url }) {
	const user = locals.user;
	let threads = [];
	try {
		threads = user ? await memberThreads(user.id) : await threadsByTokens(guestTokens(cookies));
	} catch (err) {
		if (!isMissingTable(err)) throw err;
	}
	const topic = url.searchParams.get('topic');
	return {
		signedIn: !!user,
		writingAs: user
			? {
					name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
					email: user.email
				}
			: null,
		topic: isTopic(topic) ? topic : '',
		threads: threads.slice(0, 5).map((t) => ({
			...t,
			href: user ? `/account/messages/${t.id}` : `/contact/t/${t.token}`,
			token: undefined
		})),
		moreThreads: threads.length > 5,
		turnstileSiteKey: user ? '' : env.TURNSTILE_SITE_KEY || ''
	};
}

export const actions = {
	default: async ({ request, locals, cookies, getClientAddress }) => {
		const form = Object.fromEntries(await request.formData());
		const user = locals.user;
		let ip = null;
		try {
			ip = getClientAddress();
		} catch {
			/* no address */
		}

		const keep = {
			name: form.name,
			email: form.email,
			topic: form.topic,
			subject: form.subject,
			body: form.body
		};
		// The rate limit and (guests) the bot check, side by side.
		const [limited, check] = await Promise.all([
			hit('contact:new', user?.id || ip, user ? 10 : 5, 3600),
			user
				? { success: true }
				: verifyTurnstileToken(form['cf-turnstile-response'], ip ?? undefined)
		]);
		if (!limited.ok)
			return fail(429, {
				...keep,
				error: 'That’s a lot of messages in an hour. Try again a little later.'
			});
		if (!check.success) return fail(400, { ...keep, error: check.error });

		const checked = validateNew(form, user);
		if ('error' in checked) return fail(400, { ...keep, error: checked.error });

		const thread = await startThread({
			user,
			value: checked.value,
			ip,
			userAgent: (request.headers.get('user-agent') || '').slice(0, 500) || null
		});
		if (user) redirect(303, `/account/messages/${thread.id}?sent=1`);
		rememberToken(cookies, thread.token);
		redirect(303, `/contact/t/${thread.token}?sent=1`);
	}
};
