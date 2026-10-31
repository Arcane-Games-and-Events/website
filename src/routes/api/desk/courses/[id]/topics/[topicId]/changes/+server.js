import { error } from '@sveltejs/kit';
import {
	applyTopicChanges,
	discardTopicChanges,
	getTopic,
	workingCopy
} from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/**
 * POST { action: 'apply' | 'discard' }: put a live topic's pending changes
 * in front of students, or throw them away.
 */
export async function POST({ params, request, locals }) {
	const course = await requireCourse(locals, params.id);
	const topic = await getTopic(params.id, params.topicId);
	if (!topic) throw error(404, 'Topic not found');
	const { action } = await body(request);
	return respond(async () => {
		let updated;
		if (action === 'apply') updated = await applyTopicChanges(topic, locals.user);
		else if (action === 'discard') updated = await discardTopicChanges(topic);
		else throw error(400, 'Unknown action');
		await logActivity(
			course.id,
			locals.user,
			action === 'apply' ? 'topic_updated' : 'topic_changes_discarded',
			{ lessonId: topic.id }
		);
		return { topic: workingCopy(updated) };
	});
}
