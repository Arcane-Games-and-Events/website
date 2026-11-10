import { error, fail } from '@sveltejs/kit';
import { hit } from '$lib/server/ratelimit.js';
import {
	markMemberRead,
	memberReply,
	memberThread,
	validateReply
} from '$lib/server/contact/inbox.js';

const isUuid = (s) => /^[0-9a-f-]{36}$/i.test(s);

/** One conversation with AGE, with a reply box. Opening it reads the replies. */
export async function load({ params, locals, url }) {
	if (!isUuid(params.id)) error(404, 'Not found');
	const thread = await memberThread({ id: params.id, userId: locals.user.id });
	if (!thread) error(404, 'We couldn’t find that conversation.');
	await markMemberRead(thread);
	return {
		thread: { ...thread, token: undefined, userId: undefined },
		sent: url.searchParams.has('sent')
	};
}

export const actions = {
	default: async ({ params, request, locals }) => {
		if (!locals.user) error(401, 'Sign in first.');
		if (!isUuid(params.id)) error(404, 'Not found');
		const thread = await memberThread({ id: params.id, userId: locals.user.id });
		if (!thread) error(404, 'We couldn’t find that conversation.');
		const limited = await hit('contact:reply', thread.id, 30, 3600);
		if (!limited.ok) return fail(429, { error: 'Too many replies in an hour. Try again later.' });
		const checked = validateReply((await request.formData()).get('body'));
		if ('error' in checked) return fail(400, { error: checked.error });
		await memberReply(thread, { user: locals.user, body: checked.value });
		return { replied: true };
	}
};
