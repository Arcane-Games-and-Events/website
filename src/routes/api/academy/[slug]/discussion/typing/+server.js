import { error, json } from '@sveltejs/kit';
import { body, requireUser } from '$lib/server/courses/http.js';
import { liveAccess } from '$lib/server/courses/liveAccess.js';
import { setTyping } from '$lib/server/courses/live.js';

/** POST { threadId, on }: the signed-in student is typing a reply (or stopped). */
export async function POST({ params, request, locals }) {
	const user = requireUser(locals);
	const access = await liveAccess(user, params.slug);
	if (!access.post) error(403, 'You can’t post in this course.');
	const b = await body(request);
	const threadId = String(b.threadId || '');
	if (!/^[0-9a-f-]{36}$/i.test(threadId)) error(400, 'Which conversation?');
	await setTyping(access.courseId, threadId, user, b.on !== false);
	return json({ ok: true });
}
