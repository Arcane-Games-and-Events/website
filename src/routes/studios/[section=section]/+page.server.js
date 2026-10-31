import { archivePage } from '$lib/server/studio/archivePage.js';

const KIND = { podcasts: 'podcast', interviews: 'interview', video: 'video' };

/** /studios/podcasts, /studios/interviews, /studios/video — one kind's archive. */
export async function load(event) {
	return {
		section: event.params.section,
		...(await archivePage(event, KIND[event.params.section]))
	};
}
