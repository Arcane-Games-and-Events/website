import { error } from '@sveltejs/kit';
import {
	deleteTopic,
	editsAreStaged,
	getTopic,
	updateTopic,
	workingCopy
} from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

async function topicOf(locals, params) {
	const course = await requireCourse(locals, params.id);
	const topic = await getTopic(params.id, params.topicId);
	if (!topic) throw error(404, 'Topic not found');
	return { course, topic };
}

export async function GET({ params, locals }) {
	const { topic } = await topicOf(locals, params);
	return respond(async () => ({ topic: workingCopy(topic) }));
}

/**
 * PATCH { title?, slug?, body?, isPreview? }: autosave and field edits. In
 * a live course, a published topic's title and body save as pending
 * changes (see /changes); students see them only after Update.
 */
export async function PATCH({ params, request, locals }) {
	const { course, topic } = await topicOf(locals, params);
	const b = await body(request);
	const fields = {};
	for (const k of ['title', 'slug', 'body', 'isPreview']) if (k in b) fields[k] = b[k];
	return respond(async () => {
		const updated = await updateTopic(topic, fields, { staged: editsAreStaged(course, topic) });
		// Autosaved writing isn't history; switches and addresses are.
		if ('isPreview' in fields && !!fields.isPreview !== topic.isPreview)
			await logActivity(
				course.id,
				locals.user,
				fields.isPreview ? 'topic_free_on' : 'topic_free_off',
				{
					lessonId: topic.id
				}
			);
		if ('slug' in fields && updated.slug !== topic.slug)
			await logActivity(course.id, locals.user, 'topic_address_changed', {
				lessonId: topic.id,
				data: { from: topic.slug, to: updated.slug }
			});
		return { topic: workingCopy(updated) };
	});
}

export async function DELETE({ params, locals }) {
	const { course, topic } = await topicOf(locals, params);
	return respond(async () => {
		await deleteTopic(topic);
		await logActivity(course.id, locals.user, 'topic_deleted', { data: { title: topic.title } });
		return { ok: true };
	});
}
