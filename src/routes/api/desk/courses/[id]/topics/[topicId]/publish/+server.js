import { error } from '@sveltejs/kit';
import {
	getTopic,
	publishTopic,
	unpublishTopic,
	workingCopy
} from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** POST { publish: true | false } */
export async function POST({ params, request, locals }) {
	const course = await requireCourse(locals, params.id);
	const topic = await getTopic(params.id, params.topicId);
	if (!topic) throw error(404, 'Topic not found');
	const { publish } = await body(request);
	return respond(async () => {
		const updated = publish
			? await publishTopic(course, topic, locals.user)
			: await unpublishTopic(topic);
		await logActivity(course.id, locals.user, publish ? 'topic_published' : 'topic_unpublished', {
			lessonId: topic.id,
			data: publish && !topic.firstPublishedAt && updated.firstPublishedAt ? { first: true } : null
		});
		return { topic: workingCopy(updated) };
	});
}
