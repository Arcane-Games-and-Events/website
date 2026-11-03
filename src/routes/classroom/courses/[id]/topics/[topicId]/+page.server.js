import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskModule } from '$lib/server/db/schema.js';
import { editsAreStaged, getTopic, workingCopy } from '$lib/server/courses/builder.js';
import { videoOf } from '$lib/server/video/mux.js';
import { withThumb } from '$lib/server/video/list.js';

/** One topic in the editor, with its video. The course layout already checked access. */
export const load = async ({ params, parent, depends }) => {
	depends('desk:topic');
	const { course } = await parent();
	const topic = await getTopic(params.id, params.topicId);
	if (!topic) throw error(404, 'Topic not found');
	const [section] = await db
		.select({ title: deskModule.title })
		.from(deskModule)
		.where(eq(deskModule.id, topic.moduleId))
		.limit(1);
	return {
		topic: workingCopy(topic),
		section: section?.title || '',
		// The topic's video belongs to it: uploaded, replaced and removed here.
		video: await withThumb(videoOf('lesson', topic)),
		youtube: topic.videoProvider === 'youtube' ? topic.youtubeTitle || topic.youtubeUrl : null,
		// Edits wait for Update once students can read the topic.
		staged: editsAreStaged(course, topic)
	};
};
