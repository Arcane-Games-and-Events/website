import { error, fail, redirect } from '@sveltejs/kit';
import { hit } from '$lib/server/ratelimit.js';
import {
	claimThread,
	markMemberRead,
	memberReply,
	memberThread,
	validateReply
} from '$lib/server/contact/inbox.js';
import { rememberToken } from '$lib/server/contact/guest.js';

/**
 * A conversation on its private link: how a guest follows what they sent.
 * Opened signed in with the email it came from, it moves into the account
 * and this link forwards to Account → Messages.
 */
export async function load({ params, locals, cookies, url }) {
	const thread = await memberThread({ token: params.token });
	if (!thread) error(404, 'We couldn’t find that conversation. Check the link.');
	const user = locals.user;
	if (user && (thread.userId === user.id || (await claimThread(thread, user))))
		redirect(303, `/account/messages/${thread.id}${url.search}`);
	rememberToken(cookies, params.token);
	await markMemberRead(thread);
	return {
		thread: { ...thread, token: undefined, userId: undefined },
		sent: url.searchParams.has('sent')
	};
}

export const actions = {
	default: async ({ params, request, locals }) => {
		const thread = await memberThread({ token: params.token });
		if (!thread) error(404, 'We couldn’t find that conversation.');
		const limited = await hit('contact:reply', thread.id, 30, 3600);
		if (!limited.ok) return fail(429, { error: 'Too many replies in an hour. Try again later.' });
		const checked = validateReply((await request.formData()).get('body'));
		if ('error' in checked) return fail(400, { error: checked.error });
		await memberReply(thread, { user: locals.user, body: checked.value });
		return { replied: true };
	}
};
