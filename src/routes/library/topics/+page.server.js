import { libraryTopics } from '$lib/server/desk/list.js';
import { cacheFor, counts } from '$lib/server/library/page.js';

/** /library/topics — every topic with pieces in it, as catalogue guide cards. */
export async function load({ setHeaders }) {
	cacheFor(setHeaders);
	const [topics, drawers] = await Promise.all([libraryTopics(), counts()]);
	return { topics, drawers };
}
