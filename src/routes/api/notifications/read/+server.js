import { json } from '@sveltejs/kit';
import { markRead } from '$lib/server/courses/notifications.js';

/**
 * POST { ids?, scope?, courseId? }: mark some of your notifications read, or
 * with no ids every one about a course (`courseId`, the discussion list's
 * "Mark all read") or in a scope: 'learning' (My courses, the default) or
 * 'classroom'.
 */
export async function POST({ request, locals }) {
	if (!locals.user) return json({ error: 'Sign in first.' }, { status: 401 });
	const { ids, scope, courseId } = await request.json().catch(() => ({}));
	await markRead(
		locals.user.id,
		Array.isArray(ids) ? ids.filter((x) => typeof x === 'string').slice(0, 200) : null,
		scope === 'classroom' ? 'classroom' : 'learning',
		{ courseId: typeof courseId === 'string' && courseId ? courseId : null }
	);
	return json({ ok: true });
}
