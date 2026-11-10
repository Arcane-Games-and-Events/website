import { isMissingTable } from '$lib/server/contentAnalytics/collect.js';
import { memberThreads } from '$lib/server/contact/inbox.js';

/** Account → Messages: every conversation with AGE, newest first. */
export async function load({ locals }) {
	try {
		const threads = await memberThreads(locals.user.id);
		return { threads: threads.map((t) => ({ ...t, token: undefined })) };
	} catch (err) {
		if (!isMissingTable(err)) throw err;
		return { threads: [] };
	}
}
