import { approvePost, removePost, setThreadFlag } from '$lib/server/courses/discussion.js';
import { CourseError } from '$lib/server/courses/builder.js';
import { body, requireUser, respond } from '$lib/server/courses/http.js';
import { logPostActivity } from '$lib/server/courses/activity.js';

/**
 * POST { action, note? } for the course's teacher or an admin:
 * approve · remove · remove_mute · pin · unpin · lock · unlock
 */
export async function POST({ params, request, locals }) {
	const user = requireUser(locals);
	const { action, note } = await body(request);
	return respond(async () => {
		const id = params.postId;
		if (action === 'approve') await approvePost(id, user);
		else if (action === 'remove') await removePost(id, user, { note });
		else if (action === 'remove_mute') await removePost(id, user, { note, mute: true });
		else if (action === 'pin' || action === 'unpin')
			await setThreadFlag(id, user, 'pinned', action === 'pin');
		else if (action === 'lock' || action === 'unlock')
			await setThreadFlag(id, user, 'locked', action === 'lock');
		else throw new CourseError(400, 'Unknown action');
		if (action === 'approve' || action === 'remove' || action === 'remove_mute')
			await logPostActivity(id, user, action === 'approve' ? 'post_approved' : 'post_removed', {
				note,
				data: action === 'remove_mute' ? { muted: true } : null
			});
		return { ok: true };
	});
}
