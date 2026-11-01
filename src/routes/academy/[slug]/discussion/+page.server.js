import { courseForReader } from '$lib/server/courses/reader.js';
import { getThread } from '$lib/server/courses/discussion.js';

/**
 * The discussion with nothing picked: wide screens open the newest
 * conversation beside the list straight away (phones show just the list).
 */
export async function load({ params, locals, parent, depends }) {
	depends('academy:thread');
	const { role, threads } = await parent();
	if (!role.read || !threads.length) return { open: null };
	const r = await courseForReader(params.slug, locals.user);
	try {
		return { open: await getThread(r.course, locals.user, threads[0].id) };
	} catch {
		return { open: null };
	}
}
