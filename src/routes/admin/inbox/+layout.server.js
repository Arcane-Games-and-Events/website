import { isMissingTable } from '$lib/server/contentAnalytics/collect.js';
import { inbox, inboxCounts } from '$lib/server/contact/inbox.js';

const FILTERS = ['open', 'unread', 'done', 'all'];

/**
 * The contact inbox's conversation list (the left pane): filtered by open,
 * unread, done or all, and searched by name, email, subject or message.
 */
export async function load({ url, depends }) {
	depends('admin:inbox');
	const filter = FILTERS.includes(url.searchParams.get('show') || '')
		? url.searchParams.get('show')
		: 'open';
	const q = (url.searchParams.get('q') || '').slice(0, 100);
	try {
		const [threads, counts] = await Promise.all([inbox({ filter, q }), inboxCounts()]);
		return { threads, counts, filter, q, ready: true };
	} catch (err) {
		if (!isMissingTable(err)) throw err;
		// Migration 044 isn't applied yet.
		return {
			threads: [],
			counts: { open: 0, unread: 0, done: 0, all: 0 },
			filter,
			q,
			ready: false
		};
	}
}
