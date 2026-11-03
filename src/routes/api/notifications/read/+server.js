import { json } from '@sveltejs/kit';
import { markRead } from '$lib/server/courses/notifications.js';

/**
 * POST { ids?, scope? }: mark some of your notifications read, or with no
 * ids every one in a scope: 'learning' (My courses, the default) or
 * 'classroom'.
 */
export async function POST({ request, locals }) {
	if (!locals.user) return json({ error: 'Sign in first.' }, { status: 401 });
	const { ids, scope } = await request.json().catch(() => ({}));
	await markRead(
		locals.user.id,
		Array.isArray(ids) ? ids.filter((x) => typeof x === 'string').slice(0, 200) : null,
		scope === 'classroom' ? 'classroom' : 'learning'
	);
	return json({ ok: true });
}
