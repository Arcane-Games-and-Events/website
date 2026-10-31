import { parseRange } from '$lib/server/contentAnalytics/query.js';
import { courseAnalytics } from '$lib/server/courses/analytics.js';

/** One course's analytics. The course layout already checked access. */
export const load = async ({ params, parent, url }) => {
	await parent();
	const days = parseRange(url.searchParams.get('days'));
	return { report: await courseAnalytics(params.id, days) };
};
