import { error, fail, redirect } from '@sveltejs/kit';
import {
	markStaffRead,
	markStaffUnread,
	setStatus,
	staffReply,
	staffThread,
	validateReply
} from '$lib/server/contact/inbox.js';
import { senderProfile } from '$lib/server/contact/profile.js';

const isUuid = (s) => /^[0-9a-f-]{36}$/i.test(s);

/** One conversation in the inbox. Opening it marks it read for every admin. */
export async function load({ params }) {
	if (!isUuid(params.id)) error(404, 'Not found');
	const thread = await staffThread(params.id);
	if (!thread) error(404, 'That conversation is gone.');
	const [profile] = await Promise.all([
		senderProfile(thread).catch((err) => {
			console.error('Inbox profile:', err);
			return null;
		}),
		markStaffRead(thread)
	]);
	return { thread: { ...thread, token: undefined }, profile };
}

async function find(params) {
	if (!isUuid(params.id)) error(404, 'Not found');
	const thread = await staffThread(params.id);
	if (!thread) error(404, 'That conversation is gone.');
	return thread;
}

export const actions = {
	/** A reply the person sees, or an internal note; optionally marking it done. */
	reply: async ({ params, request, locals }) => {
		const thread = await find(params);
		const form = await request.formData();
		const checked = validateReply(form.get('body'));
		if ('error' in checked) return fail(400, { error: checked.error });
		const internal = form.get('internal') === '1';
		await staffReply(thread, {
			staff: locals.user,
			body: checked.value,
			internal,
			done: form.get('done') === '1'
		});
		return { sent: internal ? 'note' : 'reply' };
	},
	status: async ({ params, request }) => {
		await find(params);
		const status = (await request.formData()).get('status');
		await setStatus(params.id, status === 'done' ? 'done' : 'open');
		return { status };
	},
	/** Back to unread, and back to the list. */
	unread: async ({ params, request }) => {
		await find(params);
		await markStaffUnread(params.id);
		const back = String((await request.formData()).get('back') || '');
		redirect(303, `/admin/inbox${/^\?[\w=&%.+-]*$/.test(back) ? back : ''}`);
	}
};
