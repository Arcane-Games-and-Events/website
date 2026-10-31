import { json } from '@sveltejs/kit';
import { markRead } from '$lib/server/courses/notifications.js';

/** POST { ids? }: mark some (or all) of your notifications read. */
export async function POST({ request, locals }) {
	if (!locals.user) return json({ error: 'Sign in first.' }, { status: 401 });
	const { ids } = await request.json().catch(() => ({}));
	await markRead(
		locals.user.id,
		Array.isArray(ids) ? ids.filter((x) => typeof x === 'string').slice(0, 200) : null
	);
	return json({ ok: true });
}
