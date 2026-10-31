import { outlineOf } from '$lib/server/courses/builder.js';

/** The course outline: sections in order, each with its topics. */
export const load = async ({ params, parent, depends }) => {
	depends('desk:outline');
	await parent();
	return { outline: await outlineOf(params.id) };
};
